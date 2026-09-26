/**
 * ============================================================================
 * SUBSCRIPTION GATE GUARD (SubscriptionGateGuard) - ENTITLEMENT ENFORCEMENT
 * ============================================================================
 * WHAT:
 *   Server-side authorization guard enforcing subscription tiers and feature limits.
 *   Validates:
 *     1. Active Subscription: Checks if status is ACTIVE or TRIALING and unexpired.
 *     2. Tier Requirement: Enforces 'pro' or 'enterprise' minimum tiers.
 *     3. Quota Limits: Evaluates numeric usage limits (e.g., maxQueries) against
 *        monthly audit logs or boolean feature flags.
 *     4. Super Admin Bypass: Allows SUPER_ADMIN or `admin@gmail.com` to bypass restrictions.
 *
 * WHY:
 *   Prevents users from bypassing plan restrictions by manipulating client-side state.
 *   Enforces true server-side monetization and enterprise plan entitlements.
 *
 * HOW IT CONNECTS:
 *   - Decorators: Used alongside `@RequireActiveSubscription()`, `@RequirePlan('pro'|'enterprise')`,
 *     and `@RequireSubscriptionLimit('key')`.
 *   - Database: Queries Prisma `Subscription` and `SubscriptionPlan` models if
 *     not already populated on `req.user.subscription`.
 * ============================================================================
 */

import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service.js';
import { SubscriptionStatus } from '@prisma/client';

export const SUBSCRIPTION_LIMIT_KEY = 'subscription_limit_key';
export const REQUIRE_ACTIVE_SUBSCRIPTION_KEY = 'require_active_subscription';
export const REQUIRED_PLAN_KEY = 'required_plan';

@Injectable()
export class SubscriptionGateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireActive = this.reflector.getAllAndOverride<boolean>(REQUIRE_ACTIVE_SUBSCRIPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPlan = this.reflector.getAllAndOverride<'pro' | 'enterprise'>(REQUIRED_PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredLimitKey = this.reflector.getAllAndOverride<string>(SUBSCRIPTION_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no subscription gate metadata is set, allow
    if (!requireActive && !requiredPlan && !requiredLimitKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication session is required to access this resource.');
    }

    // Super Admin bypass
    if (user.role === 'SUPER_ADMIN' || user.email === 'admin@gmail.com') {
      return true;
    }

    // Determine target subscription
    let subscription = user.subscription;
    if (!subscription || typeof subscription.isActive === 'undefined') {
      // Resolve from database
      const membership = await this.prisma.organizationMember.findFirst({
        where: { userId: user.id },
        include: {
          organization: {
            include: {
              subscriptions: {
                include: { plan: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      const subRecord = membership?.organization?.subscriptions?.[0] || null;
      const isSubActive =
        subRecord &&
        (subRecord.status === SubscriptionStatus.ACTIVE || subRecord.status === SubscriptionStatus.TRIALING) &&
        new Date(subRecord.currentPeriodEnd) > new Date();

      subscription = subRecord
        ? {
            id: subRecord.id,
            planName: subRecord.plan.name,
            status: subRecord.status,
            isActive: !!isSubActive,
            limits: subRecord.plan.features,
            currentPeriodEnd: subRecord.currentPeriodEnd,
          }
        : null;
    }

    // 1. Verify Active Subscription
    if (requireActive || requiredPlan || requiredLimitKey) {
      if (!subscription || !subscription.isActive) {
        throw new ForbiddenException({
          message: 'An active subscription is required to access institutional intelligence. Please select a plan.',
          code: 'SUBSCRIPTION_REQUIRED',
        });
      }
    }

    // 2. Verify Plan Tier Requirement (e.g. Pro or Enterprise)
    if (requiredPlan) {
      const currentPlanName = (subscription?.planName || '').toLowerCase();
      if (requiredPlan === 'enterprise') {
        if (currentPlanName !== 'enterprise') {
          throw new ForbiddenException({
            message: 'This advanced institutional feature requires an Enterprise tier subscription.',
            code: 'PLAN_UPGRADE_REQUIRED',
            requiredPlan: 'Enterprise',
            currentPlan: subscription?.planName,
          });
        }
      } else if (requiredPlan === 'pro') {
        if (currentPlanName !== 'pro' && currentPlanName !== 'enterprise') {
          throw new ForbiddenException({
            message: 'This feature requires a Pro Trader or Enterprise tier subscription.',
            code: 'PLAN_UPGRADE_REQUIRED',
            requiredPlan: 'Pro',
            currentPlan: subscription?.planName,
          });
        }
      }
    }

    // 3. Feature Flags or Numeric Limits check
    if (requiredLimitKey && subscription?.limits) {
      const features = subscription.limits as Record<string, any>;

      // Boolean flag
      if (typeof features[requiredLimitKey] === 'boolean') {
        if (!features[requiredLimitKey]) {
          throw new ForbiddenException({
            message: `Your current plan (${subscription.planName}) does not support this feature.`,
            code: 'FEATURE_NOT_PERMITTED',
          });
        }
      }

      // Numeric limit check (e.g., maxQueries)
      if (typeof features[requiredLimitKey] === 'number') {
        const maxCount = features[requiredLimitKey];
        if (maxCount !== -1) {
          const queryCount = await this.prisma.auditLog.count({
            where: {
              userId: user.id,
              action: 'predictions.generate',
              timestamp: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          });
          if (queryCount >= maxCount) {
            throw new ForbiddenException({
              message: `You have reached the monthly prediction quota for your plan (${maxCount} queries).`,
              code: 'QUOTA_EXCEEDED',
            });
          }
        }
      }
    }

    return true;
  }
}
