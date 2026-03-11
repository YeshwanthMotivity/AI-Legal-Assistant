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
    Implements Hybrid Chunking:
    - If LAW: Structural Chunking by Article (to be implemented if structured_data is refined for laws).
    - If JUDGMENT: Semantic Chunking by Legal Sections (Facts, Reasoning, etc.).
    - Fallback: Sliding window within large sections.
    """
    all_chunks = []
    
    # Sections to process for Judgments
    sections = ["facts", "arguments", "reasoning", "conclusion"]
    
    for section_name in sections:
        content = structured_data.get(section_name, "")
        if not content:
            continue
            
        # Apply sliding window within the section if it's large
        section_chunks = chunk_text(content, chunk_size=chunk_size, overlap=overlap)
        
        for i, chunk_txt in enumerate(section_chunks):
            all_chunks.append({
                "text": chunk_txt,
                "metadata": {
                    "section_type": section_name,
                    "chunk_index": i,
                    "total_section_chunks": len(section_chunks),
                    "is_law": doc_type.lower() == "law"
                }
            })
            
    # If no section-based chunks were created (e.g. parser failed or empty sections), fallback to global chunking
    if not all_chunks and "facts" in structured_data:
         # structured_data['facts'] often contains the fallback text
         content = structured_data['facts']
         global_chunks = chunk_text(content, chunk_size=chunk_size, overlap=overlap)
         for i, chunk_txt in enumerate(global_chunks):
             all_chunks.append({
                 "text": chunk_txt,
                 "metadata": {
                     "section_type": "general",
                     "chunk_index": i,
                     "is_law": doc_type.lower() == "law"
                 }
             })
             
    return all_chunks
