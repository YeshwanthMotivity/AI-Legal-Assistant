FROM python:3.11

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn pydantic openai pydantic-settings

COPY app.py /app/app.py

EXPOSE 8003

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8003"]

