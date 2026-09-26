/**
 * ============================================================================
 * PASSPORT JWT AUTHENTICATION STRATEGY (JwtStrategy)
 * ============================================================================
 * WHAT:
 *   Validates JSON Web Tokens attached to incoming HTTP requests.
 *   Extracts the token from either:
 *     1. Bearer Authorization header (`Authorization: Bearer <token>`)
 *     2. Cookies (`geocapx_auth_token` or `accessToken`)
 *   In the `validate` method, looks up the user in PostgreSQL, verifies their
 *   account status (active, non-deleted), resolves their primary organization
 *   and current subscription tier, and attaches the resulting user object to `req.user`.
 *
 * WHY:
 *   Ensures stateless, secure API authentication while always hydrating live,
 *   authoritative subscription and permission state from PostgreSQL onto the request.
 *
 * HOW IT CONNECTS:
 *   - Used by: `JwtAuthGuard` applied across protected controllers and routes.
 *   - Sets: `req.user` with `{ id, email, role, permissions, organizationId, subscription }`.
 * ============================================================================
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { type JwtPayload, UserPermission } from '@geocap-x/shared';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          return req?.cookies?.geocapx_auth_token || req?.cookies?.accessToken || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'geocap-x-enterprise-default-secret-token-key',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        profile: true,
      },
    });
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User session has expired or user does not exist');
    }

    // Role-to-Permissions map
    const rolePermissions: Record<string, UserPermission[]> = {
      SUPER_ADMIN: [
        UserPermission.SYSTEM_ADMIN,
        UserPermission.MANAGE_USERS,
        UserPermission.VIEW_AUDIT_LOGS,
        UserPermission.READ_ANALYTICS,
        UserPermission.WRITE_ANALYTICS,
        UserPermission.READ_MARKET_DATA,
      ],
      ADMIN: [
        UserPermission.SYSTEM_ADMIN,
        UserPermission.MANAGE_USERS,
        UserPermission.VIEW_AUDIT_LOGS,
        UserPermission.READ_ANALYTICS,
        UserPermission.WRITE_ANALYTICS,
        UserPermission.READ_MARKET_DATA,
      ],
      ANALYST: [
        UserPermission.READ_ANALYTICS,
        UserPermission.WRITE_ANALYTICS,
        UserPermission.READ_MARKET_DATA,
      ],
      ENTERPRISE: [
        UserPermission.READ_ANALYTICS,
        UserPermission.WRITE_ANALYTICS,
        UserPermission.READ_MARKET_DATA,
      ],
      USER: [
        UserPermission.READ_ANALYTICS,
        UserPermission.READ_MARKET_DATA,
      ],
    };

    // Retrieve active subscription
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            subscriptions: {
              include: { plan: true },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const activeSub = membership?.organization?.subscriptions?.[0] || null;
    const isSubActive =
      activeSub &&
      (activeSub.status === 'ACTIVE' || activeSub.status === 'TRIALING') &&
      new Date(activeSub.currentPeriodEnd) > new Date();

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.profile?.firstName || null,
      lastName: user.profile?.lastName || null,
      organizationId: membership?.organizationId || null,
      organizationName: membership?.organization?.name || null,
      permissions: rolePermissions[user.role] || [],
      subscription: activeSub
        ? {
            id: activeSub.id,
            planId: activeSub.planId,
            planName: activeSub.plan.name,
            status: activeSub.status,
            isActive: !!isSubActive,
            limits: activeSub.plan.features,
            currentPeriodEnd: activeSub.currentPeriodEnd,
          }
        : null,
    };
  }
}

