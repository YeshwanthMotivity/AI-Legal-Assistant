FROM mirror.gcr.io/library/python:3.11-slim

WORKDIR /app

# Install PyTorch CPU-only first, then sentence-transformers
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install \
    torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install \
    fastapi uvicorn pydantic sentence-transformers

# BGE Reranker will be automatically downloaded by the sentence-transformers library at runtime.
COPY app.py /app/app.py

EXPOSE 8002

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1"]


