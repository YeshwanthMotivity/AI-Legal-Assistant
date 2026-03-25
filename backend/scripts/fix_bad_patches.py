"""
Cleanup script: Revert Qdrant points where claimant was wrongly set to
a cited case name (starting with "In ").

Usage:
  docker compose exec backend python /app/scripts/fix_bad_patches.py
"""

from qdrant_client import QdrantClient

client = QdrantClient(host="qdrant", port=6333)

COLLECTION = "difc_precedents"


def main():
    offset = None
    fixed = 0

    while True:
        results, offset = client.scroll(
            collection_name=COLLECTION,
            limit=100,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )
        if not results:
            break

        for point in results:
            payload = point.payload or {}
            claimant = payload.get("claimant", "")

            # These are cited cases, not real parties
            if claimant and claimant.startswith("In "):
                client.set_payload(
                    collection_name=COLLECTION,
                    payload={"claimant": None, "respondent": None},
                    points=[point.id],
                )
                print(f"Fixed {point.id}: cleared bad claimant '{claimant}'")
                fixed += 1

        if offset is None:
            break

    print(f"\nDone. Fixed {fixed} bad patches.")


if __name__ == "__main__":
    main()
