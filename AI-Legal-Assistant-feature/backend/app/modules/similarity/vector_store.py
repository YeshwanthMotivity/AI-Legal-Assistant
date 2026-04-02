import asyncio
import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from app.config import settings


async def upsert_case_summary(
    case_id: str,
    case_type: str,
    case_title: str,
    claimant: str,
    respondent: str,
    outcome: str,
    embedding: list[float],
) -> None:
    """
    Upsert a case summary into the case_summaries Qdrant collection.
    
    Args:
        case_id: Unique identifier for the case
        case_type: Type of case (e.g., "unpaid_wages", "wrongful_termination")
        case_title: Official case title for authoritative identification
        claimant: Name of the claimant/employee
        respondent: Name of the respondent/employer
        outcome: Judgment outcome (can be empty for cases without judgment)
        embedding: BGE-M3 embedding vector for the case summary
    """
    loop = asyncio.get_event_loop()

    def _upsert() -> None:
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        
        # Use UUID5 with NAMESPACE_URL for idempotent point IDs
        point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, case_id))
        
        point = PointStruct(
            id=point_id,
            vector=embedding,
            payload={
                "case_id": case_id,
                "case_type": case_type,
                "case_title": case_title,
                "claimant": claimant,
                "respondent": respondent,
                "outcome": outcome,
            },
        )
        
        client.upsert(collection_name="case_summaries", points=[point])

    await loop.run_in_executor(None, _upsert)

