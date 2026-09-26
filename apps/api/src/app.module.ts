/**
 * ============================================================================
 * GEOCAP-X ENTERPRISE API - ROOT APPLICATION MODULE (AppModule)
 * ============================================================================
 * WHAT:
 *   Root dependency injection container and orchestration module for the NestJS API.
 *   Validates core environment variables using Zod schema, registers all feature modules
 *   (Auth, Subscriptions, AI Proxy, Organizations, Admin, Reports, ApiKeys, Health),
 *   and provides global guards (Throttler rate limiting), filters (HttpExceptionFilter),
 *   and interceptors (TransformInterceptor).
 *
 * WHY:
 *   Ensures fail-fast startup behavior if required environment variables are misconfigured,
 *   enforces global rate limiting (default 100 requests / 60 seconds), and unifies
 *   JSON API response structures across all microservices.
 *
 * HOW IT CONNECTS:
 *   - Database: Imports PrismaModule connecting to PostgreSQL.
 *   - Caching & Queues: Imports RedisQueueModule connecting to Redis 7.
 *   - AI Microservice: Imports AiModule communicating via HTTP REST to FastAPI (:8000).
 *   - Payments: Imports SubscriptionsModule integrating Stripe billing and plan enforcement.
 *
 * MODIFICATION GUIDE:
 *   - Add New Modules: Register in `imports` array below.
 *   - Modify Environment Schema: Update `envSchema` at line 41.
 *   - Adjust Global Rate Limiting: Change THROTTLE_TTL / THROTTLE_LIMIT in .env or below.
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './database/prisma.module';
import { RedisQueueModule } from './common/redis-queue.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ProfileModule } from './profile/profile.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ApiKeysModule } from './apikeys/apikeys.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module.js';
import { AiModule } from './ai/ai.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { EmailModule } from './common/services/email.module';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/geocapx?schema=public'),
  JWT_SECRET: z.string().min(8).default('geocap-x-enterprise-default-secret-token-key'),
  PORT: z.coerce.number().default(3001),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(100),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          console.error('Environment validation failed:', result.error.format());
          throw new Error('Environment validation failed');
        }
        return result.data;
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    PrismaModule,
    RedisQueueModule,
    EmailModule,
    AuthModule,
    ProfileModule,
    OrganizationsModule,
    SubscriptionsModule,
    ApiKeysModule,
    AdminModule,
    ReportsModule,
    HealthModule,
    AiModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
