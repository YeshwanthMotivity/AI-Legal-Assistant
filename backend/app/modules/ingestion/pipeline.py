import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.document.models import ProcessingStatus
from app.modules.document.repository import DocumentRepository
from app.modules.evaluation.repository import EvaluationEventRepository
from app.modules.ingestion.chunker import hybrid_chunk_legal_doc
from app.modules.ingestion.embedder import embed_chunks
from app.modules.ingestion.graph_writer import write_to_graph
from app.modules.ingestion.minio_client import download_file, upload_file
from app.modules.ingestion.ner import extract_entities
from app.modules.ingestion.ocr import run_ocr
from app.modules.ingestion.parser import LegalStructureParser
from app.modules.ingestion.vector_store import upsert_chunks
from app.modules.case.repository import CaseRepository
from app.modules.similarity.vector_store import upsert_case_summary

logger = logging.getLogger(__name__)


async def run_ingestion_pipeline(
    document_id: str,
    case_id: str,
    storage_key: str,
    mime_type: str,
    doc_type: str,
    db: AsyncSession,
    collection_name: str = "legal_chunks",
    extra_metadata: dict = None,
) -> None:
    document_repo = DocumentRepository(db)
    event_repo = EvaluationEventRepository(db)

    await document_repo.update_status(document_id, ProcessingStatus.PROCESSING)
    logger.info("Document status updated", extra={"document_id": document_id, "case_id": case_id, "status": ProcessingStatus.PROCESSING.value})
    await db.commit()

    file_bytes = await download_file("case-documents", storage_key)
    print(f"Downloaded file bytes for {document_id}")

    try:
        raw_text = await run_ocr(file_bytes, mime_type)
        print(f"Extracted raw text (len {len(raw_text)}) for {document_id}")
    except Exception as e:
        print(f"OCR failed: {e}")
        logger.exception(
            "OCR failed for document_id=%s case_id=%s mime_type=%s",
            document_id,
            case_id,
            mime_type,
        )
        await document_repo.update_status(document_id, ProcessingStatus.FAILED)
        logger.info("Document status updated", extra={"document_id": document_id, "case_id": case_id, "status": ProcessingStatus.FAILED.value})
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
    logger.info("Document status updated", extra={"document_id": document_id, "case_id": case_id, "status": ProcessingStatus.OCR_COMPLETE.value})
    await db.commit()

    # Step 2: Legal Structure Parsing (Multi-Stage Ingestion)
    parser = LegalStructureParser()
    structured_data = await parser.parse(raw_text)
    
    # Merge citations from parser with NER results
    entities = await extract_entities(raw_text)
    parser_citations = structured_data.get("citations", [])
    for citation in parser_citations:
        if isinstance(citation, str):
            entities.append({
                "entity_type": "law_article_number",
                "entity_value": citation,
                "confidence_score": 0.85
            })

    if entities:
        await document_repo.save_extracted_entities(document_id, entities)
        await db.commit()

    # Step 3: Hybrid Chunking
    hybrid_chunks = hybrid_chunk_legal_doc(structured_data, doc_type)
    chunk_texts = [c["text"] for c in hybrid_chunks]
    
    embeddings: list[list[float]] = []

    qdrant_failed = False
    neo4j_failed = False

    try:
        print(f"Embedding {len(chunk_texts)} chunks for {document_id}", flush=True)
        embeddings = await embed_chunks(chunk_texts)
        print(f"Successfully embedded {len(embeddings)} chunks for {document_id}", flush=True)
        
        # Upsert with metadata enrichment
        metadata_list = [c["metadata"] for c in hybrid_chunks]
        if extra_metadata:
            for m in metadata_list:
                m.update(extra_metadata)
                
        print(f"Upserting {len(embeddings)} points to {collection_name} for {document_id}", flush=True)
        await upsert_chunks(
            case_id, 
            document_id, 
            doc_type, 
            chunk_texts, 
            embeddings,
            metadata=metadata_list,
            collection_name=collection_name
        )
        print(f"Successfully upserted points to {collection_name} for {document_id}", flush=True)
    except Exception as e:
        print(f"Qdrant upsert failed loop catching: {e}", flush=True)
        logger.exception(
            "Qdrant upsert failed for document_id=%s case_id=%s",
            document_id,
            case_id,
        )
        qdrant_failed = True

    # Fetch case for graph writing and summary upsert
    case_repo = CaseRepository(db)
    case = await case_repo.get_by_id(case_id)
    case_title = case.title if case else ""
    case_type = case.case_type.value if case and case.case_type else ""
    
    try:
        print(f"Writing to Neo4j graph for {document_id}", flush=True)
        await write_to_graph(
            case_id, 
            document_id, 
            entities,
            case_title=case_title,
            case_type=case_type,
            outcome="",  # Empty at ingestion time, updated when judgment is finalized
        )
        print(f"Successfully wrote to Neo4j graph for {document_id}", flush=True)
    except Exception as e:
        print(f"Neo4j write failed: {e}", flush=True)
        logger.exception(
            "Neo4j write failed for document_id=%s case_id=%s",
            document_id,
            case_id,
        )
        neo4j_failed = True

    if qdrant_failed or neo4j_failed:
        await document_repo.update_status(document_id, ProcessingStatus.PARTIAL_INDEXED)
        logger.info("Document status updated", extra={"document_id": document_id, "case_id": case_id, "status": ProcessingStatus.PARTIAL_INDEXED.value})
    else:
        await document_repo.update_status(document_id, ProcessingStatus.COMPLETED)
        logger.info("Document status updated", extra={"document_id": document_id, "case_id": case_id, "status": ProcessingStatus.COMPLETED.value})

    # Upsert case summary to case_summaries collection for similarity search (Phase 3)
    try:
        if case:
            # Build summary text same as SimilarityService: title + case_type + employee_name + employer_name
            summary_parts = [
                case.title,
                case.case_type.value if case.case_type else "",
                case.claimant_name or "",
                case.respondent_name or "",
            ]
            summary_text = " ".join(part for part in summary_parts if part)
            
            if summary_text:
                # Embed the summary
                summary_embeddings = await embed_chunks([summary_text])
                if summary_embeddings:
                    # Upsert to case_summaries collection with empty outcome (will be updated when judgment is finalized)
                    await upsert_case_summary(
                        case_id=case_id,
                        case_type=case.case_type.value if case.case_type else "",
                        case_title=case.title,
                        claimant=case.claimant_name or "",
                        respondent=case.respondent_name or "",
                        outcome="",  # Empty at ingestion time, updated when judgment is finalized
                        embedding=summary_embeddings[0],
                    )
    except Exception:
        logger.exception(
            "Case summary upsert failed for case_id=%s",
            case_id,
        )

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
