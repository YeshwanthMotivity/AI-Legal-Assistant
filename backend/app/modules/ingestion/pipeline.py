"""
pipeline.py — Fixed version
Changes from original:
  - Removed MinIO dependency (reads PDF directly from filesystem)
  - Removed Neo4j dependency (write_to_graph removed)
  - Added language parameter — passed through to chunk metadata
  - Removed neo4j_failed flag (no longer needed)
  - Simplified status tracking
"""

import logging
import os
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.document.models import ProcessingStatus
from app.modules.document.repository import DocumentRepository
from app.modules.evaluation.repository import EvaluationEventRepository
from app.modules.ingestion.chunker_fixed import hybrid_chunk_legal_doc
from app.modules.ingestion.embedder import embed_chunks
from app.modules.ingestion.ner import extract_entities
from app.modules.ingestion.ocr import run_ocr
from app.modules.ingestion.parser import LegalStructureParser
from app.modules.ingestion.vector_store import upsert_chunks
from app.modules.case.repository import CaseRepository
from app.modules.similarity.vector_store import upsert_case_summary

logger = logging.getLogger(__name__)

# Base directory where PDF documents are stored on the filesystem
# This maps to ./data in docker-compose (bind-mounted to /app/data in container)
DATA_DIR = os.environ.get("DATA_DIR", "/app/data")


