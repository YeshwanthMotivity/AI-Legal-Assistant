"""Add Phase 5 orchestrator judgment fields.

Revision ID: 0004_orchestrator_phase5
Revises: 0003_evaluation_events_phase2
Create Date: 2026-03-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0004_orchestrator_phase5"
down_revision = "0003_evaluation_events_phase2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("judgments")}

    if "draft_text" not in columns:
        op.add_column("judgments", sa.Column("draft_text", sa.Text(), nullable=True))
    if "final_text" not in columns:
        op.add_column("judgments", sa.Column("final_text", sa.Text(), nullable=True))
    if "is_finalized" not in columns:
        op.add_column("judgments", sa.Column("is_finalized", sa.Boolean(), nullable=True))
    if "ai_confidence_score" not in columns:
        op.add_column("judgments", sa.Column("ai_confidence_score", sa.Float(), nullable=True))
    if "finalized_at" not in columns:
        op.add_column("judgments", sa.Column("finalized_at", sa.DateTime(), nullable=True))

    refreshed_columns = {column["name"] for column in inspect(bind).get_columns("judgments")}
    if "is_final" in refreshed_columns and "is_finalized" in refreshed_columns:
        op.execute(
            """
            UPDATE judgments
            SET is_finalized = CASE
                WHEN LOWER(COALESCE(is_final, 'false')) = 'true' THEN TRUE
                ELSE FALSE
            END
            """
        )
        op.drop_column("judgments", "is_final")

    op.execute("UPDATE judgments SET is_finalized = COALESCE(is_finalized, FALSE)")
    op.alter_column("judgments", "is_finalized", nullable=False, server_default=sa.text("false"))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("judgments")}

    if "is_final" not in columns:
        op.add_column("judgments", sa.Column("is_final", sa.String(), nullable=True))
    if "is_finalized" in columns:
        op.execute(
            """
            UPDATE judgments
            SET is_final = CASE
                WHEN is_finalized = TRUE THEN 'true'
                ELSE 'false'
            END
            """
        )

    for column_name in ["finalized_at", "ai_confidence_score", "is_finalized", "final_text", "draft_text"]:
        if column_name in columns:
            op.drop_column("judgments", column_name)
