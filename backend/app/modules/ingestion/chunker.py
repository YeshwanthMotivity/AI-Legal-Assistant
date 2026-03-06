def chunk_text(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    tokens = text.split()
    if not tokens:
        return []

    chunks: list[str] = []
    start = 0
    step = max(chunk_size - overlap, 1)

    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunks.append(" ".join(tokens[start:end]))
        if end == len(tokens):
            break
        start += step

    return chunks
