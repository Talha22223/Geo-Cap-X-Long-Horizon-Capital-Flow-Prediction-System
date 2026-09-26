"""
REST API Router for Countries.
"""
from fastapi import APIRouter
from sqlalchemy import select
from core.dependencies import DBSession
from models.reference import Country
from schemas.common import APIResponse

router = APIRouter(prefix="/countries", tags=["Reference Data"])


@router.get("", response_model=APIResponse[list[dict]])
async def list_countries(db: DBSession):
    stmt = select(Country)
    res = await db.execute(stmt)
    items = res.scalars().all()
    
    out = [
        {
            "id": c.id,
            "name": c.name,
            "code2": c.code2,
            "code3": c.code3,
            "region_name": c.region_name
        }
        for c in items
    ]
    return APIResponse(success=True, data=out)
