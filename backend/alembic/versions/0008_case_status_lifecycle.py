"""Map case status enum values to T7 lifecycle names.

Revision ID: 0008_case_status_lifecycle
Revises: 0007_case_field_rename
Create Date: 2026-03-06 00:00:00.000000
"""

from alembic import op


revision = "0008_case_status_lifecycle"
down_revision = "0007_case_field_rename"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TYPE casestatus_new AS ENUM (
            'Created',
            'DocumentsUploaded',
            'AIAnalysisPending',
            'AIAnalysisReady',
            'DraftGenerated',
            'Finalized'
        )
        """
    )
    op.execute(
        """
        ALTER TABLE cases
        ALTER COLUMN status DROP DEFAULT
        """
    )
    op.execute(
        """
        ALTER TABLE cases
        ALTER COLUMN status TYPE casestatus_new
        USING (
            CASE status::text
                WHEN 'pending' THEN 'Created'
                WHEN 'assigned' THEN 'DocumentsUploaded'
                WHEN 'under_review' THEN 'AIAnalysisPending'
                WHEN 'reasoning_unavailable' THEN 'AIAnalysisPending'
                WHEN 'analysis_complete' THEN 'AIAnalysisReady'
                WHEN 'judgment_drafted' THEN 'DraftGenerated'
                WHEN 'finalized' THEN 'Finalized'
                WHEN 'closed' THEN 'Finalized'
                WHEN 'Created' THEN 'Created'
                WHEN 'DocumentsUploaded' THEN 'DocumentsUploaded'
                WHEN 'AIAnalysisPending' THEN 'AIAnalysisPending'
                WHEN 'AIAnalysisReady' THEN 'AIAnalysisReady'
                WHEN 'DraftGenerated' THEN 'DraftGenerated'
                WHEN 'Finalized' THEN 'Finalized'
                ELSE 'Created'
            END
        )::casestatus_new
        """
    )
    op.execute("DROP TYPE casestatus")
    op.execute("ALTER TYPE casestatus_new RENAME TO casestatus")
    op.execute(
        """
        ALTER TABLE cases
        ALTER COLUMN status SET DEFAULT 'Created'::casestatus
        """
    )


def downgrade() -> None:
    op.execute(
        """
        CREATE TYPE casestatus_old AS ENUM (
            'pending',
            'assigned',
            'under_review',
            'reasoning_unavailable',
            'analysis_complete',
            'judgment_drafted',
            'finalized',
            'closed'
        )
        """
    )
    op.execute("ALTER TABLE cases ALTER COLUMN status DROP DEFAULT")
    op.execute(
        """
        ALTER TABLE cases
        ALTER COLUMN status TYPE casestatus_old
        USING (
            CASE status::text
                WHEN 'Created' THEN 'pending'
                WHEN 'DocumentsUploaded' THEN 'assigned'
                WHEN 'AIAnalysisPending' THEN 'under_review'
                WHEN 'AIAnalysisReady' THEN 'analysis_complete'
                WHEN 'DraftGenerated' THEN 'judgment_drafted'
                WHEN 'Finalized' THEN 'finalized'
                ELSE 'pending'
            END
        )::casestatus_old
        """
    )
    op.execute("DROP TYPE casestatus")
    op.execute("ALTER TYPE casestatus_old RENAME TO casestatus")
    op.execute(
        """
        ALTER TABLE cases
        ALTER COLUMN status SET DEFAULT 'pending'::casestatus
        """
    )

