import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Enum, Text, ForeignKey
from app.database import Base

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"

class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    storage_key = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)
    attempts = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
