import asyncio
import traceback
from core.database import get_session_factory
from api.v1.dashboard import get_dashboard_summary

async def main():
    try:
        async with get_session_factory()() as db:
            res = await get_dashboard_summary(db)
            print("SUCCESS:", res)
    except Exception as e:
        print("EXCEPTIONS TRACEBACK:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
