from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db, AsyncSessionLocal
from app.modules.document.schemas import (
    DocumentCreate, DocumentUpdate, DocumentResponse, DocumentListResponse
)
from app.modules.document.repository import DocumentRepository
from app.modules.document.services import DocumentService
from app.modules.document.models import DocumentType, ProcessingStatus
from app.modules.ingestion.minio_client import upload_file as upload_to_minio
from app.modules.ingestion.pipeline import run_ingestion_pipeline
from app.auth.rbac import require_role, UserRole


router = APIRouter(prefix="/cases", tags=["Documents"])


async def _run_ingestion_task(
    document_id: str,
    case_id: str,
    storage_key: str,
    mime_type: str,
    doc_type: str,
) -> None:
    async with AsyncSessionLocal() as task_db:
        try:
            await run_ingestion_pipeline(
                document_id=document_id,
                case_id=case_id,
                storage_key=storage_key,
                mime_type=mime_type,
                doc_type=doc_type,
                db=task_db,
            )
            await task_db.commit()
        except Exception:
            await task_db.rollback()
            raise


def get_document_service(db: AsyncSession = Depends(get_db)) -> DocumentService:
    repository = DocumentRepository(db)
    return DocumentService(repository)


@router.post("/{case_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    case_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_type: DocumentType = Form(DocumentType.OTHER),
    db: AsyncSession = Depends(get_db),
    service: DocumentService = Depends(get_document_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.CLERK, UserRole.JUDGE))
):
    """Upload document to a case."""
    file_bytes = await file.read()

    document_data = DocumentCreate(
        case_id=case_id,
        document_type=document_type,
        file_name=file.filename or "unknown"
    )

    repository = DocumentRepository(db)
    document = await repository.create(
        document_data,
        current_user["sub"],
        storage_key="",
        mime_type=file.content_type or "application/octet-stream",
        file_size=str(len(file_bytes)),
        processing_status=ProcessingStatus.UPLOADED,
    )

    storage_key = f"{case_id}/{document.id}/{file.filename or 'document'}"
    await upload_to_minio(
        bucket="case-documents",
        key=storage_key,
        data=file_bytes,
        length=len(file_bytes),
        content_type=file.content_type or "application/octet-stream",
    )

    import os
    DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
    local_path = os.path.join(DATA_DIR, storage_key)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    with open(local_path, "wb") as f:
        f.write(file_bytes)

    document.storage_key = storage_key
    await db.flush()
    await db.commit()
    await db.refresh(document)

    if background_tasks is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Background task manager unavailable",
        )

    background_tasks.add_task(
        _run_ingestion_task,
        str(document.id),
        case_id,
        storage_key,
        file.content_type or "application/octet-stream",
        document_type.value,
    )

    return DocumentResponse.model_validate(document)


@router.get("/{case_id}/documents", response_model=DocumentListResponse)
async def get_case_documents(
    case_id: str,
    skip: int = 0,
    limit: int = 100,
    service: DocumentService = Depends(get_document_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):
    """Get all documents for a case."""
    return await service.get_case_documents(case_id, skip, limit)


document_router = APIRouter(prefix="/documents", tags=["Documents"])


@document_router.patch("/{document_id}/metadata", response_model=DocumentResponse)
async def update_document_metadata(
    document_id: str,
    document_data: DocumentUpdate,
    service: DocumentService = Depends(get_document_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.CLERK))
):
    """Update document metadata."""
    document = await service.update_document(document_id, document_data)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return document


@document_router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    service: DocumentService = Depends(get_document_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.CLERK))
):
    """Delete a document."""
    success = await service.delete_document(document_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

