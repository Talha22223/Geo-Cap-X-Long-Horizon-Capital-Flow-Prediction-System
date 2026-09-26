"""
Shared common Pydantic schemas.
"""
from typing import Any, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""
    success: bool = True
    data: T | None = None
    error: dict[str, Any] | None = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated query response."""
    items: list[T]
    total: int
    page: int
    size: int
    pages: int
