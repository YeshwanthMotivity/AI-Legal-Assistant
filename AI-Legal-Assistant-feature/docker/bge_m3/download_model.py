
from sentence_transformers import SentenceTransformer

model_name = "BAAI/bge-m3"
print(f"Downloading model: {model_name}")
SentenceTransformer(model_name)
print("Model downloaded successfully.")
