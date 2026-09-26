"""
Domain exceptions and FastAPI exception handlers.
"""
from fastapi import Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)


# ── Domain Exceptions ─────────────────────────────────────────────────────────

class GeoCAPBaseException(Exception):
    """Base exception for all GeoCap-X AI Engine errors."""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class EventNotFoundException(GeoCAPBaseException):
    def __init__(self, event_id: str) -> None:
        super().__init__(f"Event '{event_id}' not found.", code="EVENT_NOT_FOUND")


class ChainNotFoundException(GeoCAPBaseException):
    def __init__(self, chain_id: str) -> None:
        super().__init__(f"Event chain '{chain_id}' not found.", code="CHAIN_NOT_FOUND")


class PredictionNotFoundException(GeoCAPBaseException):
    def __init__(self, prediction_id: str) -> None:
        super().__init__(f"Prediction '{prediction_id}' not found.", code="PREDICTION_NOT_FOUND")


class JobNotFoundException(GeoCAPBaseException):
    def __init__(self, job_id: str) -> None:
        super().__init__(f"Job '{job_id}' not found.", code="JOB_NOT_FOUND")


class SourceNotFoundException(GeoCAPBaseException):
    def __init__(self, source_name: str) -> None:
        super().__init__(f"Source adapter '{source_name}' is not registered.", code="SOURCE_NOT_FOUND")


class ProviderNotFoundException(GeoCAPBaseException):
    def __init__(self, provider_name: str) -> None:
        super().__init__(
            f"NLP provider '{provider_name}' is not registered.",
            code="PROVIDER_NOT_FOUND",
        )


class DuplicateEventException(GeoCAPBaseException):
    def __init__(self, reason: str) -> None:
        super().__init__(f"Duplicate event detected: {reason}", code="DUPLICATE_EVENT")


class IngestionException(GeoCAPBaseException):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="INGESTION_ERROR")


class ExtractionException(GeoCAPBaseException):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="EXTRACTION_ERROR")


class ClassificationException(GeoCAPBaseException):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="CLASSIFICATION_ERROR")


class GraphBuildException(GeoCAPBaseException):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="GRAPH_BUILD_ERROR")


class PredictionException(GeoCAPBaseException):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="PREDICTION_ERROR")


# ── Exception Handlers ────────────────────────────────────────────────────────

async def geocap_exception_handler(request: Request, exc: GeoCAPBaseException) -> JSONResponse:
    status_code = {
        "EVENT_NOT_FOUND": 404,
        "CHAIN_NOT_FOUND": 404,
        "PREDICTION_NOT_FOUND": 404,
        "JOB_NOT_FOUND": 404,
        "SOURCE_NOT_FOUND": 404,
        "PROVIDER_NOT_FOUND": 500,
        "DUPLICATE_EVENT": 409,
        "INGESTION_ERROR": 422,
        "EXTRACTION_ERROR": 422,
        "CLASSIFICATION_ERROR": 422,
        "GRAPH_BUILD_ERROR": 500,
        "PREDICTION_ERROR": 500,
        "INTERNAL_ERROR": 500,
    }.get(exc.code, 500)

    logger.error(f"[{exc.code}] {exc.message} — path={request.url.path}")
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}},
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred."},
        },
    )
