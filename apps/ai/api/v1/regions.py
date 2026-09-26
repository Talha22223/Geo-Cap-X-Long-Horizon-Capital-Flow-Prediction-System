"""
REST API Router for Regions.
"""
from fastapi import APIRouter
from sqlalchemy import select
from core.dependencies import DBSession
from models.reference import Region
from schemas.common import APIResponse

router = APIRouter(prefix="/regions", tags=["Reference Data"])


@router.get("", response_model=APIResponse[list[dict]])
async def list_regions(db: DBSession):
    stmt = select(Region)
    res = await db.execute(stmt)
    items = res.scalars().all()
    
    out = [{"id": r.id, "name": r.name, "description": r.description} for r in items]
    return APIResponse(success=True, data=out)
