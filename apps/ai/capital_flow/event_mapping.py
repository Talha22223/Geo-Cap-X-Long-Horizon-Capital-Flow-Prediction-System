"""
Event-to-Asset Mapping Module.
Maps canonical events to observable market instruments through transparent domain rules.
"""
from __future__ import annotations
import logging
from models.event import ExtractedEvent

logger = logging.getLogger(__name__)

# Sector to ETF/Instrument Mapping
SECTOR_MAP = {
    "FINANCIAL SERVICES": {"instrument": "XLF", "asset_class": "ETF", "name": "Financial Select Sector SPDR"},
    "FINANCIALS": {"instrument": "XLF", "asset_class": "ETF", "name": "Financial Select Sector SPDR"},
    "TECHNOLOGY": {"instrument": "XLK", "asset_class": "ETF", "name": "Technology Select Sector SPDR"},
    "ENERGY": {"instrument": "XLE", "asset_class": "ETF", "name": "Energy Select Sector SPDR"},
    "HEALTHCARE": {"instrument": "XLV", "asset_class": "ETF", "name": "Health Care Select Sector SPDR"},
    "INDUSTRIALS": {"instrument": "XLI", "asset_class": "ETF", "name": "Industrial Select Sector SPDR"},
    "CONSUMER DISCRETIONARY": {"instrument": "XLY", "asset_class": "ETF", "name": "Consumer Discretionary SPDR"},
}

# Category to Macro Asset Mapping
CATEGORY_MAP = {
    "MONETARY_POLICY": {"instrument": "US10Y", "asset_class": "BOND", "name": "US 10-Year Treasury Yield"},
    "INTEREST_RATES": {"instrument": "US10Y", "asset_class": "BOND", "name": "US 10-Year Treasury Yield"},
    "INFLATION": {"instrument": "GLD", "asset_class": "ETF", "name": "SPDR Gold Shares"},
    "GEOPOLITICAL": {"instrument": "CL=F", "asset_class": "COMMODITY", "name": "Crude Oil Futures"},
    "TRADE": {"instrument": "EURUSD=X", "asset_class": "FX", "name": "EUR/USD Exchange Rate"},
}


class EventAssetMapper:
    """
    Transparent Event-to-Asset Mapper.
    Chain: Event -> Sector/Category/Country -> Asset Class -> Instrument.
    """

    @staticmethod
    def map_event_to_instruments(event: ExtractedEvent) -> list[dict]:
        """
        Derive observable target instruments for a given event.
        Returns empty list / UNKNOWN if unmappable.
        """
        mappings = []

        primary_country = event.countries[0] if event.countries else None

        # 1. Map by Sector
        if event.sectors:
            for s in event.sectors:
                sec_upper = s.upper().strip()
                if sec_upper in SECTOR_MAP:
                    mapped = SECTOR_MAP[sec_upper]
                    mappings.append({
                        "event_id": event.id,
                        "instrument_symbol": mapped["instrument"],
                        "asset_class": mapped["asset_class"],
                        "sector": s,
                        "country": primary_country,
                        "mapping_confidence": 0.90,
                        "mapping_rule": f"SECTOR_TO_{mapped['asset_class']}"
                    })

        # 2. Map by Category
        if event.category:
            cat_upper = event.category.upper().strip()
            if cat_upper in CATEGORY_MAP:
                mapped = CATEGORY_MAP[cat_upper]
                # Avoid duplicate instruments
                if not any(m["instrument_symbol"] == mapped["instrument"] for m in mappings):
                    mappings.append({
                        "event_id": event.id,
                        "instrument_symbol": mapped["instrument"],
                        "asset_class": mapped["asset_class"],
                        "sector": event.sectors[0] if event.sectors else None,
                        "country": primary_country,
                        "mapping_confidence": 0.85,
                        "mapping_rule": f"CATEGORY_TO_{mapped['asset_class']}"
                    })

        # 3. Default SPY map for broader US macro events if unmapped
        if not mappings and primary_country and primary_country.upper() in ("UNITED STATES", "US"):
            mappings.append({
                "event_id": event.id,
                "instrument_symbol": "SPY",
                "asset_class": "ETF",
                "sector": event.sectors[0] if event.sectors else "BROAD_MARKET",
                "country": primary_country,
                "mapping_confidence": 0.70,
                "mapping_rule": "COUNTRY_BROAD_EQUITY"
            })

        if not mappings:
            logger.info(f"Event {event.id} ({event.title}) could not be mapped: UNKNOWN / UNMAPPED")

        return mappings
