"""
Tests for Congress API Source Adapter & Congress Data Provider.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from config import settings
from ingestion.sources.registry import SourceRegistry, register_all_sources
from ingestion.sources.congress import CongressSource
from providers.financial.congress_provider import CongressProvider


def test_congress_source_registration():
    register_all_sources()
    assert "congress" in SourceRegistry.available_sources()
    source = SourceRegistry.get_source("congress")
    assert isinstance(source, CongressSource)
    assert source.source_name == "congress"
    assert source.source_type == "CONGRESS_API"


def test_congress_source_unconfigured():
    source = CongressSource()
    with patch.object(settings, "CONGRESS_API_KEY", ""):
        assert not source.is_configured()


@pytest.mark.asyncio
async def test_congress_source_fetch_mocked():
    source = CongressSource()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "bills": [
            {
                "congress": 118,
                "type": "HR",
                "number": "5000",
                "title": "Foreign Investment Transparency Act",
                "originChamber": "House",
                "updateDate": "2025-05-10",
                "latestAction": {
                    "actionDate": "2025-05-10",
                    "text": "Referred to House Committee on Financial Services."
                },
                "url": "https://api.congress.gov/v3/bill/118/hr/5000"
            }
        ]
    }

    with patch.object(settings, "CONGRESS_API_KEY", "test_key"):
        assert source.is_configured()
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            items = await source.fetch()

            assert len(items) == 1
            item = items[0]
            assert "[HR 5000]" in item.title
            assert "Foreign Investment Transparency Act" in item.title
            assert item.external_id == "CONGRESS-118-HR-5000"
            assert item.metadata_json["originChamber"] == "House"


def test_congress_provider_status():
    provider = CongressProvider()
    with patch.object(settings, "CONGRESS_API_KEY", None):
        status = provider.get_status()
        assert status["status"] == "NOT_CONFIGURED"

    with patch.object(settings, "CONGRESS_API_KEY", "valid_token"):
        status = provider.get_status()
        assert status["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_congress_provider_get_bills_mocked():
    provider = CongressProvider()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "bills": [
            {
                "congress": 118,
                "type": "S",
                "number": "250",
                "title": "Capital Markets Safeguard Act",
                "originChamber": "Senate",
                "updateDate": "2025-06-01",
                "latestAction": {"text": "Passed Senate without amendment."}
            }
        ]
    }

    with patch.object(settings, "CONGRESS_API_KEY", "test_key"):
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            bills = await provider.get_bills(limit=10)

            assert len(bills) == 1
            bill = bills[0]
            assert bill["instrument_symbol"] == "CONGRESS:S250"
            assert bill["bill_type"] == "S"
            assert bill["bill_number"] == "250"
            assert bill["data_origin"] == "LEGISLATIVE_POLICY_DATA"
