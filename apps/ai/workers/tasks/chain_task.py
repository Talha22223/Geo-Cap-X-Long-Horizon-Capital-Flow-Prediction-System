"""
Event Chain Rebuild Worker Task.
"""
import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import AsyncSessionLocal
from event_chain.builder import EventChainBuilder
from sna.analyzer import NetworkAnalyzer
from workers.job_manager import JobLifecycleManager

logger = logging.getLogger(__name__)


def run_chain_task(job_id: str) -> dict:
    return asyncio.run(async_run_chain_task(job_id))


async def async_run_chain_task(job_id: str) -> dict:
    async with AsyncSessionLocal() as db:
        try:
            await JobLifecycleManager.start_job(db, job_id)
            await JobLifecycleManager.update_progress(db, job_id, 20)

            builder = EventChainBuilder(db)
            chain = await builder.build_default_chain()

            await JobLifecycleManager.update_progress(db, job_id, 60)

            analyzer = NetworkAnalyzer(db)
            sna_summary = await analyzer.analyze_chain(chain.id)

            await JobLifecycleManager.update_progress(db, job_id, 90)

            summary = {
                "chain_id": chain.id,
                "node_count": chain.node_count,
                "max_depth": chain.max_depth,
                "density": sna_summary.network_density,
                "clustering_coefficient": sna_summary.clustering_coefficient,
            }

            await JobLifecycleManager.complete_job(db, job_id, summary)
            return summary
        except Exception as e:
            logger.exception(f"Job {job_id} failed during chain rebuild: {e}")
            await JobLifecycleManager.fail_job(db, job_id, str(e))
            return {"error": str(e)}
