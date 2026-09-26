"""
SQLAlchemy model for Background Processing Job Tracking.
"""
from __future__ import annotations
import uuid
from sqlalchemy import String, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from models.base import Base, TimestampMixin


class ProcessingJob(Base, TimestampMixin):
    """
    Tracks state, progress, and logs of background ingestion or training jobs.
    """
    __tablename__ = "processing_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_type: Mapped[str] = mapped_column(String(100), index=True, nullable=False)  # ingest, predict, build-chain
    status: Mapped[str] = mapped_column(String(50), default="PENDING", index=True, nullable=False)  # PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0 to 100
    retries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
