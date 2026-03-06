"""Database models for the application."""

from sqlalchemy import Column, String, DateTime, Boolean, UUID, ForeignKey, Integer, Text, Float
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


class User(Base):
    """User model representing system users."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(128), unique=True, nullable=False)
    password_hash = Column(String(512), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), default="user", nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Case(Base):
    """Case model representing judicial cases."""
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_number = Column(String(128), unique=True, nullable=False, index=True)
    title = Column(String(512), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="open", nullable=False, index=True)
    assigned_judge_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    assigned_clerk_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Document(Base):
    """Document model for case documents."""
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(256), nullable=False)
    document_type = Column(String(50), nullable=False, index=True)
    content = Column(Text, nullable=False)
    minio_path = Column(String(512))
    doc_metadata = Column(JSON, name="metadata")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Judgment(Base):
    """Judgment model for case judgments."""
    __tablename__ = "judgments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    judgment_text = Column(Text, nullable=False)
    ai_reasoning = Column(Text)
    judgment_status = Column(String(50), default="draft", nullable=False, index=True)
    judge_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AuditLog(Base):
    """Audit log model for tracking system actions."""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), index=True)
    entity_id = Column(UUID(as_uuid=True), index=True)
    changes = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(String(512))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
