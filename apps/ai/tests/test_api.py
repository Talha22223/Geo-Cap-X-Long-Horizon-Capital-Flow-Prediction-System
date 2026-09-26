"""
Integration tests for FastAPI REST API endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_events_extract(client: AsyncClient):
    payload = {"text": "Federal Reserve hikes benchmark rates to combat inflation today."}
    res = await client.post("/api/v1/events/extract", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "keywords" in data["data"]


@pytest.mark.asyncio
async def test_events_classify(client: AsyncClient):
    payload = {"text": "US chip bans against Chinese tech firms shake markets."}
    res = await client.post("/api/v1/events/classify", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["primary_category"] in ("TRADE", "TECHNOLOGY", "GEOPOLITICAL")


@pytest.mark.asyncio
async def test_events_ingest_trigger(client: AsyncClient):
    payload = {"source": "seed"}
    res = await client.post("/api/v1/events/ingest", json=payload)
    assert res.status_code == 202
    data = res.json()
    assert data["success"] is True
    assert "job_id" in data["data"]


@pytest.mark.asyncio
async def test_predictions_query(client: AsyncClient):
    res = await client.get("/api/v1/predictions")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "items" in data["data"]
