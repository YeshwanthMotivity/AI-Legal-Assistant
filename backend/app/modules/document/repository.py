from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.document.models import Document, ExtractedEntity, ProcessingStatus
from app.modules.document.schemas import DocumentCreate, DocumentUpdate
import uuid
import logging

logger = logging.getLogger(__name__)


class DocumentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, document_id: str) -> Optional[Document]:
        result = await self.db.execute(select(Document).where(Document.id == document_id))
        return result.scalar_one_or_none()
    
    async def get_by_case(self, case_id: str, skip: int = 0, limit: int = 100) -> List[Document]:
        result = await self.db.execute(
            select(Document).where(Document.case_id == case_id).offset(skip).limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Document]:
        result = await self.db.execute(select(Document).offset(skip).limit(limit))
        return list(result.scalars().all())
    
    async def count(self, case_id: Optional[str] = None) -> int:
        query = select(func.count(Document.id))
        if case_id:
            query = query.where(Document.case_id == case_id)
        result = await self.db.execute(query)
        return result.scalar_one()
    
    async def create(
        self,
        document_data: DocumentCreate,
        uploaded_by: str,
        storage_key: Optional[str] = None,
        mime_type: Optional[str] = None,
        file_size: Optional[str] = None,
        processing_status: ProcessingStatus = ProcessingStatus.PENDING,
    ) -> Document:
        document = Document(
            id=str(uuid.uuid4()),
            case_id=document_data.case_id,
            document_type=document_data.document_type,
            file_name=document_data.file_name,
            uploaded_by=uploaded_by,
            storage_key=storage_key,
            mime_type=mime_type,
            file_size=file_size,
            processing_status=processing_status,
        )
        self.db.add(document)
        await self.db.flush()
        await self.db.refresh(document)
        return document
    
    async def update(self, document_id: str, document_data: DocumentUpdate) -> Optional[Document]:
        document = await self.get_by_id(document_id)
        if not document:
            return None
        
        update_data = document_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(document, key, value)
        
        await self.db.flush()
        await self.db.refresh(document)
        return document
    
    async def delete(self, document_id: str) -> bool:
        document = await self.get_by_id(document_id)
        if not document:
            return False
        
        await self.db.delete(document)
        await self.db.flush()
        return True

    async def update_status(self, document_id: str, status: ProcessingStatus) -> None:
        document = await self.get_by_id(document_id)
        if not document:
            return
        document.processing_status = status
        logger.info(
            "Document processing status transition",
            extra={"document_id": document_id, "case_id": document.case_id, "status": status.value},
        )
        await self.db.flush()

    async def save_ocr_text(self, document_id: str, text: str) -> None:
        document = await self.get_by_id(document_id)
        if not document:
            return
        document.ocr_text = text
        await self.db.flush()

    async def save_extracted_entities(self, document_id: str, entities: list[dict]) -> None:
        entity_models: list[ExtractedEntity] = []
        for entity in entities:
            entity_models.append(
                ExtractedEntity(
                    id=str(uuid.uuid4()),
                    document_id=document_id,
                    entity_type=entity.get("entity_type", "unknown"),
                    entity_value=entity.get("entity_value"),
                    confidence_score=str(entity.get("confidence_score", 0.0)),
                )
            )
        self.db.add_all(entity_models)
        await self.db.flush()

