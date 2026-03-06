from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Judgment(Base):
    __tablename__ = "judgments"
    
    id = Column(String, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    judge_id = Column(String, ForeignKey("users.id"), nullable=True)
    judgment_text = Column(Text)
    decision = Column(String)  # e.g., "approved", "rejected", "partial"
    compensation_amount = Column(String)
    reasoning = Column(Text)
    legal_precedents = Column(JSON)  # List of similar cases cited
    articles_cited = Column(JSON)  # List of law articles cited
    draft_text = Column(Text)  # AI-generated draft
    final_text = Column(Text)  # Judge-finalized text
    is_finalized = Column(Boolean, default=False)
    ai_confidence_score = Column(Float)
    finalized_at = Column(DateTime)
    model_used = Column(String)
    explainability = Column(JSON)
    reasoning_status = Column(String, default="ok")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    case = relationship("Case", back_populates="judgments")
    judge = relationship("User", back_populates="judgments")
    judge_feedback = relationship("JudgeFeedback", back_populates="judgment")


class JudgeFeedback(Base):
    __tablename__ = "judge_feedback"
    
    id = Column(String, primary_key=True, index=True)
    judgment_id = Column(String, ForeignKey("judgments.id"), nullable=False)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    judge_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Feedback scores (1-5)
    legal_relevance_score = Column(String)
    reasoning_quality_score = Column(String)
    explanation_clarity_score = Column(String)
    
    feedback_text = Column(Text)
    suggested_improvements = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    judgment = relationship("Judgment", back_populates="judge_feedback")
    case = relationship("Case", back_populates="judge_feedback")
    judge = relationship("User", back_populates="judge_feedback")


class EvaluationEvent(Base):
    __tablename__ = "evaluation_events"

    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    metric_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    query_id = Column(String, nullable=True, index=True)
    value = Column(Float, nullable=False)
    phase = Column(String, nullable=False, default="phase_1")
    created_at = Column(DateTime, default=datetime.utcnow)

