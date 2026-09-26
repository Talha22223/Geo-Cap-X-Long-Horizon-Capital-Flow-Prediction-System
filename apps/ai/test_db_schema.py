import asyncio
import os
import sys

ai_root = os.path.dirname(os.path.abspath(__file__))
if ai_root not in sys.path:
    sys.path.insert(0, ai_root)

from core.database import get_engine, create_all_tables
from sqlalchemy import text
from models.base import Base

async def reset_schema():
    engine = get_engine()
    async with engine.begin() as conn:
        print("Checking existing tables...")
        res = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
        tables = [row[0] for row in res.fetchall()]
        print("Public tables:", tables)
        
        print("Dropping public tables with CASCADE...")
        for table in tables:
            await conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
            print(f"Dropped {table}")

    print("Recreating tables...")
    await create_all_tables()
    print("Tables created cleanly!")

if __name__ == "__main__":
    asyncio.run(reset_schema())
