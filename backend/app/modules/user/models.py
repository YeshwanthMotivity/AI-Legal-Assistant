from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, CheckConstraint
from sqlalchemy.ext.hybrid import hybrid_property
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

    __table_args__ = (
        # Enforce the string-boolean contract at the DB level so bad values are rejected.
        CheckConstraint("is_active IN ('true', 'false')", name="ck_users_is_active"),
    )

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    keycloak_id = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CLERK)
    is_active = Column(String, default="true", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @hybrid_property
    def active(self) -> bool:
        """Boolean view of the string is_active column."""
        return self.is_active == "true"

    @active.setter  # type: ignore[no-redef]
    def active(self, value: bool) -> None:
        self.is_active = "true" if value else "false"
    
    # Relationships
    cases = relationship("Case", back_populates="assigned_user", foreign_keys="Case.assigned_to")
    created_cases = relationship("Case", back_populates="created_by_user", foreign_keys="Case.created_by")
    documents = relationship("Document", back_populates="uploaded_by_user")
    judgments = relationship("Judgment", back_populates="judge")
    judge_feedback = relationship("JudgeFeedback", back_populates="judge")
    audit_logs = relationship("AuditLog", back_populates="user")

