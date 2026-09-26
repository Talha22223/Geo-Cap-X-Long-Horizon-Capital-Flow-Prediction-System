"""
Capital Flow Prediction Generator Worker Task.
"""
import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import AsyncSessionLocal
from capital_flow.engine import CapitalFlowEngine
from models.event import ExtractedEvent
from workers.job_manager import JobLifecycleManager

logger = logging.getLogger(__name__)


def run_predict_task(job_id: str) -> dict:
    return asyncio.run(async_run_predict_task(job_id))


async def async_run_predict_task(job_id: str) -> dict:
    async with AsyncSessionLocal() as db:
        try:
            await JobLifecycleManager.start_job(db, job_id)
            await JobLifecycleManager.update_progress(db, job_id, 20)

            # Get all extracted event IDs to generate predictions for
            stmt = select(ExtractedEvent.id)
            res = await db.execute(stmt)
            event_ids = list(res.scalars().all())

            await JobLifecycleManager.update_progress(db, job_id, 40)

            engine = CapitalFlowEngine(db)
            predictions = await engine.generate_predictions_for_events(event_ids)

            await JobLifecycleManager.update_progress(db, job_id, 90)

            summary = {
                "events_analyzed": len(event_ids),
                "predictions_generated": len(predictions),
            }

            await JobLifecycleManager.complete_job(db, job_id, summary)
            return summary
        except Exception as e:
            logger.exception(f"Job {job_id} failed during prediction run: {e}")
            await JobLifecycleManager.fail_job(db, job_id, str(e))
            return {"error": str(e)}
