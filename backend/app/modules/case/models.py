from sqlalchemy import Column, String, DateTime, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class CaseStatus(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    UNDER_REVIEW = "under_review"
    REASONING_UNAVAILABLE = "reasoning_unavailable"
    ANALYSIS_COMPLETE = "analysis_complete"
    JUDGMENT_DRAFTED = "judgment_drafted"
    FINALIZED = "finalized"
    CLOSED = "closed"


class CaseType(str, enum.Enum):
    UNPAID_WAGES = "unpaid_wages"
    WRONGFUL_TERMINATION = "wrongful_termination"
    END_OF_SERVICE = "end_of_service"
    CONTRACT_DISPUTE = "contract_dispute"
    OTHER = "other"


class Case(Base):
    __tablename__ = "cases"
    
    id = Column(String, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True, nullable=False)
    case_type = Column(SQLEnum(CaseType), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(SQLEnum(CaseStatus), nullable=False, default=CaseStatus.PENDING)
    assigned_to = Column(String, ForeignKey("users.id"))
    created_by = Column(String, ForeignKey("users.id"))
    employee_name = Column(String)
    employer_name = Column(String)
    claim_amount = Column(String)
    filed_date = Column(DateTime, default=datetime.utcnow)
    hearing_date = Column(DateTime)
    judgment_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assigned_user = relationship("User", back_populates="cases", foreign_keys=[assigned_to])
    created_by_user = relationship("User", back_populates="created_cases", foreign_keys=[created_by])
    documents = relationship("Document", back_populates="case")
    judgments = relationship("Judgment", back_populates="case")
    judge_feedback = relationship("JudgeFeedback", back_populates="case")

