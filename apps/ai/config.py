"""
============================================================================
AI ENGINE CONFIGURATION & SETTINGS (Pydantic BaseSettings)
============================================================================
WHAT:
  Pydantic V2 configuration module loading and validating environment variables:
  - Database: Async PostgreSQL URL (`postgresql+asyncpg://...`)
  - Redis: Cache and background worker queue configuration
  - NLP Provider: Selection ('spacy', 'finbert', 'openai', 'gemini', 'custom', 'stub')
  - Financial Data Keys: Yahoo Finance, FRED, World Bank, Congress, NewsAPI, Alpha Vantage
  - ML & Algorithmic Parameters: Centrality thresholds, time horizons, SHAP samples

WHY:
  Provides strict type validation, automatic .env file discovery, and dynamic
  URL conversion (converting sync postgres:// to asyncpg drivers).
============================================================================
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from typing import Literal

AI_DIR = Path(__file__).resolve().parent
ENV_FILE = AI_DIR / ".env"


class Settings(BaseSettings):
    # ── Service Identity ────────────────────────────────────────────────────
    PROJECT_NAME: str = "GeoCap-X AI Engine"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False

    # ── Database ────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/geocapx"

    # ── Redis ───────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/1"
    REDIS_CACHE_TTL: int = 300           # seconds — SNA result cache
    JOB_MAX_RETRIES: int = 3
    JOB_RETRY_DELAY: int = 5            # seconds

    # ── NLP Provider ────────────────────────────────────────────────────────
    NLP_PROVIDER: Literal["spacy", "finbert", "openai", "gemini", "custom", "stub"] = "spacy"
    SPACY_MODEL: str = "en_core_web_sm"

    # API keys — optional, used by interface-ready adapters
    OPENAI_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    NEWSAPI_KEY: str | None = None
    FRED_API_KEY: str | None = None
    CONGRESS_API_KEY: str | None = None
    WORLD_BANK_API_KEY: str | None = None
    TRADING_ECONOMICS_API_KEY: str | None = None

    # ── Ingestion ───────────────────────────────────────────────────────────
    INGESTION_BATCH_SIZE: int = 50
    DEDUP_TITLE_THRESHOLD: float = 0.85
    DEDUP_ENTITY_OVERLAP_THRESHOLD: float = 0.80
    DEDUP_COMPOSITE_THRESHOLD: float = 0.75
    DEDUP_TIME_WINDOW_MINUTES: int = 30
    DEDUP_ENTITY_WINDOW_HOURS: int = 24
    MIN_TEXT_LENGTH: int = 50           # characters — below this, event is discarded

    # ── Capital Flow ─────────────────────────────────────────────────────────
    FLOW_CONFIDENCE_EXTRACTION_WEIGHT: float = 0.20
    FLOW_CONFIDENCE_CLASSIFICATION_WEIGHT: float = 0.30
    FLOW_CONFIDENCE_PREDICTION_WEIGHT: float = 0.50
    FLOW_HORIZON_DECAY_6M: float = 1.00
    FLOW_HORIZON_DECAY_1Y: float = 0.90
    FLOW_HORIZON_DECAY_3Y: float = 0.75
    FLOW_HORIZON_DECAY_5Y: float = 0.60

    # ── SNA ──────────────────────────────────────────────────────────────────
    PAGERANK_ALPHA: float = 0.85
    INFLUENCE_WEIGHT_PAGERANK: float = 0.40
    INFLUENCE_WEIGHT_BETWEENNESS: float = 0.30
    INFLUENCE_WEIGHT_EIGENVECTOR: float = 0.30

    # ── Event Chain ──────────────────────────────────────────────────────────
    CHAIN_TEMPORAL_WINDOW_DAYS: int = 90
    CHAIN_CONFIDENCE_DECAY: float = 0.85
    CHAIN_ENTITY_LINK_THRESHOLD: float = 0.50  # shared entity weight threshold
    
    # ── Relationship Engine ──────────────────────────────────────────────────
    RELATIONSHIP_THRESHOLD_WEAK: float = 0.40
    RELATIONSHIP_THRESHOLD_STRONG: float = 0.70
    RELATIONSHIP_WEIGHT_ENTITY: float = 0.30
    RELATIONSHIP_WEIGHT_TEMPORAL: float = 0.15
    RELATIONSHIP_WEIGHT_GEOGRAPHIC: float = 0.10
    RELATIONSHIP_WEIGHT_SECTOR: float = 0.15
    RELATIONSHIP_WEIGHT_SEMANTIC: float = 0.10
    RELATIONSHIP_WEIGHT_TRANSMISSION: float = 0.20
    RELATIONSHIP_TEMPORAL_WINDOW_DAYS_DEFAULT: int = 90
    RELATIONSHIP_TEMPORAL_WINDOW_DAYS_TRANSMISSION: int = 14

    # ── Technical Analysis ────────────────────────────────────────────────────
    TA_CACHE_TTL_INTRADAY: int = 300     # 5 min for 1H/4H data
    TA_CACHE_TTL_DAILY: int = 1800       # 30 min for 1D+ data
    TA_DEFAULT_SYMBOLS: list = ["AAPL", "MSFT", "GOOGL", "JPM", "GLD", "TLT"]
    TA_SIMULATED_DATA_SEED: int = 42     # Deterministic data for dev/test

    @model_validator(mode="after")
    def validate_database_url_and_port(self):
        if self.DATABASE_URL.startswith("postgresql://"):
            self.DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        if self.PORT == 3001:
            self.PORT = 8000
        return self

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

