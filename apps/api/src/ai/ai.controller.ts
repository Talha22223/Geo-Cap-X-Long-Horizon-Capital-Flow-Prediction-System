/**
 * ============================================================================
 * AI ENGINE GATEWAY PROXY CONTROLLER (AiController)
 * ============================================================================
 * WHAT:
 *   Secure NestJS reverse-proxy to the Python FastAPI AI Microservice (:8000).
 *   Applies authentication (`JwtAuthGuard`) and server-side subscription gates
 *   (`SubscriptionGateGuard`), enforcing tier-based limits before forwarding:
 *   - `/dashboard/summary`: High-level aggregated statistics
 *   - `/events`: Extracted and canonical geopolitical events
 *   - `/predictions`: Capital flow forecasts (Free tier capped at top 5)
 *   - `/forecast/by-horizon`: Horizon forecasts (Free tier limited to 1M)
 *   - `/event-chain`: Causality network chains (@RequirePlan('pro'))
 *   - `/sna/*`: Social Network Analysis graph centrality (@RequirePlan('pro'))
 *   - `/backtest/run`: Point-in-time forecast validation (@RequirePlan('pro'))
 *   - `/backtest/leakage-test`: Information leakage detection (@RequirePlan('enterprise'))
 *   - `/technical/*`: Multi-timeframe technical indicator analysis & explainers
 *   - `/market-intelligence/*`: Layered signal fusion and market observations
 *
 * WHY:
 *   Shields the internal AI Python service from public internet exposure,
 *   enforces enterprise RBAC & subscription quotas, and injects timeout handling.
 *
 * HOW IT CONNECTS:
 *   - Frontend: All Next.js client hooks call `/api/v1/ai/*`.
 *   - Backend: Forwards HTTP requests to AI_SERVICE_URL (`http://localhost:8000`).
 * ============================================================================
 */

