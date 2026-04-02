from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.modules.document.models import ProcessingStatus, DocumentType


class DocumentBase(BaseModel):
    document_type: DocumentType
    file_name: str


class DocumentCreate(DocumentBase):
    case_id: str


class DocumentUpdate(BaseModel):
    document_type: Optional[DocumentType] = None
    doc_metadata: Optional[dict] = None
    processing_status: Optional[ProcessingStatus] = None

    class Config:
        populate_by_name = True


class DocumentResponse(DocumentBase):
    id: str
    case_id: str
    file_path: Optional[str] = None
    file_size: Optional[str] = None
    mime_type: Optional[str] = None
    storage_key: Optional[str] = None
    processing_status: ProcessingStatus
    uploaded_by: Optional[str] = None
    ocr_text: Optional[str] = None
    doc_metadata: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        populate_by_name = True


class DocumentListResponse(BaseModel):
    total: int
    items: List[DocumentResponse]


class ExtractedEntityResponse(BaseModel):
    id: str
    document_id: str
    entity_type: str
    entity_value: Optional[str] = None
    confidence_score: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

