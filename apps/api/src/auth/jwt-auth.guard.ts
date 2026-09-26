/**
 * ============================================================================
 * JWT AUTHENTICATION GUARD (JwtAuthGuard)
 * ============================================================================
 * WHAT:
 *   Standard NestJS route guard that triggers Passport's 'jwt' strategy.
 *   Intercepts incoming requests and verifies bearer tokens or auth cookies.
 *
 * WHY:
 *   Protects sensitive API endpoints from unauthenticated access. Throws 401
 *   Unauthorized if the token is missing, expired, or cryptographically invalid.
 *
 * USAGE:
 *   Apply to controllers or handlers via `@UseGuards(JwtAuthGuard)`.
 * ============================================================================
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

