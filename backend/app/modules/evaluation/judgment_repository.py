import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.evaluation.models import Judgment


class JudgmentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_case_id(self, case_id: str) -> Optional[Judgment]:
        result = await self.db.execute(select(Judgment).where(Judgment.case_id == case_id))
        return result.scalar_one_or_none()

    async def upsert_draft(self, case_id: str, draft_text: str, ai_confidence_score: float) -> Judgment:
        judgment = await self.get_by_case_id(case_id)
        if judgment:
            judgment.draft_text = draft_text
            judgment.ai_confidence_score = ai_confidence_score
            judgment.judgment_text = draft_text
            judgment.is_finalized = False
        else:
            judgment = Judgment(
                id=str(uuid.uuid4()),
                case_id=case_id,
                judge_id=None,
                judgment_text=draft_text,
                draft_text=draft_text,
                final_text=None,
                is_finalized=False,
                ai_confidence_score=ai_confidence_score,
                model_used=None,
                explainability=None,
                reasoning_status="ok",
            )
            self.db.add(judgment)

        await self.db.flush()
        await self.db.refresh(judgment)
        return judgment

    async def upsert_analysis(
        self,
        case_id: str,
        draft_text: str,
        ai_confidence_score: float,
        outcome: str | None,
        reasoning: str | None,
        cited_laws: list[str],
        cited_cases: list[str],
        model_used: str | None,
        explainability: dict,
        reasoning_status: str,
    ) -> Judgment:
        judgment = await self.get_by_case_id(case_id)
        if not judgment:
            judgment = Judgment(
                id=str(uuid.uuid4()),
                case_id=case_id,
                judge_id=None,
                is_finalized=False,
            )
            self.db.add(judgment)

        judgment.draft_text = draft_text
        judgment.judgment_text = draft_text
        judgment.ai_confidence_score = ai_confidence_score
        judgment.decision = outcome
        judgment.reasoning = reasoning
        judgment.articles_cited = cited_laws
        judgment.legal_precedents = cited_cases
        judgment.model_used = model_used
        judgment.explainability = explainability
        judgment.reasoning_status = reasoning_status

        await self.db.flush()
        await self.db.refresh(judgment)
        return judgment

    async def finalize(self, case_id: str, final_text: str, judge_id: str) -> Optional[Judgment]:
        judgment = await self.get_by_case_id(case_id)
        if not judgment:
            return None

        judgment.final_text = final_text
        judgment.judgment_text = final_text
        judgment.judge_id = judge_id
        judgment.is_finalized = True
        judgment.finalized_at = datetime.utcnow()

        await self.db.flush()
        await self.db.refresh(judgment)
        return judgment
