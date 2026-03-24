from sqlalchemy import Column, String, DateTime, Text, Enum as SQLEnum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class ProcessingStatus(str, enum.Enum):
    PENDING = "PENDING"
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    OCR_COMPLETE = "OCR_COMPLETE"
    EMBEDDED = "EMBEDDED"
    COMPLETED = "COMPLETED"
    COMPLETE = "COMPLETED"
    PARTIAL_INDEXED = "PARTIAL_INDEXED"
    FAILED = "FAILED"


class DocumentType(str, enum.Enum):
    COURT_ORDER = "COURT_ORDER"
    LAW = "LAW"
    OTHER = "OTHER"


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    document_type = Column(SQLEnum(DocumentType), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String)
    file_size = Column(String)
    mime_type = Column(String)
    storage_key = Column(String)  # MinIO object key
    processing_status = Column(SQLEnum(ProcessingStatus), default=ProcessingStatus.PENDING)
    uploaded_by = Column(String, ForeignKey("users.id"))
    ocr_text = Column(Text)
    doc_metadata = Column(JSON, name="metadata")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    case = relationship("Case", back_populates="documents")
    uploaded_by_user = relationship("User", back_populates="documents")
    extracted_entities = relationship("ExtractedEntity", back_populates="document", cascade="all, delete-orphan")
    evaluation_events = relationship("EvaluationEvent", back_populates="document", cascade="all, delete-orphan")


class ExtractedEntity(Base):
    __tablename__ = "extracted_entities"
    
    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    entity_type = Column(String, nullable=False)  # e.g., employee_name, employer_name, salary
    entity_value = Column(Text)
    confidence_score = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("Document", back_populates="extracted_entities")

