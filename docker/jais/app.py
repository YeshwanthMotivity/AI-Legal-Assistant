import json
import os
import time
import urllib.error
import urllib.request
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        print(f"Auto-pulling model {OLLAMA_MODEL_PRIMARY} from {OLLAMA_URL}")
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/pull",
            data=json.dumps({"name": OLLAMA_MODEL_PRIMARY}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        # Timeout is set high because downloading a multibyte model takes time
        with urllib.request.urlopen(req, timeout=600):
            pass
        print(f"Successfully ensured {OLLAMA_MODEL_PRIMARY} is present.")
    except Exception as e:
        print(f"Warning: Failed to auto-pull model: {e}")
    yield

app = FastAPI(title='JAIS LLM Service', lifespan=lifespan)

OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://ollama:11434').rstrip('/')
OLLAMA_MODEL_PRIMARY = os.getenv('OLLAMA_MODEL_PRIMARY', 'qwen2.5:7b-instruct')
OLLAMA_TIMEOUT_SECONDS = int(os.getenv('OLLAMA_TIMEOUT_SECONDS', '60'))


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
        request = urllib.request.Request(tags_url, method='GET')
        with urllib.request.urlopen(request, timeout=5) as response:
            response.read()
        return {'status': 'healthy', 'service': 'jais', 'provider': 'ollama'}
    except Exception:
        return {'status': 'degraded', 'service': 'jais', 'provider': 'ollama'}


def _ollama_chat(messages: List[dict], model: str, temperature: float) -> str:
    payload = {
        'model': model,
        'messages': messages,
        'stream': False,
        'options': {
            'temperature': temperature,
        },
    }
    body = json.dumps(payload).encode('utf-8')
    request = urllib.request.Request(
        f'{OLLAMA_URL}/api/chat',
        data=body,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(request, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
        data = json.loads(response.read().decode('utf-8'))
    message = data.get('message', {})
    return str(message.get('content', '')).strip()


@app.post('/v1/chat/completions', response_model=ChatCompletionResponse)
async def chat_completions(request: ChatCompletionRequest):
    model = OLLAMA_MODEL_PRIMARY
    try:
        content = _ollama_chat([msg.model_dump() for msg in request.messages], model, float(request.temperature or 0.1))
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode('utf-8', errors='ignore') if exc.fp else ''
        raise HTTPException(status_code=502, detail=f'Ollama HTTP error: {exc.code} {error_body}')
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Ollama request failed: {exc}')

    if not content:
        raise HTTPException(status_code=502, detail='Ollama returned empty content')

    prompt_text = '\n'.join(msg.content for msg in request.messages)
    prompt_tokens = max(1, len(prompt_text) // 4)
    completion_tokens = max(1, len(content) // 4)

    return ChatCompletionResponse(
        id=f'chatcmpl-{int(time.time())}',
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
