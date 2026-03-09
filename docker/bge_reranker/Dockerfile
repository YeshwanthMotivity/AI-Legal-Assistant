FROM python:3.11-slim

WORKDIR /app

# Install PyTorch CPU-only first, then sentence-transformers
RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir \
    fastapi uvicorn pydantic sentence-transformers

# Pre-download the reranker model into the image layer
ARG RERANKER_MODEL=BAAI/bge-reranker-v2-m3
RUN python -c "from sentence_transformers import CrossEncoder; CrossEncoder('${RERANKER_MODEL}', max_length=512)"

COPY app.py /app/app.py

ENV RERANKER_MODEL=${RERANKER_MODEL}

EXPOSE 8002

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1"]


