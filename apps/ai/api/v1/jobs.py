"""
REST API Router for Background Processing Jobs.
"""
from fastapi import APIRouter
from sqlalchemy import select, func
from core.dependencies import DBSession
from core.exceptions import JobNotFoundException
from models.jobs import ProcessingJob
from schemas.common import APIResponse
from schemas.jobs import JobOut
from workers.job_manager import JobLifecycleManager

router = APIRouter(prefix="/jobs", tags=["Background Jobs"])


@router.get("", response_model=APIResponse[list[JobOut]])
async def list_jobs(db: DBSession):
    """
    List all background processing jobs.
    """
    stmt = select(ProcessingJob).order_by(ProcessingJob.created_at.desc())
    res = await db.execute(stmt)
    items = res.scalars().all()
    return APIResponse(success=True, data=[JobOut.model_validate(i) for i in items])


@router.get("/stats", response_model=APIResponse[dict])
async def get_job_stats(db: DBSession):
    """
    Get aggregated counts of background jobs by status.
    """
    stmt = select(ProcessingJob.status, func.count(ProcessingJob.id)).group_by(ProcessingJob.status)
    res = await db.execute(stmt)
    rows = res.all()
    
    stats = {"pending": 0, "running": 0, "failed": 0, "completed": 0, "cancelled": 0}
    for status, count in rows:
        stat_name = str(status.value if hasattr(status, 'value') else status).lower()
        if stat_name in stats:
            stats[stat_name] = count
            
    return APIResponse(success=True, data=stats)


@router.get("/{id}", response_model=APIResponse[JobOut])
async def get_job(id: str, db: DBSession):
    """
    Get detailed properties and progress logs of a specific background job.
    """
    stmt = select(ProcessingJob).where(ProcessingJob.id == id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise JobNotFoundException(id)
    return APIResponse(success=True, data=JobOut.model_validate(job))


@router.delete("/{id}", response_model=APIResponse[dict])
async def cancel_job(id: str, db: DBSession):
    """
    Cancel an active or pending background job.
    """
    await JobLifecycleManager.cancel_job(db, id)
    return APIResponse(success=True, data={"job_id": id, "status": "CANCELLED"})
