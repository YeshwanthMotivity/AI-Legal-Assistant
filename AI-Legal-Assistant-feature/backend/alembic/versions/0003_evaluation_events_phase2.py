"""Extend evaluation_events for phase 2 retrieval metrics.

Revision ID: 0003_evaluation_events_phase2
Revises: 0002_evaluation_events
Create Date: 2026-03-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_evaluation_events_phase2"
down_revision = "0002_evaluation_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("evaluation_events", "document_id", existing_type=sa.String(), nullable=True)
    op.alter_column("evaluation_events", "entity_type", existing_type=sa.String(), nullable=True)
    op.add_column("evaluation_events", sa.Column("query_id", sa.String(), nullable=True))
    op.create_index(op.f("ix_evaluation_events_query_id"), "evaluation_events", ["query_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_evaluation_events_query_id"), table_name="evaluation_events")
    op.drop_column("evaluation_events", "query_id")
    op.alter_column("evaluation_events", "entity_type", existing_type=sa.String(), nullable=False)
    op.alter_column("evaluation_events", "document_id", existing_type=sa.String(), nullable=False)
