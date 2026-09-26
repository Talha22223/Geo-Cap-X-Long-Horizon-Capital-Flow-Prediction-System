import asyncio
import logging
import os
import sys

# Ensure apps/ai is on sys.path
ai_root = os.path.dirname(os.path.abspath(__file__))
if ai_root not in sys.path:
    sys.path.insert(0, ai_root)

from core.database import get_engine, create_all_tables, get_session_factory
from models.base import Base
import models.event
import models.event_chain
import models.capital_flow
import models.forecast
import models.backtest
import models.reference
import models.sna
import models.inference
import models.jobs
import technical.models
from providers.registry import ProviderRegistry, register_all_providers
from ingestion.sources.registry import register_all_sources
from ingestion.pipeline import IngestionPipeline

logging.basicConfig(
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("seed-db")

async def seed():
    register_all_providers()
    register_all_sources()

    nlp = ProviderRegistry.get_provider("spacy")
    
    Session = get_session_factory()
    async with Session() as db:
        from models.reference import Region, Country, Sector, Currency
        from sqlalchemy import select
        
        # Seed Regions
        res = await db.execute(select(Region))
        if not res.scalars().first():
            regions = [
                Region(name="North America", description="US, Canada, Mexico"),
                Region(name="Europe", description="Eurozone, UK, Switzerland, Nordic"),
                Region(name="Asia Pacific", description="Japan, China, Australia, Singapore, India"),
                Region(name="Latin America", description="Brazil, Mexico, Argentina, Chile"),
                Region(name="Middle East & Africa", description="GCC, South Africa, Egypt"),
            ]
            db.add_all(regions)
            await db.commit()

        # Seed Countries
        res = await db.execute(select(Country))
        if not res.scalars().first():
            countries = [
                Country(name="United States", code2="US", code3="USA", region_name="North America"),
                Country(name="Germany", code2="DE", code3="DEU", region_name="Europe"),
                Country(name="United Kingdom", code2="GB", code3="GBR", region_name="Europe"),
                Country(name="Japan", code2="JP", code3="JPN", region_name="Asia Pacific"),
                Country(name="China", code2="CN", code3="CHN", region_name="Asia Pacific"),
                Country(name="France", code2="FR", code3="FRA", region_name="Europe"),
                Country(name="Switzerland", code2="CH", code3="CHE", region_name="Europe"),
                Country(name="Canada", code2="CA", code3="CAN", region_name="North America"),
                Country(name="Australia", code2="AU", code3="AUS", region_name="Asia Pacific"),
                Country(name="Saudi Arabia", code2="SA", code3="SAU", region_name="Middle East & Africa"),
            ]
            db.add_all(countries)
            await db.commit()

        # Seed Sectors
        res = await db.execute(select(Sector))
        if not res.scalars().first():
            sectors = [
                Sector(name="Financial Services", description="Banking, Asset Management, Insurance"),
                Sector(name="Technology", description="Software, Semiconductors, Hardware"),
                Sector(name="Energy", description="Oil & Gas, Renewable Energy, Utilities"),
                Sector(name="Healthcare", description="Pharmaceuticals, Biotech, Medical Devices"),
                Sector(name="Consumer Goods", description="Automotive, Retail, Electronics"),
                Sector(name="Industrial", description="Manufacturing, Aerospace, Logistics"),
            ]
            db.add_all(sectors)
            await db.commit()

        # Seed Currencies
        res = await db.execute(select(Currency))
        if not res.scalars().first():
            currencies = [
                Currency(code="USD", name="US Dollar", symbol="$"),
                Currency(code="EUR", name="Euro", symbol="€"),
                Currency(code="GBP", name="British Pound", symbol="£"),
                Currency(code="JPY", name="Japanese Yen", symbol="¥"),
                Currency(code="CHF", name="Swiss Franc", symbol="CHF"),
                Currency(code="CNY", name="Chinese Yuan", symbol="¥"),
            ]
            db.add_all(currencies)
            await db.commit()

        logger.info("Reference data seeded.")


if __name__ == "__main__":
    asyncio.run(seed())
