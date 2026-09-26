"""
Pydantic schemas for background processing jobs.
"""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class JobOut(BaseModel):
    id: str
    task_type: str
    status: str
    progress: int
    retries: int
    error_message: str | None = None
    result_summary: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
