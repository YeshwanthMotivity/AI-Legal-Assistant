from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String, nullable=False)  # e.g., "create_case", "update_document", "login"
    resource_type = Column(String)  # e.g., "case", "document", "user"
    resource_id = Column(String)
    description = Column(Text)
    old_value = Column(JSON)
    new_value = Column(JSON)
    ip_address = Column(String)
    user_agent = Column(String)
    extra_metadata = Column(JSON, name="metadata")  # Additional context
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
