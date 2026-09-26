import asyncio
import sys
sys.path.insert(0, 'apps/ai')
from core.database import get_session_factory
from sqlalchemy import text

async def main():
    async with get_session_factory()() as db:
        res = await db.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog')"))
        for row in res.fetchall():
            print(f"{row[0]}.{row[1]}")

asyncio.run(main())