async def run_ingestion_pipeline(
    document_id: str,
    case_id: str,
    storage_key: str,
    mime_type: str,
    doc_type: str,
    db: AsyncSession,
    collection_name: str = "legal_chunks",
    extra_metadata: dict = None,
    language: str = "en",          # ADDED: language parameter
    file_path: str = None,         # ADDED: direct file path (preferred over storage_key)
) -> dict:
    """
    Full ingestion pipeline for a legal document.

    Steps:
      1. Read PDF from filesystem
      2. Extract text (OCR) with pdfplumber + cleaning
      3. Parse structure with LLM (facts, reasoning, conclusion)
      4. Extract entities (NER)
      5. Chunk the structured text
      6. Embed chunks via BGE-M3
      7. Store in Qdrant
      8. Update PostgreSQL status
    """
    document_repo = DocumentRepository(db)
    event_repo = EvaluationEventRepository(db)

    await document_repo.update_status(document_id, ProcessingStatus.PROCESSING)
    logger.info(
        "Pipeline started",
        extra={"document_id": document_id, "case_id": case_id}
    )
    await db.commit()

    # ── Step 1: Read file from filesystem ────────────────────────────────────
    try:
        # Prefer direct file_path if provided, otherwise construct from storage_key
        if file_path and os.path.exists(file_path):
            read_path = file_path
        else:
            read_path = os.path.join(DATA_DIR, storage_key)

        with open(read_path, "rb") as f:
            file_bytes = f.read()
        logger.info(f"Read {len(file_bytes)} bytes from {read_path}")
    except Exception as e:
        logger.error(f"Failed to read file for {document_id}: {e}")
        await document_repo.update_status(document_id, ProcessingStatus.FAILED)
        await db.commit()
        return

    # ── Step 2: OCR / Text extraction ────────────────────────────────────────
    try:
        raw_text = await run_ocr(file_bytes, mime_type)
        logger.info(f"OCR complete: {len(raw_text)} chars for {document_id}")
    except Exception as e:
        logger.exception(
            "OCR failed for document_id=%s case_id=%s", document_id, case_id
        )
        await document_repo.update_status(document_id, ProcessingStatus.FAILED)
        await db.commit()
        return

    await document_repo.save_ocr_text(document_id, raw_text)
    await document_repo.update_status(document_id, ProcessingStatus.OCR_COMPLETE)
    await db.commit()

    # ── Step 3: LLM structure extraction ─────────────────────────────────────
    from app.modules.ingestion.llm_extractor import extract_structure
    from app.modules.ingestion.ocr import detect_language as ocr_detect_language

    # Auto-detect language from OCR text if not explicitly passed
    detected_language = language if language in ("en", "ar") else ocr_detect_language(raw_text)

    llm_structured = await extract_structure(
        text=raw_text,
        doc_type="judgment" if doc_type in ("COURT_ORDER", "judgment", "JUDGMENT") else "law",
        language=detected_language,
        filename=os.path.basename(storage_key)
    )

    # Also run the existing parser for chunking compatibility
    parser = LegalStructureParser()
    structured_data = await parser.parse(raw_text)

    # NEW: If it's a law, split into high-fidelity articles using regex
    is_law = doc_type in ("LAW", "law")
    if is_law:
        articles = parser.split_law_into_articles(raw_text)
        structured_data["articles"] = articles
        logger.info(f"Regex split law into {len(articles)} articles for {document_id}")

    # Merge LLM extraction into structured_data metadata
    structured_data["llm_metadata"] = llm_structured
    structured_data["language"] = detected_language

    # ── Step 4: Entity extraction ─────────────────────────────────────────────
    entities = await extract_entities(raw_text)

    # Merge article citations found by parser
    parser_citations = structured_data.get("citations", [])
    existing_articles = {
        e["entity_value"] for e in entities
        if e.get("entity_type") == "law_article_number"
    }
    for citation in parser_citations:
        if isinstance(citation, str) and citation not in existing_articles:
            entities.append({
                "entity_type": "law_article_number",
                "entity_value": citation,
                "confidence_score": 0.85
            })

    if entities:
        await document_repo.save_extracted_entities(document_id, entities)
        await db.commit()

    logger.info(f"Extracted {len(entities)} entities for {document_id}")

    # ── Step 5: Chunking ──────────────────────────────────────────────────────
    hybrid_chunks = hybrid_chunk_legal_doc(structured_data, doc_type)
    chunk_texts = [c["text"] for c in hybrid_chunks]
    logger.info(f"Created {len(chunk_texts)} chunks for {document_id}")

    if not chunk_texts:
        logger.warning(f"No chunks produced for {document_id}, marking failed")
        await document_repo.update_status(document_id, ProcessingStatus.FAILED)
        await db.commit()
        return

    # ── Step 6 & 7: Embed + Store in Qdrant ──────────────────────────────────
    qdrant_failed = False
    try:
        embeddings = await embed_chunks(chunk_texts)
        logger.info(f"Embedded {len(embeddings)} chunks for {document_id}")

        # Build metadata list with language tag
        metadata_list = [c["metadata"] for c in hybrid_chunks]
        for m in metadata_list:
            m["language"] = language          # FIXED: language now stored in metadata
            m["case_name"] = case_id          # useful for precedent search
            m["filename"] = storage_key
            if extra_metadata:
                m.update(extra_metadata)

        await upsert_chunks(
            case_id,
            document_id,
            doc_type,
            chunk_texts,
            embeddings,
            metadata=metadata_list,
            collection_name=collection_name
        )
        logger.info(
            f"Upserted {len(embeddings)} points to "
            f"{collection_name} for {document_id}"
        )
    except Exception as e:
        logger.exception(
            "Qdrant upsert failed for document_id=%s case_id=%s",
            document_id, case_id
        )
        qdrant_failed = True

    # ── Step 8: Update final status ───────────────────────────────────────────
    if qdrant_failed:
        await document_repo.update_status(
            document_id, ProcessingStatus.PARTIAL_INDEXED
        )
    else:
        await document_repo.update_status(
            document_id, ProcessingStatus.COMPLETED
        )
    await db.commit()

    # ── Optional: Upsert case summary for similarity search ──────────────────
    try:
        case_repo = CaseRepository(db)
        case = await case_repo.get_by_id(case_id)
        # Only index in case_summaries if this is a seeded precedent, not a user upload
        if case and collection_name == "difc_precedents":
            summary_parts = [
                case.title,
                case.case_type.value if case.case_type else "",
                case.claimant_name or "",
                case.respondent_name or "",
            ]
            summary_text = " ".join(p for p in summary_parts if p)

            if summary_text:
                summary_embeddings = await embed_chunks([summary_text])
                if summary_embeddings:
                    await upsert_case_summary(
                        case_id=case_id,
                        case_type=case.case_type.value if case.case_type else "",
                        case_title=case.title,
                        claimant=case.claimant_name or "",
                        respondent=case.respondent_name or "",
                        outcome="",
                        embedding=summary_embeddings[0],
                    )
    except Exception:
        logger.exception(
            "Case summary upsert failed for case_id=%s", case_id
        )

    # ── KPI events ────────────────────────────────────────────────────────────
    for entity in entities:
        try:
            await event_repo.create_event(
                document_id=document_id,
                case_id=case_id,
                metric_type="entity_extraction_accuracy",
                entity_type=entity.get("entity_type", "unknown"),
                value=float(entity.get("confidence_score", 0.0)),
                phase="phase_1",
            )
        except Exception:
            pass  # KPI failure must not break ingestion

    await db.commit()
    logger.info(f"Pipeline complete for {document_id} | status={'FAILED' if qdrant_failed else 'COMPLETED'}")
    return llm_structured
