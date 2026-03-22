from typing import List, Dict, Any

def chunk_text(text: str, chunk_size: int = 700, overlap: int = 100) -> List[str]:
    """
    Standard sliding window chunking (used as fallback).
    """
    tokens = text.split()
    if not tokens:
        return []

    chunks: List[str] = []
    start = 0
    step = max(chunk_size - overlap, 1)

    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunks.append(" ".join(tokens[start:end]))
        if end == len(tokens):
            break
        start += step

    return chunks

def hybrid_chunk_legal_doc(
    structured_data: Dict[str, Any],
    doc_type: str,
    chunk_size: int = 700,
    overlap: int = 100
) -> List[Dict[str, Any]]:
    """
    Hybrid chunking:
    - LAW documents: chunk by article sections + full text fallback
    - JUDGMENT documents: chunk by legal sections (facts, reasoning, etc.)
    """
    all_chunks = []
    is_law = doc_type.lower() in ("law", "LAW")
    llm_meta = structured_data.get("llm_metadata", {}) or {}

    def base_metadata(section_name: str, i: int, total: int) -> dict:
        m = {
            "section_type": section_name,
            "chunk_index": i,
            "total_section_chunks": total,
            "is_law": is_law,
        }
        if llm_meta:
            m["case_id_extracted"]  = llm_meta.get("case_id", "")
            m["case_title"]         = llm_meta.get("case_title", "")
            m["judgment_date"]      = llm_meta.get("judgment_date", "")
            m["outcome"]            = llm_meta.get("outcome", "")
            m["laws_cited"]         = str(llm_meta.get("laws_cited", []))
            m["judge"]              = llm_meta.get("judge", "")
            m["facts_summary"]      = (llm_meta.get("facts_summary") or "")[:300]
            # Law-specific fields
            m["law_name"]           = llm_meta.get("law_name", "")
            m["jurisdiction"]       = llm_meta.get("jurisdiction", "")
            m["key_articles"]       = str(llm_meta.get("key_articles", []))
        return m

    # ── LAW DOCUMENTS ────────────────────────────────────────────────────────
    if is_law:
        # Try law-specific sections first
        law_sections = ["articles", "key_articles", "provisions", "summary",
                        "definitions", "general_provisions", "penalties"]
        found_any = False

        for section_name in law_sections:
            content = structured_data.get(section_name, "")
            if not content:
                continue
            found_any = True
            section_chunks = chunk_text(str(content), chunk_size=chunk_size, overlap=overlap)
            for i, chunk_txt in enumerate(section_chunks):
                all_chunks.append({
                    "text": chunk_txt,
                    "metadata": base_metadata(section_name, i, len(section_chunks))
                })

        # Fallback: use raw text or facts field for laws
        if not found_any:
            raw_text = (
                structured_data.get("raw_text") or
                structured_data.get("facts") or
                structured_data.get("full_text") or
                ""
            )
            if raw_text:
                fallback_chunks = chunk_text(raw_text, chunk_size=chunk_size, overlap=overlap)
                for i, chunk_txt in enumerate(fallback_chunks):
                    all_chunks.append({
                        "text": chunk_txt,
                        "metadata": base_metadata("full_text", i, len(fallback_chunks))
                    })

        return all_chunks

    # ── JUDGMENT DOCUMENTS ───────────────────────────────────────────────────
    judgment_sections = ["facts", "arguments", "reasoning", "conclusion"]

    for section_name in judgment_sections:
        content = structured_data.get(section_name, "")
        if not content:
            continue
        section_chunks = chunk_text(content, chunk_size=chunk_size, overlap=overlap)
        for i, chunk_txt in enumerate(section_chunks):
            all_chunks.append({
                "text": chunk_txt,
                "metadata": base_metadata(section_name, i, len(section_chunks))
            })

    # Fallback for judgments too
    if not all_chunks:
        raw_text = (
            structured_data.get("raw_text") or
            structured_data.get("facts") or
            ""
        )
        if raw_text:
            fallback_chunks = chunk_text(raw_text, chunk_size=chunk_size, overlap=overlap)
            for i, chunk_txt in enumerate(fallback_chunks):
                all_chunks.append({
                    "text": chunk_txt,
                    "metadata": base_metadata("general", i, len(fallback_chunks))
                })

    return all_chunks
