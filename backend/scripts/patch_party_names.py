"""
One-time Qdrant patch script: Extract claimant/respondent names from raw_text
and write them directly into difc_precedents payload fields.

Usage:
  docker compose up -d --build backend
  docker compose exec backend python /app/scripts/patch_party_names.py
"""

import re
from qdrant_client import QdrantClient


client = QdrantClient(host="qdrant", port=6333)

COLLECTION = "difc_precedents"

BAD_VALUES = {
    None, "", "the Claimant", "Claimant", "claimant",
    "the Defendant", "Defendant", "defendant",
    "See transcript", "N/A",
}


# ── Extraction helpers ────────────────────────────────────────────────────────

def extract_parties_from_text(text: str) -> dict:
    """Extract from English documents — skip cited cases like 'In Elseco v Lys'."""
    # Priority: matches containing "DIFC CFI" (main case, not appeal/CA refs)
    matches = list(re.finditer(
        r'([A-Z][A-Za-z\s&,.\'-]{3,60})\s+v\s+([A-Z][A-Za-z\s&,.\'-]{3,60})\s*\[(\d{4})\]\s*DIFC\s*CFI',
        text
    ))
    if matches:
        m = matches[0]
        return {
            "claimant": m.group(1).strip(),
            "respondent": m.group(2).strip(),
            "year": m.group(3),
        }

    # Fallback: "X v Y [YEAR]" but skip lines starting with "In ", "See ", etc.
    for m in re.finditer(
        r'([A-Z][A-Za-z\s&,.\'-]{3,60})\s+v\s+([A-Z][A-Za-z\s&,.\'-]{3,60})\s*\[(\d{4})\]',
        text
    ):
        line_start = text.rfind('\n', 0, m.start()) + 1
        prefix = text[line_start:m.start()].strip().lower()
        if prefix.startswith(('in ', 'see ', 'as in ', 'cited in', 'relying on')):
            continue
        return {
            "claimant": m.group(1).strip(),
            "respondent": m.group(2).strip(),
            "year": m.group(3),
        }

    # Pattern: "BETWEEN\n\nX\n\nClaimant\n\nand\n\nY\n\nDefendant"
    between_match = re.search(
        r'BETWEEN\s+([A-Z][A-Z\s&,.\'-]+?)\s+Claimant\s+and\s+([A-Z][A-Z\s&,.\'-]+?)\s+Defendant',
        text, re.IGNORECASE,
    )
    if between_match:
        return {
            "claimant": between_match.group(1).strip(),
            "respondent": between_match.group(2).strip(),
            "year": None,
        }

    return {"claimant": None, "respondent": None, "year": None}


def extract_parties_arabic(text: str) -> dict:
    """Extract from Arabic documents."""
    claimant_match = re.search(r'([^\n]{3,60})\s*\n\s*المدعي', text)
    respondent_match = re.search(r'([^\n]{3,60})\s*\n\s*المدعى عليه', text)
    return {
        "claimant": claimant_match.group(1).strip() if claimant_match else None,
        "respondent": respondent_match.group(1).strip() if respondent_match else None,
        "year": None,
    }


# ── Main scroll-and-patch loop ────────────────────────────────────────────────

def main():
    offset = None
    patched = 0
    skipped = 0
    failed = 0

    while True:
        results, offset = client.scroll(
            collection_name=COLLECTION,
            limit=50,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )

        if not results:
            break

        for point in results:
            payload = point.payload or {}
            existing_claimant = payload.get("claimant", "")

            # Skip if already has a real name (not generic or cited-case prefix)
            if existing_claimant not in BAD_VALUES and not existing_claimant.startswith("In "):
                skipped += 1
                continue

            raw_text = payload.get("raw_text", "") or payload.get("text", "")
            language = payload.get("language", "en")

            if language == "ar":
                parties = extract_parties_arabic(raw_text)
            else:
                parties = extract_parties_from_text(raw_text)

            if parties["claimant"]:
                update_payload = {
                    "claimant": parties["claimant"],
                    "respondent": parties["respondent"],
                }
                if parties["year"]:
                    update_payload["year"] = parties["year"]

                client.set_payload(
                    collection_name=COLLECTION,
                    payload=update_payload,
                    points=[point.id],
                )
                print(f"✅ Patched {point.id}: {parties['claimant']} v {parties['respondent']}")
                patched += 1
            else:
                case_name = payload.get("case_name", "unknown")
                print(f"⚠️  Could not extract parties for point {point.id} | case: {case_name}")
                failed += 1

        if offset is None:
            break

    print(f"\n{'='*60}")
    print(f"Done. Patched: {patched} | Already correct: {skipped} | Could not extract: {failed}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
