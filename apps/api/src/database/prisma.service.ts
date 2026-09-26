/**
 * ============================================================================
 * PRISMA DATABASE ORM SERVICE (PrismaService)
 * ============================================================================
 * WHAT:
 *   NestJS wrapper around PrismaClient connecting to PostgreSQL.
 *   Manages explicit connection initialization (`$connect` on module init)
 *   and graceful teardown (`$disconnect` on module destroy).
 *
 * WHY:
 *   Provides type-safe database queries across all NestJS modules, shares connection
 *   pooling configurations, and cleanly closes connections during application shutdowns.
 *
 * HOW IT CONNECTS:
 *   - Connection String: Configured via `DATABASE_URL` in `.env`.
 *   - Target Database: PostgreSQL 15 schema `public`.
 * ============================================================================
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
