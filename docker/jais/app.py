import json
import os
import time
import asyncio
from typing import List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

from contextlib import asynccontextmanager

OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://ollama:11434').rstrip('/')
OLLAMA_MODEL_PRIMARY = os.getenv('OLLAMA_MODEL_PRIMARY', 'jwnder/jais-adaptive:7b')
OLLAMA_TIMEOUT_SECONDS = int(os.getenv('OLLAMA_TIMEOUT_SECONDS', '600'))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-pull model in background to avoid blocking server startup
    async def _pull():
        async with httpx.AsyncClient(timeout=3600) as client:
            try:
                print(f"Auto-pulling model {OLLAMA_MODEL_PRIMARY} from {OLLAMA_URL} in background...")
                response = await client.post(
                    f"{OLLAMA_URL}/api/pull",
                    json={"name": OLLAMA_MODEL_PRIMARY}
                )
                response.raise_for_status()
                print(f"Successfully ensured {OLLAMA_MODEL_PRIMARY} is present.")
            except Exception as e:
                print(f"Warning: Failed to auto-pull model: {e}")
    
    asyncio.create_task(_pull())
    yield

app = FastAPI(title='JAIS LLM Service', lifespan=lifespan)

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
    object: str = 'chat.completion'
    created: int
    model: str
    choices: List[dict]
    usage: dict


@app.get('/health')
async def health_check():
    tags_url = f'{OLLAMA_URL}/api/tags'
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(tags_url)
            response.raise_for_status()
        return {'status': 'healthy', 'service': 'jais', 'provider': 'ollama', 'model': OLLAMA_MODEL_PRIMARY}
    except Exception as e:
        return {'status': 'degraded', 'service': 'jais', 'error': str(e)}


async def _ollama_chat(messages: List[dict], model: str, temperature: float) -> str:
    payload = {
        'model': model,
        'messages': messages,
        'stream': False,
        'options': {
            'temperature': temperature,
        },
    }
    
    async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f'{OLLAMA_URL}/api/chat',
            json=payload
        )
        response.raise_for_status()
        data = response.json()
        
    message = data.get('message', {})
    return str(message.get('content', '')).strip()


@app.post('/v1/chat/completions', response_model=ChatCompletionResponse)
async def chat_completions(request: ChatCompletionRequest):
    model = OLLAMA_MODEL_PRIMARY
    try:
        content = await _ollama_chat([msg.model_dump() for msg in request.messages], model, float(request.temperature or 0.1))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f'Ollama HTTP error: {exc.response.status_code} {exc.response.text}')
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Ollama request failed: {exc}')

    if not content:
        raise HTTPException(status_code=502, detail='Ollama returned empty content')

    # Rough token estimation
    prompt_text = '\n'.join(msg.content for msg in request.messages)
    prompt_tokens = max(1, len(prompt_text) // 4)
    completion_tokens = max(1, len(content) // 4)

    return ChatCompletionResponse(
        id=f'chatcmpl-jais-{int(time.time())}',
        created=int(time.time()),
        model=model,
        choices=[
            {
                'index': 0,
                'message': {'role': 'assistant', 'content': content},
                'finish_reason': 'stop',
            }
        ],
        usage={
            'prompt_tokens': prompt_tokens,
            'completion_tokens': completion_tokens,
            'total_tokens': prompt_tokens + completion_tokens,
        },
    )


if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8003)
