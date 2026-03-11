from sqlalchemy import Column, String, DateTime, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class CaseStatus(str, enum.Enum):
    CREATED = "Created"
    DOCUMENTS_UPLOADED = "DocumentsUploaded"
    AI_ANALYSIS_PENDING = "AIAnalysisPending"
    AI_ANALYSIS_READY = "AIAnalysisReady"
    DRAFT_GENERATED = "DraftGenerated"
    FINALIZED = "Finalized"


class CaseType(str, enum.Enum):
    UNPAID_WAGES = "UNPAID_WAGES"
    WRONGFUL_TERMINATION = "WRONGFUL_TERMINATION"
    END_OF_SERVICE = "END_OF_SERVICE"
    CONTRACT_DISPUTE = "CONTRACT_DISPUTE"
    OTHER = "OTHER"


class Case(Base):
    __tablename__ = "cases"
    
    id = Column(String, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True, nullable=False)
    case_type = Column(SQLEnum(CaseType), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(
        SQLEnum(
            CaseStatus,
            name="casestatus",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=CaseStatus.CREATED,
    )
    assigned_to = Column(String, ForeignKey("users.id"))
    created_by = Column(String, ForeignKey("users.id"))
    claimant_name = Column(String)
    respondent_name = Column(String)
    claim_amount = Column(String)
    filing_date = Column(DateTime, default=datetime.utcnow)
    court_number = Column(String)
    notes = Column(Text)
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

