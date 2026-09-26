"""
Classification Worker Task.
"""
import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import AsyncSessionLocal
from providers.registry import ProviderRegistry
from workers.job_manager import JobLifecycleManager
from config import settings

logger = logging.getLogger(__name__)


def run_classify_task(job_id: str, text: str) -> dict:
    return asyncio.run(async_run_classify_task(job_id, text))


async def async_run_classify_task(job_id: str, text: str) -> dict:
    nlp = ProviderRegistry.get_provider(settings.NLP_PROVIDER)
    async with AsyncSessionLocal() as db:
        try:
            await JobLifecycleManager.start_job(db, job_id)
            await JobLifecycleManager.update_progress(db, job_id, 30)

            sentiment = await nlp.calculate_sentiment(text)
            classification = await nlp.classify_event(text)
            
            await JobLifecycleManager.update_progress(db, job_id, 80)

            result = {
                "sentiment": sentiment.sentiment,
                "polarity": sentiment.polarity,
                "primary_category": classification.primary_category,
                "secondary_categories": classification.secondary_categories,
                "confidence": classification.classification_confidence,
            }

            await JobLifecycleManager.complete_job(db, job_id, result)
            return result
        except Exception as e:
            logger.exception(f"Job {job_id} failed during classification: {e}")
            await JobLifecycleManager.fail_job(db, job_id, str(e))
            return {"error": str(e)}
