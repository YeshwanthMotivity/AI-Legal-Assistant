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
down_revision = "0008_case_status_lifecycle"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    eval_columns = {column["name"]: column for column in inspector.get_columns("evaluation_events")}
    if "case_id" in eval_columns and not eval_columns["case_id"]["nullable"]:
        op.alter_column(
            "evaluation_events",
            "case_id",
            existing_type=sa.String(),
            nullable=True,
        )

    if "metadata_" not in eval_columns:
        op.add_column(
            "evaluation_events",
            sa.Column("metadata_", sa.JSON(), nullable=True),
        )

    judge_columns = {column["name"]: column for column in inspector.get_columns("judge_feedback")}
    for col in ("legal_relevance_score", "reasoning_quality_score", "explanation_clarity_score"):
        if col not in judge_columns:
            op.add_column("judge_feedback", sa.Column(col, sa.Float(), nullable=True))
            continue
        if not isinstance(judge_columns[col]["type"], sa.Float):
            op.drop_column("judge_feedback", col)
            op.add_column("judge_feedback", sa.Column(col, sa.Float(), nullable=True))

    table_names = set(inspector.get_table_names())
    if "release_gates" not in table_names:
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

    index_names = {index["name"] for index in inspector.get_indexes("release_gates")} if "release_gates" in table_names else set()
    if "ix_release_gates_phase" not in index_names:
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
