
from sentence_transformers import CrossEncoder

model_name = "BAAI/bge-reranker-v2-m3"
print(f"Downloading model: {model_name}")
CrossEncoder(model_name)
print("Model downloaded successfully.")
