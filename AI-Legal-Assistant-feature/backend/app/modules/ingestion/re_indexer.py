import asyncio
import logging
import uuid
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.modules.document.models import Document, DocumentType, ProcessingStatus, ExtractedEntity
from app.modules.case.models import Case
from app.modules.user.models import User
from app.modules.evaluation.models import EvaluationEvent
from app.modules.audit.models import AuditLog
try:
    from app.modules.judgment.models import Judgment
except ImportError:
    pass
from app.modules.ingestion.chunker_fixed import hybrid_chunk_legal_doc
from app.modules.ingestion.embedder import embed_chunks
from app.modules.ingestion.parser import LegalStructureParser
from app.modules.ingestion.vector_store import upsert_chunks
from app.modules.similarity.vector_store import upsert_case_summary

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def _is_seeded_document(doc: Document, case: Case) -> bool:
    """
    Returns True only for DIFC precedents and laws that were seeded via data_seeder.py.
    User-uploaded documents are identified by their case_number NOT starting with 'SEED-'.

    Seeded documents have:
      - case.case_number starting with "SEED-"
      - storage_key as an absolute filesystem path (e.g. /app/data/...)
      - collection target is difc_precedents or difc_laws

    User uploads have:
      - case.case_number starting with "CASE-"
      - storage_key as a relative upload path or UUID-based path
    """
    # Primary guard: seeded cases always have case_number prefixed with SEED-
    if case.case_number and case.case_number.startswith("SEED-"):
        return True

    # Secondary guard: storage_key matches known data directories
    storage_key = str(doc.storage_key or "")
    if "/app/data/" in storage_key or storage_key.startswith("/app/data"):
        return True

    # Laws are always seeded
    if "/laws/" in storage_key.lower() or "/Laws/" in storage_key:
        return True

    return False


