"""Case field changes for T7

Revision ID: 0007_case_field_rename
Revises: 0006_judgment_judge_nullable
Create Date: 2026-03-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0007_case_field_rename"
down_revision = "0006_judgment_judge_nullable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("cases", "employee_name", new_column_name="claimant_name")
    op.alter_column("cases", "employer_name", new_column_name="respondent_name")
    op.alter_column("cases", "filed_date", new_column_name="filing_date")
    op.add_column("cases", sa.Column("court_number", sa.String(), nullable=True))
    op.add_column("cases", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("cases", "notes")
    op.drop_column("cases", "court_number")
    op.alter_column("cases", "filing_date", new_column_name="filed_date")
    op.alter_column("cases", "respondent_name", new_column_name="employer_name")
    op.alter_column("cases", "claimant_name", new_column_name="employee_name")
