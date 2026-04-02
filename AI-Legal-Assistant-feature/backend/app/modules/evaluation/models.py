from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON, Float, Boolean, Integer
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
    judge_feedback = relationship("JudgeFeedback", back_populates="judgment", cascade="all, delete-orphan")


class JudgeFeedback(Base):
    __tablename__ = "judge_feedback"
    
    id = Column(String, primary_key=True, index=True)
    judgment_id = Column(String, ForeignKey("judgments.id"), nullable=False)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    judge_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Feedback scores (1–5 as float)
    legal_relevance_score = Column(Float)
    reasoning_quality_score = Column(Float)
    explanation_clarity_score = Column(Float)
    
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
    case_id = Column(String, ForeignKey("cases.id"), nullable=True)
    
    # Relationships
    document = relationship("Document", back_populates="evaluation_events")
    case = relationship("Case", back_populates="evaluation_events")
    metric_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    query_id = Column(String, nullable=True, index=True)
    value = Column(Float, nullable=False)
    phase = Column(String, nullable=False, default="phase_1")
    # Flexible JSON payload for benchmark context (run_id, mode, query_text, etc.)
    metadata_ = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ReleaseGate(Base):
    """Records explicit judge / admin sign-off decisions for each retrieval phase gate."""
    __tablename__ = "release_gates"

    id = Column(String, primary_key=True, index=True)
    phase = Column(String, nullable=False, index=True)   # phase_1 | phase_2 | phase_3 | phase_5
    mode = Column(String, nullable=False)                # dense_baseline | hybrid
    status = Column(String, nullable=False, default="pending")  # pending | approved | deferred
    rationale = Column(Text, nullable=True)
    judge_sign_off = Column(String, nullable=True)       # free-text name/ID of signing judge
    decided_by = Column(String, ForeignKey("users.id"), nullable=True)
    decided_at = Column(DateTime, nullable=True)
    benchmark_run_id = Column(String, nullable=True)     # links to EvaluationEvent.query_id
    created_at = Column(DateTime, default=datetime.utcnow)

