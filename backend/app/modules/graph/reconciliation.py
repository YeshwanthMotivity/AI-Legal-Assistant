import logging
from sqlalchemy.ext.asyncio import AsyncSession
from neo4j import GraphDatabase
from app.config import settings
from app.modules.case.repository import CaseRepository

logger = logging.getLogger(__name__)


async def reconcile_graph(db: AsyncSession) -> dict:
    """
    Reconcile PostgreSQL and Neo4j case data to detect drift.
    
    Returns:
        Dictionary with checked count, drift count, and list of drifted case IDs
    """
    # Fetch all cases from PostgreSQL
    case_repo = CaseRepository(db)
    pg_cases = await case_repo.get_all(limit=10000)
    pg_ids = {case.id for case in pg_cases}
    
    # Fetch all case IDs from Neo4j
    loop = None
    try:
        import asyncio
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    def _fetch_neo4j_cases():
        try:
            driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password),
            )
            neo4j_ids = set()
            with driver.session() as session:
                result = session.run("MATCH (c:Case) RETURN c.case_id AS case_id")
                for record in result:
                    if record["case_id"]:
                        neo4j_ids.add(record["case_id"])
            driver.close()
            return neo4j_ids
        except Exception as e:
            logger.warning(f"Failed to fetch Neo4j cases: {e}")
            return set()

    neo4j_ids = await loop.run_in_executor(None, _fetch_neo4j_cases)
    
    # Compute drift: cases in PG but missing in Neo4j
    drifted_ids = pg_ids - neo4j_ids
    
    # Log warnings for each drifted case
    for case_id in drifted_ids:
        logger.warning(f"Drift detected: case_id={case_id} exists in PostgreSQL but not in Neo4j")
    
    return {
        "checked": len(pg_ids),
        "drift_count": len(drifted_ids),
        "drifted_case_ids": list(drifted_ids),
    }

