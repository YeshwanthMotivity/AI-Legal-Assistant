import httpx
import asyncio

async def test_dim():
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post('http://localhost:8001/embed', json={'texts': ['test']}, timeout=10.0)
            data = resp.json()
            emb = data['embeddings'][0] if isinstance(data, dict) else data[0]
            print(f"Dimension: {len(emb)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_dim())
