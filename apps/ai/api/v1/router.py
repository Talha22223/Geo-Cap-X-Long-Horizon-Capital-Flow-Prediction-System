"""
Global REST API V1 Routing Coordinator.
"""
from fastapi import APIRouter

from api.v1.events import router as events_router
from api.v1.chains import router as chains_router
from api.v1.predictions import router as predictions_router
from api.v1.capital_flow import router as capital_flow_router
from api.v1.sna import router as sna_router
from api.v1.dashboard import router as dashboard_router
from api.v1.heatmap import router as heatmap_router
from api.v1.sectors import router as sectors_router
from api.v1.regions import router as regions_router
from api.v1.countries import router as countries_router
from api.v1.jobs import router as jobs_router
from api.v1.technical import router as technical_router
from api.v1.providers import router as providers_router
from api.v1.exposure import router as exposure_router
from api.v1.market import router as market_router
from api.v1.market_intelligence import router as market_intelligence_router
from api.v1.forecast import router as forecast_router
from api.v1.backtest import router as backtest_router
from api.v1.explain import router as explain_router

api_router = APIRouter()

# Mount all endpoint sub-routers
api_router.include_router(events_router)
api_router.include_router(chains_router)
api_router.include_router(predictions_router)
api_router.include_router(capital_flow_router)
api_router.include_router(forecast_router)
api_router.include_router(backtest_router)
api_router.include_router(explain_router)
api_router.include_router(sna_router)
api_router.include_router(dashboard_router)
api_router.include_router(heatmap_router)
api_router.include_router(sectors_router)
api_router.include_router(regions_router)
api_router.include_router(countries_router)
api_router.include_router(jobs_router)
api_router.include_router(technical_router)
api_router.include_router(providers_router)
api_router.include_router(exposure_router)
api_router.include_router(market_router)
api_router.include_router(market_intelligence_router)


