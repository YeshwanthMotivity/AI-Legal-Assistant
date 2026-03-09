"""T8 evaluation infrastructure schema changes.

Revision ID: 0009
Revises: 0008_case_status_lifecycle
Create Date: 2026-03-09

Changes:
  - evaluation_events.case_id: NOT NULL → nullable
  - evaluation_events: add metadata_ JSONB column
  - judge_feedback: change score columns from VARCHAR → DOUBLE PRECISION
  - New table: release_gates
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Make evaluation_events.case_id nullable
    op.alter_column(
        "evaluation_events",
        "case_id",
        existing_type=sa.String(),
        nullable=True,
    )

    # 2. Add metadata_ JSON column to evaluation_events
    op.add_column(
        "evaluation_events",
        sa.Column("metadata_", sa.JSON(), nullable=True),
    )

    # 3. Fix judge_feedback score columns: VARCHAR → DOUBLE PRECISION
    #    We drop and recreate them (data loss acknowledged, confirmed by user)
    for col in ("legal_relevance_score", "reasoning_quality_score", "explanation_clarity_score"):
        op.drop_column("judge_feedback", col)
        op.add_column(
            "judge_feedback",
            sa.Column(col, sa.Float(), nullable=True),
        )

    # 4. Create release_gates table
    op.create_table(
        "release_gates",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("phase", sa.String(), nullable=False),
        sa.Column("mode", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("judge_sign_off", sa.String(), nullable=True),
        sa.Column("decided_by", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("decided_at", sa.DateTime(), nullable=True),
        sa.Column("benchmark_run_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_release_gates_phase", "release_gates", ["phase"])


def downgrade() -> None:
    # Reverse release_gates
    op.drop_index("ix_release_gates_phase", table_name="release_gates")
    op.drop_table("release_gates")

    # Reverse judge_feedback score columns back to String
    for col in ("legal_relevance_score", "reasoning_quality_score", "explanation_clarity_score"):
        op.drop_column("judge_feedback", col)
        op.add_column(
            "judge_feedback",
            sa.Column(col, sa.String(), nullable=True),
        )

    # Reverse evaluation_events.metadata_
    op.drop_column("evaluation_events", "metadata_")

    # Reverse case_id back to NOT NULL
    op.alter_column(
        "evaluation_events",
        "case_id",
        existing_type=sa.String(),
        nullable=False,
    )
