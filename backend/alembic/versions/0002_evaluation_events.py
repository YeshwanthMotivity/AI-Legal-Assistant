"""Add evaluation_events table.

Revision ID: 0002_evaluation_events
Revises: 0001_initial_schema
Create Date: 2026-03-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_evaluation_events"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "evaluation_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("case_id", sa.String(), nullable=False),
        sa.Column("metric_type", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("phase", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_evaluation_events_id"), "evaluation_events", ["id"], unique=False)
    op.create_index(op.f("ix_evaluation_events_case_id"), "evaluation_events", ["case_id"], unique=False)
    op.create_index(op.f("ix_evaluation_events_document_id"), "evaluation_events", ["document_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_evaluation_events_document_id"), table_name="evaluation_events")
    op.drop_index(op.f("ix_evaluation_events_case_id"), table_name="evaluation_events")
    op.drop_index(op.f("ix_evaluation_events_id"), table_name="evaluation_events")
    op.drop_table("evaluation_events")
