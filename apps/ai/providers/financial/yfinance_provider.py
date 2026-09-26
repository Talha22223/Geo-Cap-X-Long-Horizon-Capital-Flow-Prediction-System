"""
Real Yahoo Finance Data Provider Adapter.
Fetches real market proxy observations (price, volume, bond yields, FX) from Yahoo Finance.
Strictly avoids synthetic or random fallbacks.
"""
from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone
from config import settings

logger = logging.getLogger(__name__)


class RealYahooFinanceProvider:
    """
    Real Market Data Provider fetching ticker observations from Yahoo Finance.
    """
    provider_name: str = "YAHOO_FINANCE"
    category: str = "MARKET_PROXY_DATA"

    async def get_observations(self, symbol: str, timeframe: str = "1D", limit: int = 100) -> list[dict]:
        """
        Fetch real OHLCV market observations for symbol.
        Returns empty list if ticker unavailable or error occurs — no artificial data generation.
        """
        try:
            import yfinance as yf
        except ImportError:
            logger.error("yfinance library is not installed.")
            return []

        # Ticker mapping
        s = symbol.upper().strip()
        yf_symbol = s
        if s in ("EUR/USD", "EURUSD"):
            yf_symbol = "EURUSD=X"
        elif s in ("GBP/USD", "GBPUSD"):
            yf_symbol = "GBPUSD=X"
        elif s in ("USD/JPY", "USDJPY"):
            yf_symbol = "USDJPY=X"
        elif s in ("US10Y", "TNX", "^TNX"):
            yf_symbol = "^TNX"
        elif s in ("DXY", "DX-Y.NYB"):
            yf_symbol = "DX-Y.NYB"
        elif s in ("VIX", "^VIX"):
            yf_symbol = "^VIX"
        elif s in ("GOLD", "XAUUSD", "GC=F"):
            yf_symbol = "GC=F"
        elif s in ("OIL", "WTI", "CL=F"):
            yf_symbol = "CL=F"

        period = "1y"
        interval = "1d"
        tf = timeframe.upper()
        if tf == "1H":
            interval = "1h"
            period = "1mo"
        elif tf == "1W":
            interval = "1wk"
            period = "2y"

        try:
            def _fetch():
                ticker = yf.Ticker(yf_symbol)
                return ticker.history(period=period, interval=interval)

            df = await asyncio.to_thread(_fetch)

            if df is None or df.empty:
                logger.warning(f"Yahoo Finance returned NO data for {symbol} ({yf_symbol})")
                return []

            df = df.tail(limit)

            asset_class = "EQUITY"
            if "=X" in yf_symbol or "USD" in s:
                asset_class = "FX"
            elif "^" in yf_symbol or "TNX" in s or "VIX" in s:
                asset_class = "BOND" if "TNX" in s else "MACRO"
            elif "=F" in yf_symbol or "GC=" in yf_symbol or "CL=" in yf_symbol:
                asset_class = "COMMODITY"
            elif s in ("SPY", "QQQ", "IWM", "XLF", "XLK", "XLE", "TLT", "GLD"):
                asset_class = "ETF"

            observations = []
            for idx, row in df.iterrows():
                dt = idx.to_pydatetime() if hasattr(idx, "to_pydatetime") else idx
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)

                observations.append({
                    "instrument_symbol": symbol,
                    "asset_class": asset_class,
                    "market": "GLOBAL_MARKET",
                    "timestamp": dt,
                    "open_price": float(row["Open"]) if "Open" in row and not row.isna()["Open"] else None,
                    "high_price": float(row["High"]) if "High" in row and not row.isna()["High"] else None,
                    "low_price": float(row["Low"]) if "Low" in row and not row.isna()["Low"] else None,
                    "close_price": float(row["Close"]) if "Close" in row and not row.isna()["Close"] else None,
                    "volume": float(row["Volume"]) if "Volume" in row and not row.isna()["Volume"] else None,
                    "currency": "USD",
                    "source": "YAHOO_FINANCE",
                    "source_identifier": yf_symbol,
                    "ingestion_timestamp": datetime.now(timezone.utc),
                    "data_quality": 1.0,
                    "data_origin": "MARKET_PROXY_DATA",
                })

            return observations

        except Exception as e:
            logger.error(f"Error fetching Yahoo Finance data for {symbol}: {e}")
            return []
