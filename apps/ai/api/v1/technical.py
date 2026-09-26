"""
REST API Router for Technical Analysis, Market Structure, and XAI Explanations.
"""
from fastapi import APIRouter, Query, HTTPException, Depends
from schemas.common import APIResponse
from technical.engine import TechnicalAnalysisEngine
from technical.explainer import TechnicalExplainer
from technical.schemas import (
    TechnicalAnalysisOut,
    MarketStructureOut,
    PatternOut,
    MultiTimeframeOut,
    TechnicalExplanationOut,
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/technical", tags=["Technical Analysis"])
engine = TechnicalAnalysisEngine()


@router.get("/{symbol}", response_model=APIResponse[dict])
async def get_full_analysis(symbol: str, timeframes: str | None = Query(None)):
    """
    Get full multi-timeframe technical analysis report for a symbol.
    `timeframes` parameter can be a comma-separated list like "1H,4H,1D,1W".
    """
    tfs = None
    if timeframes:
        tfs = [t.strip().upper() for t in timeframes.split(",")]

    try:
        report = await engine.analyze(symbol, tfs)
        return APIResponse(success=True, data=report)
    except Exception as e:
        logger.exception(f"Error executing analysis for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/indicators", response_model=APIResponse[dict])
async def get_indicators(symbol: str, timeframe: str = "1D"):
    """
    Get raw indicator values for a specific timeframe.
    """
    try:
        report = await engine.analyze(symbol, [timeframe])
        tf_report = report["timeframe_reports"].get(timeframe.upper())
        if not tf_report:
            raise HTTPException(status_code=404, detail=f"No data for timeframe {timeframe}")
        return APIResponse(success=True, data=tf_report["indicators"])
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching indicators for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/market-structure", response_model=APIResponse[dict])
async def get_market_structure(symbol: str, timeframe: str = "1D"):
    """
    Get market structure (support, resistance, pivot points, breakouts).
    """
    try:
        report = await engine.analyze(symbol, [timeframe])
        tf_report = report["timeframe_reports"].get(timeframe.upper())
        if not tf_report:
            raise HTTPException(status_code=404, detail=f"No data for timeframe {timeframe}")
        return APIResponse(success=True, data=tf_report["market_structure"])
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching market structure for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/patterns", response_model=APIResponse[list[dict]])
async def get_patterns(symbol: str, timeframe: str = "1D"):
    """
    Get detected classical chart patterns with confidence levels.
    """
    try:
        report = await engine.analyze(symbol, [timeframe])
        tf_report = report["timeframe_reports"].get(timeframe.upper())
        if not tf_report:
            raise HTTPException(status_code=404, detail=f"No data for timeframe {timeframe}")
        return APIResponse(success=True, data=tf_report["detected_patterns"])
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching patterns for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/multi-timeframe", response_model=APIResponse[MultiTimeframeOut])
async def get_multi_timeframe(symbol: str):
    """
    Get multi-timeframe alignment analysis.
    """
    try:
        report = await engine.analyze(symbol)
        mtf_data = report["multi_timeframe_alignment"]
        return APIResponse(
            success=True,
            data=MultiTimeframeOut(
                symbol=symbol.upper(),
                timeframe_alignment=mtf_data["timeframe_alignment"],
                alignment_score=mtf_data["alignment_score"],
                mtf_confidence=mtf_data["mtf_confidence"],
                primary_trend=mtf_data["primary_trend"]
            )
        )
    except Exception as e:
        logger.exception(f"Error fetching MTF data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{symbol}/explain", response_model=APIResponse[TechnicalExplanationOut])
async def get_explanation(symbol: str):
    """
    Get plain-English explainable AI (XAI) analysis matching indicators and macro flow trends.
    """
    try:
        report = await engine.analyze(symbol)
        explanation = TechnicalExplainer.generate_explanation(report)
        return APIResponse(
            success=True,
            data=TechnicalExplanationOut(**explanation)
        )
    except Exception as e:
        logger.exception(f"Error generating explanation for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/timeframes", response_model=APIResponse[list[str]])
async def get_available_timeframes(symbol: str):
    """
    Get list of available timeframes for analysis.
    """
    return APIResponse(success=True, data=["1H", "4H", "1D", "1W", "1M", "6M", "1Y"])
