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

async def re_index_all():
    async with AsyncSessionLocal() as db:
        # 1. Fetch all documents with OCR text
        result = await db.execute(select(Document).where(Document.ocr_text != None))
        documents = result.scalars().all()

        logger.info(f"Found {len(documents)} documents with existing OCR text. Starting re-indexing...")

        for doc in documents:
            try:
                logger.info(f"Re-indexing {doc.file_name} (ID: {doc.id})")

                # Get case
                case_result = await db.execute(select(Case).where(Case.id == doc.case_id))
                case = case_result.scalars().first()
                if not case:
                    logger.warning(f"Case {doc.case_id} not found for document {doc.id}, skipping.")
                    continue

                # 2. Extract structured data pattern (simulation for chunker)
                parser = LegalStructureParser()
                structured_data = {
                    "raw_text": doc.ocr_text,
                    "metadata": {
                        "filename": doc.file_name,
                        "case_id": doc.case_id,
                        "document_type": doc.document_type
                    }
                }

                # 3. Use high-fidelity Article Splitter for laws
                is_law = "law" in str(doc.document_type).lower() or "/laws/" in str(doc.storage_key).lower()
                
                # If it's a law, split into articles using regex first
                if is_law:
                    articles = parser.split_law_into_articles(doc.ocr_text)
                    structured_data["articles"] = articles
                    logger.info(f"Regex-split {doc.file_name} into {len(articles)} articles")

                # 4. Chunk
                doc_type_for_chunker = "law" if is_law else "judgment"
                hybrid_chunks = hybrid_chunk_legal_doc(structured_data, doc_type_for_chunker)
                chunk_texts = [c["text"] for c in hybrid_chunks]

                if not chunk_texts:
                    logger.warning(f"No chunks for {doc.file_name}")
                    continue

                # 4. Re-embed Chunks
                embeddings = await embed_chunks(chunk_texts)
                logger.info(f"Generated {len(embeddings)} embeddings for {doc.file_name}")

                # 5. Upsert Chunks to Qdrant
                # Robust check: if "law" is in type OR folder name contains "Laws"
                is_law = "law" in str(doc.document_type).lower() or "/laws/" in str(doc.storage_key).lower()
                collection_name = "difc_laws" if is_law else "difc_precedents"
                
                # Check for is_law in extra metadata if we had it
                # For now, use simple logic
                
                metadata_list = [c["metadata"] for c in hybrid_chunks]
                for m in metadata_list:
                    m["filename"] = doc.storage_key
                    m.update({
                        "case_id": doc.case_id,
                        "document_id": doc.id,
                        "document_type": doc_type_for_chunker
                    })

                await upsert_chunks(
                    case_id=doc.case_id,
                    document_id=doc.id,
                    doc_type=doc_type_for_chunker,
                    chunks=chunk_texts,
                    embeddings=embeddings,
                    metadata=metadata_list,
                    collection_name=collection_name
                )

                # 6. Update Case Title if it's "Unnamed"
                if not case.title or case.title == "Unnamed Case" or "Seeded Case" in case.title:
                    case.title = doc.file_name.replace(".pdf", "").replace(".PDF", "")
                    logger.info(f"Updated case title to: {case.title}")

                # 7. Re-embed Case Summary
                summary_parts = [
                    case.title,
                    case.case_type.value if hasattr(case.case_type, 'value') else str(case.case_type),
                    case.claimant_name or "",
                    case.respondent_name or ""
                ]
                summary_text = " ".join(p for p in summary_parts if p)
                
                if summary_text:
                    summary_embeddings = await embed_chunks([summary_text])
                    if summary_embeddings:
                        await upsert_case_summary(
                            case_id=doc.case_id,
                            case_type=case.case_type.value if hasattr(case.case_type, 'value') else str(case.case_type),
                            case_title=case.title,
                            claimant=case.claimant_name or "",
                            respondent=case.respondent_name or "",
                            outcome="",
                            embedding=summary_embeddings[0]
                        )

                # 7. Update Status
                doc.processing_status = ProcessingStatus.COMPLETED
                await db.commit()
                logger.info(f"Successfully re-indexed {doc.file_name}")

            except Exception as e:
                logger.exception(f"Failed to re-index {doc.file_name}: {e}")
                continue

if __name__ == "__main__":
    asyncio.run(re_index_all())
