"""
Market data provider abstractions and implementations (Simulated and Yahoo Finance).
"""
from __future__ import annotations
import abc
import random
import time
import asyncio
from datetime import datetime, timedelta
import logging
from config import settings

logger = logging.getLogger(__name__)


class BaseMarketDataProvider(abc.ABC):
    """Abstract interface for fetching historical OHLCV data."""

    @abc.abstractmethod
    async def get_ohlcv(self, symbol: str, timeframe: str, limit: int = 200) -> list[dict]:
        """
        Fetch OHLCV data.
        Returns a list of dicts:
        [
          {
            "timestamp": datetime,
            "open": float,
            "high": float,
            "low": float,
            "close": float,
            "volume": float
          },
          ...
        ]
        """
        pass


class SimulatedOHLCVProvider(BaseMarketDataProvider):
    """Generates stable, deterministic simulated OHLCV data for testing."""

    async def get_ohlcv(self, symbol: str, timeframe: str, limit: int = 200) -> list[dict]:
        # Generate seed from symbol name to keep it deterministic for a given symbol
        seed_value = sum(ord(c) for c in symbol) + settings.TA_SIMULATED_DATA_SEED
        rng = random.Random(seed_value)

        # Map timeframe to timedelta per bar
        tf_map = {
            "1H": timedelta(hours=1),
            "4H": timedelta(hours=4),
            "1D": timedelta(days=1),
            "1W": timedelta(weeks=1),
            "1M": timedelta(days=30),
            "6M": timedelta(days=180),
            "1Y": timedelta(days=365),
        }
        bar_delta = tf_map.get(timeframe.upper(), timedelta(days=1))
        
        # Start price based on symbol code
        price = 50.0 + (seed_value % 100)
        vol_base = 1000000.0 + (seed_value % 5000000)
        
        end_time = datetime.now()
        start_time = end_time - (bar_delta * limit)
        
        ohlcv = []
        for i in range(limit):
            current_time = start_time + (bar_delta * i)
            
            # Simple random walk
            pct_change = rng.uniform(-0.02, 0.02)
            open_price = price
            close_price = price * (1.0 + pct_change)
            
            # Ensure price remains positive
            if close_price <= 0.1:
                close_price = 0.1
                
            high_price = max(open_price, close_price) * rng.uniform(1.0, 1.015)
            low_price = min(open_price, close_price) * rng.uniform(0.985, 1.0)
            
            volume = vol_base * rng.uniform(0.5, 1.5)
            
            ohlcv.append({
                "timestamp": current_time,
                "open": round(open_price, 2),
                "high": round(high_price, 2),
                "low": round(low_price, 2),
                "close": round(close_price, 2),
                "volume": round(volume, 0)
            })
            
            price = close_price

        return ohlcv


class YahooFinanceMarketDataProvider(BaseMarketDataProvider):
    """Fetches real market data using Yahoo Finance."""

    async def get_ohlcv(self, symbol: str, timeframe: str, limit: int = 200) -> list[dict]:
        try:
            import yfinance as yf
        except ImportError:
            logger.error("yfinance is not installed.")
            return []

        # Map timeframes to yfinance period & interval
        # limit specifies approx how many bars we want, so adjust period
        interval = "1d"
        period = "1y"
        
        tf = timeframe.upper()
        if tf == "1H":
            interval = "1h"
            period = "2y" if limit > 100 else "1mo"
        elif tf == "4H":
            # yfinance doesn't natively support 4H. We pull 1H and resample,
            # or pull 1h and just use that as a proxy/resample.
            interval = "1h"
            period = "2y" if limit > 100 else "1mo"
        elif tf == "1D":
            interval = "1d"
            period = "2y" if limit > 200 else "1y"
        elif tf == "1W":
            interval = "1wk"
            period = "5y"
        elif tf == "1M":
            interval = "1mo"
            period = "10y"
        elif tf == "6M":
            interval = "1mo"  # Will aggregate monthly data
            period = "20y"
        elif tf == "1Y":
            interval = "1mo"
            period = "max"

        # Map symbol to standard yfinance symbol
        s = symbol.upper().strip().replace("-", "/").replace("_", "/")
        yf_symbol = s
        if s in ("EUR/USD", "EURUSD"):
            yf_symbol = "EURUSD=X"
        elif s in ("GBP/USD", "GBPUSD"):
            yf_symbol = "GBPUSD=X"
        elif s in ("USD/JPY", "USDJPY"):
            yf_symbol = "USDJPY=X"
        elif s in ("AUD/USD", "AUDUSD"):
            yf_symbol = "AUDUSD=X"
        elif s in ("USD/CAD", "USDCAD"):
            yf_symbol = "USDCAD=X"
        elif s in ("XAU/USD", "XAUUSD"):
            yf_symbol = "GC=F"
        elif s in ("BTC/USD", "BTCUSD"):
            yf_symbol = "BTC-USD"
        elif "/" in s:
            parts = s.split("/")
            if len(parts) == 2:
                if parts[1] == "USD" and parts[0] not in ("BTC", "ETH", "SOL", "ADA"):
                    yf_symbol = f"{parts[0]}USD=X"
                elif parts[1] == "USD":
                    yf_symbol = f"{parts[0]}-USD"
                else:
                    yf_symbol = f"{parts[0]}{parts[1]}=X"

        logger.info(f"Yahoo Finance: Mapping symbol '{symbol}' to Yahoo ticker '{yf_symbol}'")

        try:
            # yfinance calls are blocking, run in executor
            def fetch_data():
                ticker = yf.Ticker(yf_symbol)
                df = ticker.history(period=period, interval=interval)
                return df

            df = await asyncio.to_thread(fetch_data)

            if df.empty:
                logger.warning(f"No yfinance data found for {symbol}, falling back to simulated data.")
                return await SimulatedOHLCVProvider().get_ohlcv(symbol, timeframe, limit)

            # E.g. resample to 4H if requested
            if tf == "4H":
                df = df.resample("4h").agg({
                    "Open": "first",
                    "High": "max",
                    "Low": "min",
                    "Close": "last",
                    "Volume": "sum"
                }).dropna()

            # Ensure we get the tail up to the limit
            df = df.tail(limit)

            ohlcv = []
            for idx, row in df.iterrows():
                ohlcv.append({
                    "timestamp": idx.to_pydatetime() if hasattr(idx, "to_pydatetime") else idx,
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": float(row["Volume"])
                })

            return ohlcv
        except Exception as e:
            logger.exception(f"Error fetching yfinance data for {symbol}: {e}.")
            return []


class MarketDataCache:
    """In-memory cache with TTL for market data."""

    def __init__(self) -> None:
        self._cache: dict[str, tuple[float, list[dict]]] = {}

    def _get_key(self, symbol: str, timeframe: str, limit: int) -> str:
        return f"{symbol.upper()}:{timeframe.upper()}:{limit}"

    def get(self, symbol: str, timeframe: str, limit: int) -> list[dict] | None:
        key = self._get_key(symbol, timeframe, limit)
        if key in self._cache:
            timestamp, data = self._cache[key]
            # Check TTL
            is_intraday = timeframe.upper() in ("1H", "4H")
            ttl = settings.TA_CACHE_TTL_INTRADAY if is_intraday else settings.TA_CACHE_TTL_DAILY
            if time.time() - timestamp < ttl:
                return data
            else:
                del self._cache[key]
        return None

    def set(self, symbol: str, timeframe: str, limit: int, data: list[dict]) -> None:
        key = self._get_key(symbol, timeframe, limit)
        self._cache[key] = (time.time(), data)
