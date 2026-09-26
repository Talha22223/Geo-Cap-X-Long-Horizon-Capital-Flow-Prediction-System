import { SetMetadata } from '@nestjs/common';
import { SUBSCRIPTION_LIMIT_KEY, REQUIRE_ACTIVE_SUBSCRIPTION_KEY, REQUIRED_PLAN_KEY } from '../guards/subscription-gate.guard.js';

export const RequiresSubscriptionLimit = (limitKey: string) => SetMetadata(SUBSCRIPTION_LIMIT_KEY, limitKey);

export const RequireActiveSubscription = () => SetMetadata(REQUIRE_ACTIVE_SUBSCRIPTION_KEY, true);

export const RequirePlan = (plan: 'pro' | 'enterprise') => SetMetadata(REQUIRED_PLAN_KEY, plan);
