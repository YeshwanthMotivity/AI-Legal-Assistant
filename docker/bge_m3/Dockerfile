FROM python:3.11-slim

WORKDIR /app

# Install PyTorch CPU-only first to keep image size down, then sentence-transformers
RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir \
    fastapi uvicorn pydantic sentence-transformers

# Pre-download the model into the image layer so startup is fast
ARG MODEL_NAME=BAAI/bge-m3
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('${MODEL_NAME}')"

COPY app.py /app/app.py

ENV MODEL_NAME=${MODEL_NAME}

EXPOSE 8001

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]

