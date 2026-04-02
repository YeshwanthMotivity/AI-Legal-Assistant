import asyncio
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sqlalchemy import select, update
from app.database import AsyncSessionLocal
from app.modules.case.models import Case
from app.config import settings

async def cleanup():
    # 1. Qdrant Cleanup
    print("Starting Qdrant cleanup...")
    client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    case_id_to_delete = "30cb0759-77c6-41b1-ae11-c37f72eee212"
    
    for collection in ["difc_precedents", "case_summaries"]:
        print(f"Deleting case {case_id_to_delete} from {collection}...")
        client.delete(
            collection_name=collection,
            points_selector=Filter(
                must=[FieldCondition(key="case_id", match=MatchValue(value=case_id_to_delete))]
            )
        )
    print("Qdrant cleanup done.")

    # 2. SQL Check and Update
    print("Starting SQL title check/update...")
    async with AsyncSessionLocal() as db:
        # Check specific case mentioned by user
        case_id_unnamed = "c2620394-a5d1-4469-9bce-a4bf6033bb4f"
        result = await db.execute(select(Case).where(Case.id == case_id_unnamed))
        case = result.scalar_one_or_none()
        if case:
            print(f"Case {case_id_unnamed} current title: {case.title}")
            if case.title == "Unnamed Case":
                 # If we can't find the filename easily here, we use a sensible default or what the user suggested
                 # But let's look for documents for this case to get a better title
                 from app.modules.document.models import Document
                 doc_result = await db.execute(select(Document).where(Document.case_id == case_id_unnamed))
                 doc = doc_result.scalars().first()
                 if doc and doc.file_name:
                     new_title = doc.file_name.replace(".pdf", "").replace(".PDF", "")
                     print(f"Updating case {case_id_unnamed} title to {new_title} based on document {doc.file_name}")
                     case.title = new_title
                     await db.commit()
                 else:
                     # Fallback to user suggestion if document not found
                     print(f"Updating case {case_id_unnamed} title to 'unpaid-case-2-eng' (user suggestion)")
                     case.title = "unpaid-case-2-eng"
                     await db.commit()

        # General update for any other SEED cases still unnamed
        print("Checking for any other 'Unnamed Case' seeded records...")
        stmt = (
            update(Case)
            .where(Case.title == "Unnamed Case")
            .where(Case.case_number.like("SEED-%"))
            .values(title="Seeded Precedent")
        )
        # Note: This is a broad fallback, the re_indexer should have handled most.
        # But let's be conservative and only update the specific one if possible.
        
    print("SQL update done.")

if __name__ == "__main__":
    asyncio.run(cleanup())
