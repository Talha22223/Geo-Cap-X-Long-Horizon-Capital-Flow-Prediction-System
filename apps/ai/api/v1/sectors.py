"""
REST API Router for Sectors.
"""
from fastapi import APIRouter
from sqlalchemy import select
from core.dependencies import DBSession
from models.reference import Sector
from schemas.common import APIResponse

router = APIRouter(prefix="/sectors", tags=["Reference Data"])


@router.get("", response_model=APIResponse[list[dict]])
async def list_sectors(db: DBSession):
    stmt = select(Sector)
    res = await db.execute(stmt)
    items = res.scalars().all()
    
    out = [{"id": s.id, "name": s.name, "description": s.description} for s in items]
    return APIResponse(success=True, data=out)
