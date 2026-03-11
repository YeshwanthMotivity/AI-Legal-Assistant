from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    JUDGE = "JUDGE"
    CLERK = "CLERK"


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CLERK)
    is_active = Column(String, default="true")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cases = relationship("Case", back_populates="assigned_user", foreign_keys="Case.assigned_to")
    created_cases = relationship("Case", back_populates="created_by_user", foreign_keys="Case.created_by")
    documents = relationship("Document", back_populates="uploaded_by_user")
    judgments = relationship("Judgment", back_populates="judge")
    judge_feedback = relationship("JudgeFeedback", back_populates="judge")
    audit_logs = relationship("AuditLog", back_populates="user")

