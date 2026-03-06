from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.rbac import require_role, UserRole
from app.modules.graph.schemas import (
    GraphQueryRequest,
    GraphQueryResponse,
    ReconciliationResponse,
)
from app.modules.graph.services import GraphQueryService
from app.modules.graph.reconciliation import reconcile_graph

router = APIRouter(prefix="", tags=["Graph"])


@router.post("/cases/{case_id}/graph-query", response_model=GraphQueryResponse)
async def graph_query(
    case_id: str,
    request: GraphQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.JUDGE, UserRole.ADMIN)),
):
    """
    Query the Neo4j graph for case relationships.
    
    Supports three intents:
    - find_relevant_laws: Find law articles cited by this case
    - find_related_cases: Find similar cases based on SIMILAR_TO relationships
    - find_similar_companies: Find cases involving similar respondent companies
    """
    service = GraphQueryService(db)
    return await service.query(case_id, request.intent)


@router.get("/admin/graph/reconcile", response_model=ReconciliationResponse)
async def graph_reconcile(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """
    Reconcile PostgreSQL and Neo4j case data.
    
    Returns drift information for cases that exist in PostgreSQL but not in Neo4j.
    """
    result = await reconcile_graph(db)
    return ReconciliationResponse(**result)

