"""
Initial schema migration for AI Judicial Assistant Platform.
Create all 7 tables: users, cases, documents, extracted_entities, judgments, judge_feedback, audit_logs.

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-03-05 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create initial schema."""
    
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), server_default=sa.func.gen_random_uuid(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("username", sa.String(128), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("role", sa.String(50), nullable=False, default="user"),  # judge, clerk, admin, user
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"])
    op.create_index(op.f("ix_users_username"), "users", ["username"])
    op.create_index(op.f("ix_users_role"), "users", ["role"])
    
    # Create cases table
    op.create_table(
        "cases",
        sa.Column("id", sa.UUID(), server_default=sa.func.gen_random_uuid(), nullable=False),
        sa.Column("case_number", sa.String(128), nullable=False, unique=True),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, default="open"),  # open, under_analysis, closed
        sa.Column("assigned_judge_id", sa.UUID(), nullable=True),
        sa.Column("assigned_clerk_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["assigned_judge_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["assigned_clerk_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cases_case_number"), "cases", ["case_number"])
    op.create_index(op.f("ix_cases_status"), "cases", ["status"])
    op.create_index(op.f("ix_cases_assigned_judge_id"), "cases", ["assigned_judge_id"])
    
    # Create documents table
    op.create_table(
        "documents",
        sa.Column("id", sa.UUID(), server_default=sa.func.gen_random_uuid(), nullable=False),
        sa.Column("case_id", sa.UUID(), nullable=False),
        sa.Column("filename", sa.String(256), nullable=False),
        sa.Column("document_type", sa.String(50), nullable=False),  # complaint, evidence, judgment, statute, etc.
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("minio_path", sa.String(512), nullable=True),  # Path in MinIO object storage
        sa.Column("metadata", postgresql.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_documents_case_id"), "documents", ["case_id"])
    op.create_index(op.f("ix_documents_document_type"), "documents", ["document_type"])
    
    # Create extracted_entities table
    op.create_table(
        "extracted_entities",
        sa.Column("id", sa.UUID(), server_default=sa.func.gen_random_uuid(), nullable=False),
        sa.Column("case_id", sa.UUID(), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),  # person, organization, location, date, law, etc.
        sa.Column("entity_value", sa.String(512), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("context", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_extracted_entities_case_id"), "extracted_entities", ["case_id"])
    op.create_index(op.f("ix_extracted_entities_entity_type"), "extracted_entities", ["entity_type"])
    
    # Create judgments table
    op.create_table(
        "judgments",
        sa.Column("id", sa.UUID(), server_default=sa.func.gen_random_uuid(), nullable=False),
        sa.Column("case_id", sa.UUID(), nullable=False, unique=True),
        sa.Column("judgment_text", sa.Text(), nullable=False),
        sa.Column("ai_reasoning", sa.Text(), nullable=True),
        sa.Column("judgment_status", sa.String(50), nullable=False, default="draft"),  # draft, reviewed, finalized
        sa.Column("judge_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["judge_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_judgments_case_id"), "judgments", ["case_id"])
    op.create_index(op.f("ix_judgments_judgment_status"), "judgments", ["judgment_status"])
    
    # Create judge_feedback table
    op.create_table(
        "judge_feedback",
        sa.Column("id", sa.UUID(), server_default=sa.func.gen_random_uuid(), nullable=False),
        sa.Column("judgment_id", sa.UUID(), nullable=False),
        sa.Column("judge_id", sa.UUID(), nullable=False),
        sa.Column("feedback_text", sa.Text(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=True),  # 1-5 star rating
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["judgment_id"], ["judgments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["judge_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_judge_feedback_judgment_id"), "judge_feedback", ["judgment_id"])
    op.create_index(op.f("ix_judge_feedback_judge_id"), "judge_feedback", ["judge_id"])
    
    # Create audit_logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.UUID(), server_default=sa.func.gen_random_uuid(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),  # create, read, update, delete, login, etc.
        sa.Column("entity_type", sa.String(100), nullable=True),  # case, document, judgment, etc.
        sa.Column("entity_id", sa.UUID(), nullable=True),
        sa.Column("changes", postgresql.JSON(), nullable=True),  # JSON diff of what changed
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_user_id"), "audit_logs", ["user_id"])
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"])
    op.create_index(op.f("ix_audit_logs_entity_type"), "audit_logs", ["entity_type"])
    op.create_index(op.f("ix_audit_logs_created_at"), "audit_logs", ["created_at"])


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table("audit_logs")
    op.drop_table("judge_feedback")
    op.drop_table("judgments")
    op.drop_table("extracted_entities")
    op.drop_table("documents")
    op.drop_table("cases")
    op.drop_table("users")
