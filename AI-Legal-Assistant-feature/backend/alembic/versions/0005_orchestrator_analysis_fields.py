"""Add analysis persistence fields and reasoning_unavailable case status.

Revision ID: 0005_orch_analysis
Revises: 0004_orchestrator_phase5
Create Date: 2026-03-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0005_orch_analysis"
down_revision = "0004_orchestrator_phase5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in inspect(bind).get_columns("judgments")}

    if "model_used" not in columns:
        op.add_column("judgments", sa.Column("model_used", sa.String(), nullable=True))
    if "explainability" not in columns:
        op.add_column("judgments", sa.Column("explainability", sa.JSON(), nullable=True))
    if "reasoning_status" not in columns:
        op.add_column("judgments", sa.Column("reasoning_status", sa.String(), nullable=True))
        op.execute("UPDATE judgments SET reasoning_status = COALESCE(reasoning_status, 'ok')")

    op.execute(
        """
        DO $$
        BEGIN
            ALTER TYPE casestatus ADD VALUE 'reasoning_unavailable';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END$$;
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in inspect(bind).get_columns("judgments")}

    if "reasoning_status" in columns:
        op.drop_column("judgments", "reasoning_status")
    if "explainability" in columns:
        op.drop_column("judgments", "explainability")
    if "model_used" in columns:
        op.drop_column("judgments", "model_used")
