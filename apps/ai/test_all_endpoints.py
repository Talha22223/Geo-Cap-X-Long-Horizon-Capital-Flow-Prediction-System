import asyncio
import os
import sys
from httpx import AsyncClient, ASGITransport

ai_root = os.path.dirname(os.path.abspath(__file__))
if ai_root not in sys.path:
    sys.path.insert(0, ai_root)

from main import app

async def test_endpoints():
    transport = ASGITransport(app=app)
    endpoints = [
        "/health",
        "/api/v1/dashboard/summary",
        "/api/v1/events",
        "/api/v1/predictions",
        "/api/v1/forecast/by-horizon",
        "/api/v1/network/statistics",
        "/api/v1/event-chain",
        "/api/v1/explain/freshness",
        "/api/v1/market/observations",
        "/api/v1/market/signals",
        "/api/v1/countries",
        "/api/v1/heatmap",
        "/api/v1/sectors",
        "/api/v1/regions",
        "/api/v1/technical/AAPL",
        "/api/v1/predictions/backtest",
    ]

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("Testing all AI endpoints...")
        for ep in endpoints:
            try:
                res = await client.get(ep)
                print(f"[{res.status_code}] {ep} -> {len(res.content)} bytes")
                if res.status_code >= 400:
                    print(f"  ERROR BODY: {res.text}")
            except Exception as e:
                print(f"[FAILED] {ep}: {e}")

if __name__ == "__main__":
    asyncio.run(test_endpoints())
