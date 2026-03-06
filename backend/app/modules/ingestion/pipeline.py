import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.document.models import ProcessingStatus
from app.modules.document.repository import DocumentRepository
from app.modules.evaluation.repository import EvaluationEventRepository
from app.modules.ingestion.chunker import chunk_text
from app.modules.ingestion.embedder import embed_chunks
from app.modules.ingestion.graph_writer import write_to_graph
from app.modules.ingestion.minio_client import download_file, upload_file
from app.modules.ingestion.ner import extract_entities
from app.modules.ingestion.ocr import run_ocr
from app.modules.ingestion.vector_store import upsert_chunks

logger = logging.getLogger(__name__)


async def run_ingestion_pipeline(
    document_id: str,
    case_id: str,
    storage_key: str,
    mime_type: str,
    doc_type: str,
    db: AsyncSession,
) -> None:
    document_repo = DocumentRepository(db)
    event_repo = EvaluationEventRepository(db)

    await document_repo.update_status(document_id, ProcessingStatus.PROCESSING)
    await db.commit()

    file_bytes = await download_file("case-documents", storage_key)

    try:
        raw_text = await run_ocr(file_bytes, mime_type)
    except Exception:
        logger.exception(
            "OCR failed for document_id=%s case_id=%s mime_type=%s",
            document_id,
            case_id,
            mime_type,
        )
        await document_repo.update_status(document_id, ProcessingStatus.FAILED)
        await db.commit()
        return

    ocr_blob = json.dumps({"document_id": document_id, "ocr_text": raw_text}).encode("utf-8")
    await upload_file(
        bucket="ocr-output",
        key=f"{document_id}.json",
        data=ocr_blob,
        length=len(ocr_blob),
        content_type="application/json",
    )

    await document_repo.save_ocr_text(document_id, raw_text)
    await document_repo.update_status(document_id, ProcessingStatus.OCR_COMPLETE)
    await db.commit()

    entities = await extract_entities(raw_text)
    if entities:
        await document_repo.save_extracted_entities(document_id, entities)
        await db.commit()

    chunks = chunk_text(raw_text)
    embeddings: list[list[float]] = []

    qdrant_failed = False
    neo4j_failed = False

    try:
        embeddings = await embed_chunks(chunks)
        await upsert_chunks(case_id, document_id, doc_type, chunks, embeddings)
    except Exception:
        logger.exception(
            "Qdrant upsert failed for document_id=%s case_id=%s",
            document_id,
            case_id,
        )
        qdrant_failed = True

    try:
        await write_to_graph(case_id, document_id, entities)
    except Exception:
        logger.exception(
            "Neo4j write failed for document_id=%s case_id=%s",
            document_id,
            case_id,
        )
        neo4j_failed = True

    if qdrant_failed or neo4j_failed:
        await document_repo.update_status(document_id, ProcessingStatus.PARTIAL_INDEXED)
    else:
        await document_repo.update_status(document_id, ProcessingStatus.COMPLETED)

    for entity in entities:
        await event_repo.create_event(
            document_id=document_id,
            case_id=case_id,
            metric_type="entity_extraction_accuracy",
            entity_type=entity.get("entity_type", "unknown"),
            value=float(entity.get("confidence_score", 0.0)),
            phase="phase_1",
        )

    await db.commit()