async def re_index_all():
    async with AsyncSessionLocal() as db:
        # 1. Fetch all documents with OCR text
        result = await db.execute(select(Document).where(Document.ocr_text != None))
        documents = result.scalars().all()

        logger.info(f"Found {len(documents)} documents with existing OCR text. Starting re-indexing...")

        skipped_user = 0
        skipped_no_chunks = 0
        success = 0
        failed = 0

        for doc in documents:
            try:
                logger.info(f"Re-indexing {doc.file_name} (ID: {doc.id})")

                # ── Get case ──────────────────────────────────────────────────
                case_result = await db.execute(select(Case).where(Case.id == doc.case_id))
                case = case_result.scalars().first()
                if not case:
                    logger.warning(f"Case {doc.case_id} not found for document {doc.id}, skipping.")
                    continue

                # ── FIX 3: Skip user-uploaded documents ──────────────────────
                # Only re-index seeded DIFC precedents and laws.
                # User uploads should never appear in similar precedents.
                if not _is_seeded_document(doc, case):
                    logger.info(f"Skipping user upload: {doc.file_name} (case: {case.case_number})")
                    skipped_user += 1
                    continue

                # ── Determine collection ──────────────────────────────────────
                is_law = (
                    "law" in str(doc.document_type).lower()
                    or "/laws/" in str(doc.storage_key).lower()
                    or "/Laws/" in str(doc.storage_key)
                )
                collection_name = "difc_laws" if is_law else "difc_precedents"
                doc_type_for_chunker = "law" if is_law else "judgment"

                # ── FIX 1: Update case title BEFORE building metadata ─────────
                # Title must be committed before upsert_case_summary runs,
                # AND must be written into chunk metadata so precedent_search_node
                # can display it without a separate DB lookup.
                if not case.title or case.title == "Unnamed Case" or "Seeded Case" in case.title:
                    case.title = doc.file_name.replace(".pdf", "").replace(".PDF", "")
                    logger.info(f"Updated case title to: {case.title}")
                    await db.commit()  # Commit title BEFORE building metadata

                # ── Parse & chunk ─────────────────────────────────────────────
                parser = LegalStructureParser()
                structured_data = {
                    "raw_text": doc.ocr_text,
                    "metadata": {
                        "filename": doc.file_name,
                        "case_id": str(doc.case_id),
                        "document_type": doc.document_type,
                    }
                }

                if is_law:
                    articles = parser.split_law_into_articles(doc.ocr_text)
                    structured_data["articles"] = articles
                    logger.info(f"Regex-split {doc.file_name} into {len(articles)} articles")

                hybrid_chunks = hybrid_chunk_legal_doc(structured_data, doc_type_for_chunker)
                chunk_texts = [c["text"] for c in hybrid_chunks]

                if not chunk_texts:
                    logger.warning(f"No chunks for {doc.file_name}")
                    skipped_no_chunks += 1
                    continue

                # ── Embed ─────────────────────────────────────────────────────
                embeddings = await embed_chunks(chunk_texts)
                logger.info(f"Generated {len(embeddings)} embeddings for {doc.file_name}")

                # ── FIX 1 & 2: Build metadata with case_name, case_title, str(case_id) ──
                # case_name / case_title written here are what precedent_search_node
                # reads from the payload — without them it falls back to "Unknown Case".
                # str() wrap on IDs prevents UUID-object vs string mismatch in dedup.
                metadata_list = [c["metadata"] for c in hybrid_chunks]
                for m in metadata_list:
                    m["filename"] = doc.storage_key
                    m["case_name"] = case.title          # FIX 1: read by precedent_search_node
                    m["case_title"] = case.title         # FIX 1: fallback field in get_precedent
                    m.update({
                        "case_id": str(doc.case_id),     # FIX 2: str() ensures dedup match
                        "document_id": str(doc.id),
                        "document_type": doc_type_for_chunker,
                    })

                await upsert_chunks(
                    case_id=str(doc.case_id),
                    document_id=str(doc.id),
                    doc_type=doc_type_for_chunker,
                    chunks=chunk_texts,
                    embeddings=embeddings,
                    metadata=metadata_list,
                    collection_name=collection_name
                )

                # ── FIX 4: Only upsert case summary for seeded precedents ─────
                # Laws go into difc_laws, not case_summaries.
                # User uploads must never appear in case_summaries.
                # This mirrors the guard already in pipeline.py.
                if collection_name == "difc_precedents":
                    summary_parts = [
                        case.title,
                        case.case_type.value if hasattr(case.case_type, "value") else str(case.case_type),
                        case.claimant_name or "",
                        case.respondent_name or "",
                    ]
                    summary_text = " ".join(p for p in summary_parts if p)

                    if summary_text:
                        summary_embeddings = await embed_chunks([summary_text])
                        if summary_embeddings:
                            await upsert_case_summary(
                                case_id=str(doc.case_id),
                                case_type=case.case_type.value if hasattr(case.case_type, "value") else str(case.case_type),
                                case_title=case.title,
                                claimant=case.claimant_name or "",
                                respondent=case.respondent_name or "",
                                outcome="",
                                embedding=summary_embeddings[0],
                            )
                            logger.info(f"Upserted case summary for: {case.title}")

                # ── Update status ─────────────────────────────────────────────
                doc.processing_status = ProcessingStatus.COMPLETED
                await db.commit()
                logger.info(f"Successfully re-indexed {doc.file_name}")
                success += 1

            except Exception as e:
                logger.exception(f"Failed to re-index {doc.file_name}: {e}")
                failed += 1
                continue

        # ── Final summary ─────────────────────────────────────────────────────
        logger.info("=" * 60)
        logger.info(f"Re-indexing complete.")
        logger.info(f"  ✅ Succeeded:          {success}")
        logger.info(f"  ⏭️  Skipped (user uploads): {skipped_user}")
        logger.info(f"  ⚠️  Skipped (no chunks):    {skipped_no_chunks}")
        logger.info(f"  ❌ Failed:             {failed}")
        logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(re_index_all())
