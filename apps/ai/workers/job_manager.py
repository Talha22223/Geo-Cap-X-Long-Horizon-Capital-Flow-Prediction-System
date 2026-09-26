"""
Background Job Lifecycle Manager.
"""
from __future__ import annotations
from datetime import datetime, timezone
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.jobs import ProcessingJob
from core.exceptions import JobNotFoundException

logger = logging.getLogger(__name__)


class JobLifecycleManager:
    """
    Manages ProcessingJob lifecycle states, errors, progress, and cancellations in the DB.
    """

    @staticmethod
    async def create_job(db: AsyncSession, task_type: str, job_id: str | None = None) -> ProcessingJob:
        """Create a new job record with PENDING state."""
        job = ProcessingJob(
            id=job_id or datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"),
            task_type=task_type,
            status="PENDING",
            progress=0,
            retries=0,
        )
        db.add(job)
        await db.commit()
        logger.info(f"Job created: {job.id} (Type: {task_type})")
        return job

    @staticmethod
    async def start_job(db: AsyncSession, job_id: str) -> None:
        """Move job status to RUNNING."""
        stmt = select(ProcessingJob).where(ProcessingJob.id == job_id)
        res = await db.execute(stmt)
        job = res.scalars().first()
        if not job:
            raise JobNotFoundException(job_id)

        job.status = "RUNNING"
        job.progress = 5
        await db.commit()

    @staticmethod
    async def update_progress(db: AsyncSession, job_id: str, progress: int) -> None:
        """Update progress percentage (0-100)."""
        stmt = select(ProcessingJob).where(ProcessingJob.id == job_id)
        res = await db.execute(stmt)
        job = res.scalars().first()
        if job:
            job.progress = min(100, max(0, progress))
            await db.commit()

    @staticmethod
    async def complete_job(db: AsyncSession, job_id: str, summary: dict) -> None:
        """Move job status to COMPLETED and attach result summary."""
        stmt = select(ProcessingJob).where(ProcessingJob.id == job_id)
        res = await db.execute(stmt)
        job = res.scalars().first()
        if job:
            job.status = "COMPLETED"
            job.progress = 100
            job.result_summary = summary
            await db.commit()
            logger.info(f"Job completed: {job_id}")

    @staticmethod
    async def fail_job(db: AsyncSession, job_id: str, error_msg: str) -> None:
        """Move job status to FAILED and record error message."""
        stmt = select(ProcessingJob).where(ProcessingJob.id == job_id)
        res = await db.execute(stmt)
        job = res.scalars().first()
        if job:
            job.status = "FAILED"
            job.error_message = error_msg
            await db.commit()
            logger.error(f"Job failed: {job_id}. Error: {error_msg}")

    @staticmethod
    async def cancel_job(db: AsyncSession, job_id: str) -> None:
        """Move job status to CANCELLED."""
        stmt = select(ProcessingJob).where(ProcessingJob.id == job_id)
        res = await db.execute(stmt)
        job = res.scalars().first()
        if job:
            job.status = "CANCELLED"
            await db.commit()
            logger.info(f"Job cancelled: {job_id}")

    @staticmethod
    async def cleanup_stale_jobs(db: AsyncSession) -> int:
        """Mark running jobs older than 24 hours as FAILED."""
        from datetime import timedelta
        from sqlalchemy import String, func
        threshold = datetime.now(timezone.utc) - timedelta(hours=24)
        stmt = select(ProcessingJob).where(
            func.cast(ProcessingJob.status, String) == "RUNNING",
            ProcessingJob.updated_at < threshold
        )
        res = await db.execute(stmt)
        stale_jobs = res.scalars().all()
        for job in stale_jobs:
            job.status = "FAILED"
            job.error_message = "Job timed out after 24 hours of inactivity."
            logger.warning(f"Stale job marked as FAILED in Python cleanup: {job.id}")
        if stale_jobs:
            await db.commit()
        return len(stale_jobs)
