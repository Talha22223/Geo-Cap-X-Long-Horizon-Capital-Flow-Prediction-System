/**
 * ============================================================================
 * SYSTEM HEALTH & DIAGNOSTICS CONTROLLER (HealthController)
 * ============================================================================
 * WHAT:
 *   Comprehensive heartbeat diagnostics endpoint:
 *   - GET /api/v1/health: Verifies PostgreSQL, Redis ping, AI Microservice HTTP response,
 *     uptime seconds, and heap/RSS memory utilization.
 *
 * WHY:
 *   Used by load balancers, Docker healthchecks, uptime monitors, and Kubernetes
 *   liveness/readiness probes to determine platform status ('healthy' or 'degraded').
 * ============================================================================
 */

import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import Redis from 'ioredis';
import { AiService } from '../ai/ai.service';

@ApiTags('Diagnostics')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis,
    private aiService: AiService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verify API health, DB, Redis, and memory status' })
  async check() {
    let dbStatus = 'healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'unhealthy';
    }

    let redisStatus = 'healthy';
    try {
      await this.redis.ping();
    } catch (e) {
      redisStatus = 'unhealthy';
    }

    let aiStatus = 'healthy';
    try {
      await this.aiService.fetchFromAi('/health');
    } catch (e) {
      aiStatus = 'unhealthy';
    }

    const memoryUsage = process.memoryUsage();
    const isHealthy = dbStatus === 'healthy' && redisStatus === 'healthy' && aiStatus === 'healthy';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        api: 'healthy',
        database: dbStatus,
        redis: redisStatus,
        ai: aiStatus,
      },
      memory: {
        heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      },
    };
  }
}
