FROM mirror.gcr.io/library/python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn pydantic openai pydantic-settings httpx

COPY app.py /app/app.py

EXPOSE 8004

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8004"]