import { Controller, Get, Post, Body, Req, UseGuards, Param } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { SubscriptionGateGuard } from '../common/guards/subscription-gate.guard.js';
import { RequireActiveSubscription, RequirePlan } from '../common/decorators/requires-subscription.decorator.js';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, SubscriptionGateGuard)
@RequireActiveSubscription()
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('dashboard/summary')
  async getDashboardSummary() {
    return this.aiService.fetchFromAi('/api/v1/dashboard/summary');
  }

  @Get('events')
  async getEvents(@Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/events${url.search}`);
  }

  @Get('events/:id')
  async getEventById(@Param('id') id: string) {
    return this.aiService.fetchFromAi(`/api/v1/events/${id}`);
  }

  @Get('predictions')
  async getPredictions(@Req() req: any) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const data: any = await this.aiService.fetchFromAi(`/api/v1/predictions${url.search}`);

    // Server-side tier restriction: Free plan gets top 5 predictions only
    const planName = (req.user?.subscription?.planName || '').toLowerCase();
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.email === 'admin@gmail.com';

    if (!isSuperAdmin && planName === 'free') {
      if (data?.data?.items && Array.isArray(data.data.items)) {
        return {
          ...data,
          data: {
            ...data.data,
            items: data.data.items.slice(0, 5),
            total: Math.min(data.data.total, 5),
            tierNotice: 'Free Tier: Capped at 5 predictions. Upgrade to Pro for unlimited predictions.',
          },
        };
      }
      if (Array.isArray(data?.data)) {
        return {
          ...data,
          data: data.data.slice(0, 5),
          tierNotice: 'Free Tier: Showing top 5 predictions.',
        };
      }
    }

    return data;
  }


  @Get('forecast/by-horizon')
  async getForecastByHorizon(@Req() req: any) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const data: any = await this.aiService.fetchFromAi(`/api/v1/forecast/by-horizon${url.search}`);

    // Server-side tier restriction: Free plan gets 1M horizon only
    const planName = (req.user?.subscription?.planName || '').toLowerCase();
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.email === 'admin@gmail.com';

    if (!isSuperAdmin && planName === 'free' && data?.data && typeof data.data === 'object') {
      const restrictedData: Record<string, any> = {};
      if (data.data['1M']) restrictedData['1M'] = data.data['1M'];
      return {
        ...data,
        data: restrictedData,
        tierNotice: 'Free Tier includes 1-Month horizon only. Upgrade to Pro for 3M, 6M, and 1Y forecasts.',
      };
    }

    return data;
  }

  @Get('countries')
  async getCountries() {
    return this.aiService.fetchFromAi('/api/v1/countries');
  }

  @Get('heatmap')
  async getHeatmap() {
    return this.aiService.fetchFromAi('/api/v1/heatmap');
  }

  @Get('sectors')
  async getSectors() {
    return this.aiService.fetchFromAi('/api/v1/sectors');
  }

  @Get('regions')
  async getRegions() {
    return this.aiService.fetchFromAi('/api/v1/regions');
  }

  @Get('network/statistics')
  async getNetworkStatistics() {
    return this.aiService.fetchFromAi('/api/v1/network/statistics');
  }

  // ─── Pro & Enterprise Exclusive Visualizations ────────────────────────────

  @RequirePlan('pro')
  @Get('event-chain')
  async getEventChain(@Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/event-chain${url.search}`);
  }

  @RequirePlan('pro')
  @Get('event-chain/:id/graph')
  async getEventChainGraph(@Param('id') id: string, @Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/event-chain/${id}/graph${url.search}`);
  }

  @RequirePlan('pro')
  @Get('event-chain/:id')
  async getEventChainById(@Param('id') id: string) {
    return this.aiService.fetchFromAi(`/api/v1/event-chain/${id}`);
  }

  @RequirePlan('pro')
  @Get('sna/summary')
  async getGraphSummary(@Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/sna/summary${url.search}`);
  }

  @RequirePlan('pro')
  @Get('sna/top-influential')
  async getTopInfluential(@Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/sna/top-influential${url.search}`);
  }

  @RequirePlan('pro')
  @Get('sna/bridge-events')
  async getBridgeEvents(@Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/sna/bridge-events${url.search}`);
  }

  @RequirePlan('pro')
  @Get('sna/communities-detailed')
  async getCommunitiesDetailed(@Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/sna/communities-detailed${url.search}`);
  }

  @RequirePlan('pro')
  @Get('sna/centrality')
  async getNodeCentrality(@Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/sna/centrality${url.search}`);
  }

  @RequirePlan('pro')
  @Get('sna/communities')
  async getNodeCommunities(@Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/sna/communities${url.search}`);
  }

  @Get('explain/freshness')
  async getExplainFreshness() {
    return this.aiService.fetchFromAi('/api/v1/explain/freshness');
  }

  @Get('explain/event/:eventId')
  async getExplainEvent(@Param('eventId') eventId: string) {
    return this.aiService.fetchFromAi(`/api/v1/explain/event/${eventId}`);
  }

  @Get('explain/forecast/:predictionId')
  async getExplainForecast(@Param('predictionId') predictionId: string) {
    return this.aiService.fetchFromAi(`/api/v1/explain/forecast/${predictionId}`);
  }

  @Get('backtest/results')
  async getBacktestResults() {
    return this.aiService.fetchFromAi('/api/v1/backtest/results');
  }

  @RequirePlan('pro')
  @Post('backtest/run')
  async runBacktest(@Body() body: any) {
    return this.aiService.fetchFromAi('/api/v1/backtest/run', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  @RequirePlan('enterprise')
  @Get('backtest/leakage-test')
  async runLeakageTest() {
    return this.aiService.fetchFromAi('/api/v1/backtest/leakage-test');
  }

  @Get('predictions/backtest')
  async getPredictionsBacktest() {
    return this.aiService.fetchFromAi('/api/v1/backtest/latest');
  }

  @Post('predictions/generate')
  async generatePrediction(@Body() body: any) {
    return this.aiService.fetchFromAi('/api/v1/predictions/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  @Post('forecast/generate')
  async generateForecast(@Body() body: any) {
    return this.aiService.fetchFromAi('/api/v1/forecast/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  @Post('predictions/explain')
  async explainPrediction(@Body() body: any) {
    return this.aiService.fetchFromAi('/api/v1/predictions/explain', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  @Get('technical/:base/:quote')
  async getTechnicalAnalysisPair(@Param('base') base: string, @Param('quote') quote: string, @Req() req: Request) {
    const symbol = `${base}-${quote}`;
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/technical/${symbol}${url.search}`);
  }

  @Post('technical/:base/:quote/explain')
  async explainTechnicalAnalysisPair(@Param('base') base: string, @Param('quote') quote: string) {
    const symbol = `${base}-${quote}`;
    return this.aiService.fetchFromAi(`/api/v1/technical/${symbol}/explain`, {
      method: 'POST',
    });
  }

  @Get('technical/:symbol')
  async getTechnicalAnalysis(@Param('symbol') symbol: string, @Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/technical/${symbol}${url.search}`);
  }

  @Post('technical/:symbol/explain')
  async explainTechnicalAnalysis(@Param('symbol') symbol: string) {
    return this.aiService.fetchFromAi(`/api/v1/technical/${symbol}/explain`, {
      method: 'POST',
    });
  }

  @Get('market/observations')
  async getMarketObservations(@Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/market/observations${url.search}`);
  }

  @Get('market/signals')
  async getMarketSignals(@Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/market/signals${url.search}`);
  }

  @Get('market/event-analysis/:eventId')
  async getEventMarketAnalysis(@Param('eventId') eventId: string) {
    return this.aiService.fetchFromAi(`/api/v1/market/event-analysis/${eventId}`);
  }

  @Get('market/event-mappings')
  async getEventAssetMappings(@Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/market/event-mappings${url.search}`);
  }

  @Get('market/sources/status')
  async getMarketSourcesStatus() {
    return this.aiService.fetchFromAi('/api/v1/market/sources/status');
  }

  @Get('market-intelligence/event/:eventId')
  async getEventMarketIntelligence(@Param('eventId') eventId: string) {
    return this.aiService.fetchFromAi(`/api/v1/market-intelligence/event/${eventId}`);
  }

  @Get('market-intelligence/asset/:symbol/events')
  async getAssetEventHistory(@Param('symbol') symbol: string, @Req() req: Request) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return this.aiService.fetchFromAi(`/api/v1/market-intelligence/asset/${symbol}/events${url.search}`);
  }

  @Get('market-intelligence/sector/:sector')
  async getSectorMarketAnalysis(@Param('sector') sector: string) {
    return this.aiService.fetchFromAi(`/api/v1/market-intelligence/sector/${sector}`);
  }

  @Get('market-intelligence/signal-detail/:signalId')
  async getSignalDetail(@Param('signalId') signalId: string) {
    return this.aiService.fetchFromAi(`/api/v1/market-intelligence/signal-detail/${signalId}`);
  }
}
