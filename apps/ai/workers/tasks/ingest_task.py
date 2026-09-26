"""
Ingestion Pipeline Worker Task.
"""
import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from providers.registry import ProviderRegistry
from ingestion.pipeline import IngestionPipeline
from workers.job_manager import JobLifecycleManager
from config import settings

logger = logging.getLogger(__name__)


def run_ingest_task(job_id: str, source_name: str, **kwargs) -> dict:
    """
    Synchronous entry point for RQ worker execution.
    Fires off the async loop to execute the ingestion pipeline.
    """
    return asyncio.run(async_run_ingest_task(job_id, source_name, **kwargs))


async def async_run_ingest_task(job_id: str, source_name: str, **kwargs) -> dict:
    """
    Async implementation of the Ingestion task.
    """
    nlp = ProviderRegistry.get_provider(settings.NLP_PROVIDER)
    
    async with AsyncSessionLocal() as db:
        try:
            # Move job status to RUNNING
            await JobLifecycleManager.start_job(db, job_id)
            await JobLifecycleManager.update_progress(db, job_id, 10)

            pipeline = IngestionPipeline(db, nlp)
            
            # Run the 11-step pipeline
            summary = await pipeline.run(source_name, **kwargs)
            
            await JobLifecycleManager.update_progress(db, job_id, 90)
            
            # Complete the job
            await JobLifecycleManager.complete_job(db, job_id, summary)
            return summary

        except Exception as e:
            logger.exception(f"Job {job_id} failed during ingestion run: {e}")
            # Fail the job
            await JobLifecycleManager.fail_job(db, job_id, str(e))
            return {"error": str(e)}
