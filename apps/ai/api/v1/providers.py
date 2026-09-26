"""
REST API Router for Provider Status.
"""
from fastapi import APIRouter
from sqlalchemy import select
from core.dependencies import DBSession
from models.provider_status import ProviderStatus
from schemas.common import APIResponse

router = APIRouter(prefix="/providers", tags=["Providers"])


@router.get("/status", response_model=APIResponse[list[dict]])
async def list_provider_status(db: DBSession):
    """
    List the status of all configured data providers.
    """
    stmt = select(ProviderStatus).order_by(ProviderStatus.provider_name)
    res = await db.execute(stmt)
    items = res.scalars().all()
    
    data = []
    for item in items:
        data.append({
            "provider_name": item.provider_name,
            "is_configured": item.is_configured,
            "last_successful_fetch": item.last_successful_fetch,
            "last_failure": item.last_failure,
            "records_fetched": item.records_fetched,
            "records_accepted": item.records_accepted,
            "records_rejected": item.records_rejected,
            "latest_error": item.latest_error,
        })
        
    return APIResponse(success=True, data=data)
