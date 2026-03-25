"""
Cleanup script v2: Clear wrongly patched claimant/respondent values.

Usage:
  docker compose exec backend python /app/scripts/fix_bad_patches.py
"""
from qdrant_client import QdrantClient

client = QdrantClient(host="qdrant", port=6333)
COLLECTION = "difc_precedents"

BAD_PREFIXES = [
    "In ", "See ", "Although ", "Those ", "Court of Appeal in ",
    "Justice ", "Lady ", "Lord ", "As found in ", "Defendant the ",
    "Vv ", "WBC ", "AIT ", "Small Claims Tribunal in ",
    "Limited & Anr.", "Centre V v ", "V v ", "Nib ",
]

BAD_EXACT = [
    "Sanjiv Singhal / BTAC",
    "the v", "v the", "Group Ltd",
]


def is_bad_claimant(claimant: str) -> bool:
    if not claimant:
        return False
    for prefix in BAD_PREFIXES:
        if claimant.startswith(prefix):
            return True
    if claimant in BAD_EXACT:
        return True
    # Single-word names shorter than 8 chars are likely garbage
    if " " not in claimant.strip() and len(claimant) < 8:
        return True
    return False


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
            claimant = payload.get("claimant", "") or ""

            if is_bad_claimant(claimant):
                client.set_payload(
                    collection_name=COLLECTION,
                    payload={"claimant": None, "respondent": None},
                    points=[point.id],
                )
                print(f"Fixed {point.id}: cleared '{claimant}'")
                fixed += 1

        if offset is None:
            break

    print(f"\nDone. Fixed {fixed} bad patches.")


if __name__ == "__main__":
    main()
