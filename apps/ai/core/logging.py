"""
Structured AI inference logger.

Every AI prediction, extraction, and classification must pass through this
logger to create a complete audit trail of model decisions.
"""
import logging
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any


# ── Structured Log Record ─────────────────────────────────────────────────────

@dataclass
class InferenceRecord:
    """Immutable audit record for a single AI inference operation."""
    operation: str                      # e.g. "extract_entities", "classify", "predict"
    provider: str                       # e.g. "SpaCyProvider"
    model_version: str                  # e.g. "en_core_web_sm-3.7.1"
    execution_time_ms: float = 0.0
    event_id: str | None = None
    prediction_id: str | None = None
    extraction_confidence: float | None = None
    classification_confidence: float | None = None
    prediction_confidence: float | None = None
    overall_confidence: float | None = None
    evidence_count: int = 0
    data_sources: list[str] = field(default_factory=list)
    prompt_version: str | None = None  # reserved for future LLM providers
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    extra: dict[str, Any] = field(default_factory=dict)
    inference_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ── Logger Context Manager ─────────────────────────────────────────────────────

class InferenceLogger:
    """
    Context manager for timing and logging AI inference operations.

    Usage:
        async with InferenceLogger("extract_entities", provider, model_version) as log:
            result = await provider.extract_entities(text)
            log.extraction_confidence = result.extraction_confidence
    """

    def __init__(
        self,
        operation: str,
        provider: str,
        model_version: str,
        event_id: str | None = None,
        prediction_id: str | None = None,
    ) -> None:
        self._operation = operation
        self._provider = provider
        self._model_version = model_version
        self._event_id = event_id
        self._prediction_id = prediction_id
        self._start: float = 0.0
        self.record: InferenceRecord | None = None
        self._logger = logging.getLogger("geocap.inference")

    async def __aenter__(self) -> "InferenceLogger":
        self._start = time.perf_counter()
        self.record = InferenceRecord(
            operation=self._operation,
            provider=self._provider,
            model_version=self._model_version,
            event_id=self._event_id,
            prediction_id=self._prediction_id,
        )
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        elapsed = (time.perf_counter() - self._start) * 1000
        if self.record:
            self.record.execution_time_ms = round(elapsed, 2)
            if exc_val is not None:
                self.record.errors.append(str(exc_val))
            self._logger.info(
                "[INFERENCE] op=%s provider=%s model=%s event=%s elapsed_ms=%.1f "
                "ext_conf=%s cls_conf=%s pred_conf=%s overall=%s warnings=%d errors=%d",
                self.record.operation,
                self.record.provider,
                self.record.model_version,
                self.record.event_id or "N/A",
                self.record.execution_time_ms,
                self.record.extraction_confidence,
                self.record.classification_confidence,
                self.record.prediction_confidence,
                self.record.overall_confidence,
                len(self.record.warnings),
                len(self.record.errors),
            )


# ── Module-level logger setup ─────────────────────────────────────────────────

def configure_logging(level: str = "INFO") -> None:
    """Configure application-wide logging with structured format."""
    logging.basicConfig(
        format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
        level=getattr(logging, level.upper(), logging.INFO),
    )
    # Suppress noisy third-party loggers
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
