"""Make judgments.judge_id nullable for AI draft upsert.

Revision ID: 0006_judgment_judge_nullable
Revises: 0005_orch_analysis
Create Date: 2026-03-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_judgment_judge_nullable"
down_revision = "0005_orch_analysis"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("judgments", "judge_id", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    op.alter_column("judgments", "judge_id", existing_type=sa.String(), nullable=False)

