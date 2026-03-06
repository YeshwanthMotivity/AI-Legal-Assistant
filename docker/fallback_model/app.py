from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI(title="Fallback LLM Service")


class Message(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[dict]
    usage: dict


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "fallback_model"}


@app.post("/v1/chat/completions", response_model=ChatCompletionResponse)
async def chat_completions(request: ChatCompletionRequest):
    """OpenAI-compatible chat completions endpoint (Fallback Model)."""
    # Stub implementation - returns dummy response
    # In production, this would load a smaller quantized model
    import time
    
    response = ChatCompletionResponse(
        id=f"chatcmpl-fallback-{int(time.time())}",
        created=int(time.time()),
        model=request.model,
        choices=[
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "This is a stub response from the fallback model. In production, a smaller quantized model would generate the actual response."
                },
                "finish_reason": "stop"
            }
        ],
        usage={
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150
        }
    )
    return response


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8004)

