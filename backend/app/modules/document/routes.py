from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db, AsyncSessionLocal
from app.modules.document.schemas import (
    DocumentCreate, DocumentUpdate, DocumentResponse, DocumentListResponse
)
from app.modules.document.repository import DocumentRepository
from app.modules.document.services import DocumentService
from app.modules.document.models import DocumentType, ProcessingStatus
from app.modules.ingestion.minio_client import upload_file as upload_to_minio, download_file
from app.modules.ingestion.pipeline import run_ingestion_pipeline
from app.auth.rbac import require_role, UserRole
from app.modules.audit.service import AuditService
from app.modules.document.relevance import validate_document_relevance
from app.modules.case.repository import CaseRepository


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
    document_type: str = Form("other"),
    db: AsyncSession = Depends(get_db),
    service: DocumentService = Depends(get_document_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.CLERK, UserRole.JUDGE))
):
    """Upload document to a case."""
    # 1. Fetch Case Context for Validation
    case_repo = CaseRepository(db)
    case = await case_repo.get_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    file_bytes = await file.read()

    # 2. AI Relevance & Audit Layer
    selected_categories = [document_type] if "," not in document_type else document_type.split(",")
    is_relevant, relevance_message = await validate_document_relevance(
        file_bytes=file_bytes,
        file_name=file.filename or "unknown",
        mime_type=file.content_type or "application/octet-stream",
        selected_categories=selected_categories,
        case_title=case.title or "Unknown Case",
        case_description=case.description or "",
        claimant_name=case.claimant_name,
        respondent_name=case.respondent_name
    )

    if not is_relevant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=relevance_message
        )

    document_data = DocumentCreate(
        case_id=case_id,
        document_type=document_type,
        file_name=file.filename or "unknown"
    )

    repository = DocumentRepository(db)
    document = await repository.create(
        document_data,
        current_user["db_id"],
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

    audit_service = AuditService(db)
    await audit_service.log(
        user_id=current_user.get("db_id", "unknown"),
        action="DOCUMENT_UPLOAD",
        resource_type="document",
        resource_id=str(document.id),
        metadata={
            "phase": "Evidence_Upload",
            "description": f"Document '{file.filename}' uploaded and verified for case relevance.",
            "file_name": file.filename or "unknown",
            "document_type": document_type,
            "case_id": case_id
        }
    )

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
        document_type,
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


@router.get("/{case_id}/documents/{document_id}/content")
async def get_document_content(
    case_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):
    """Get document content from storage."""
    repository = DocumentRepository(db)
    document = await repository.get_by_id(document_id)
    if not document or document.case_id != case_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or does not belong to this case"
        )
    
    if not document.storage_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document content not available"
        )
    
    try:
        content = await download_file(bucket="case-documents", key=document.storage_key)
        return Response(
            content=content,
            media_type=document.mime_type or "application/octet-stream",
            headers={
                "Content-Disposition": f'inline; filename="{document.file_name}"'
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve document: {str(e)}"
        )


@router.delete("/{case_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case_document(
    case_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    service: DocumentService = Depends(get_document_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.CLERK, UserRole.JUDGE))
):
    """Delete a document from a case."""
    audit_service = AuditService(db)
    await audit_service.log(
        user_id=current_user.get("db_id", "unknown"),
        action="DOCUMENT_DELETE",
        resource_type="document",
        resource_id=document_id,
        metadata={
            "case_id": case_id
        }
    )
    
    success = await service.delete_document(document_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )


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

