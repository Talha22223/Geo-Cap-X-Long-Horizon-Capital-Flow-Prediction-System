/**
 * ============================================================================
 * SUBSCRIPTIONS SERVICE (SubscriptionsService) - BILLING & PLAN MANAGEMENT
 * ============================================================================
 * WHAT:
 *   Core business logic service managing institutional subscription tiers:
 *   1. `listPlans`: Fetches active SubscriptionPlan tiers (Free, Pro, Enterprise).
 *   2. `getCurrentSubscription`: Retrieves live subscription status and feature quotas.
 *   3. `createCheckoutSession`: Launches Stripe Checkout or auto-activates Free tier.
 *   4. `verifyCheckoutSession`: Confirms Stripe session ID upon browser return,
 *      activates subscription in PostgreSQL, and generates initial Invoice & Payment.
 *   5. `activateFreePlan`: Activates the 30-day Free tier without external payment.
 *   6. `handleWebhook`: Idempotent Stripe webhook processor handling checkout completion,
 *      recurring invoice payments, plan upgrades, downgrades, and cancellations.
 *   7. `cancelSubscription`: Marks subscription to cancel at the end of current period.
 *   8. `createPortalSession`: Generates Stripe self-service billing portal session.
 *
 * WHY:
 *   Guarantees that subscription entitlements in the database reflect live Stripe state,
 *   supporting seamless upgrades from Free ($0) to Pro ($129/mo) or Enterprise ($499/mo).
 *
 * MODIFICATION GUIDE:
 *   - Change Tier Pricing / Limits: Stored in `subscription_plans` table, seeded via `sync_plans.js`.
 *   - Stripe Webhook Events: Handled in `handleWebhook` switch-case block at line 349.
 * ============================================================================
 */

import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { SubscriptionStatus } from '@prisma/client';
import { StripeProvider } from './stripe.provider.js';

export interface BillingPlanLimits {
  maxQueries: number;
  allowApiKeys: boolean;
  maxOrganizations: number;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private stripeProvider: StripeProvider,
  ) {}

  // 1. List Available Plans
  async listPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      interval: p.interval,
      features: p.features,
      priceCode: p.priceCode,
      isActive: p.isActive,
    }));
  }

  // 2. Get User Organization Active Subscription details and Limits
  async getCurrentSubscription(userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId },
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

    if (!membership) {
      throw new NotFoundException('No organization found for this user');
    }

    const subscription = membership.organization.subscriptions[0];
    if (!subscription) {
      return {
        hasSubscription: false,
        status: 'UNPAID',
        isActive: false,
        plan: null,
      };
    }

    const limits = subscription.plan.features as unknown as BillingPlanLimits;
    const isSubActive =
      (subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.TRIALING) &&
      new Date(subscription.currentPeriodEnd) > new Date();

    return {
      hasSubscription: true,
      id: subscription.id,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      planName: subscription.plan.name,
      planId: subscription.planId,
      status: subscription.status,
      isActive: isSubActive,
      price: Number(subscription.plan.price),
      interval: subscription.plan.interval,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      limits: {
        maxQueries: limits?.maxQueries ?? 100,
        allowApiKeys: limits?.allowApiKeys ?? false,
        maxOrganizations: limits?.maxOrganizations ?? 1,
      },
    };
  }

  // 3. Initiate Real Stripe Checkout Session or Activate Free Plan
  async createCheckoutSession(userId: string, planId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        orgMemberships: {
          include: { organization: true },
          take: 1,
        },
      },
    });

    if (!user || !user.orgMemberships[0]) {
      throw new NotFoundException('User or personal organization not found.');
    }

    const org = user.orgMemberships[0].organization;

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException('Requested subscription plan does not exist.');
    }

    // Free Plan: Directly activate without external credit card charge
    if (plan.name === 'Free' || Number(plan.price) === 0) {
      await this.activateFreePlan(userId);
      return {
        freeActivated: true,
        redirectUrl: '/dashboard',
        message: 'Free subscription plan successfully activated.',
      };
    }

    // Paid Plan: Create Stripe Checkout Session
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}&plan_id=${plan.id}`;
    const cancelUrl = `${frontendUrl}/plans?cancelled=true`;

    const session = await this.stripeProvider.createCheckoutSession({
      organizationId: org.id,
      userId: user.id,
      planId: plan.id,
      planName: plan.name,
      planPrice: Number(plan.price),
      priceCode: plan.priceCode || (plan.name === 'Pro' ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_ENTERPRISE_PRICE_ID),
      successUrl,
      cancelUrl,
      customerEmail: user.email,
    });

    return {
      success: true,
      freeActivated: false,
      checkoutUrl: session.url,
      sessionId: session.sessionId,
    };
  }

  // 4. Verify Stripe Checkout Session on return
  async verifyCheckoutSession(userId: string, sessionId: string) {
    if (!sessionId) {
      throw new BadRequestException('Session ID is required to verify checkout.');
    }

    const verified = await this.stripeProvider.verifyCheckoutSession(sessionId);
    if (verified.paymentStatus !== 'paid' && verified.status !== 'complete') {
      throw new BadRequestException('Payment was not completed. Status: ' + verified.paymentStatus);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { orgMemberships: true },
    });

    if (!user || !user.orgMemberships[0]) {
      throw new NotFoundException('User organization not found');
    }

    const orgId = verified.metadata?.organizationId || user.orgMemberships[0].organizationId;
    const planId = verified.metadata?.planId;

    let targetPlan = null;
    if (planId) {
      targetPlan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    }
    if (!targetPlan && verified.metadata?.planName) {
      targetPlan = await this.prisma.subscriptionPlan.findUnique({ where: { name: verified.metadata.planName } });
    }
    if (!targetPlan) {
      // Default to Pro if not specified
      targetPlan = await this.prisma.subscriptionPlan.findUnique({ where: { name: 'Pro' } });
    }

    if (!targetPlan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Upsert / update subscription for organization
    const existingSub = await this.prisma.subscription.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    let updatedSub;
    if (existingSub) {
      updatedSub = await this.prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          planId: targetPlan.id,
          status: SubscriptionStatus.ACTIVE,
          stripeSubscriptionId: verified.subscriptionId || existingSub.stripeSubscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        include: { plan: true },
      });
    } else {
      updatedSub = await this.prisma.subscription.create({
        data: {
          organizationId: orgId,
          planId: targetPlan.id,
          status: SubscriptionStatus.ACTIVE,
          stripeSubscriptionId: verified.subscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });
    }

    // Record invoice & payment if available
    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          subscriptionId: updatedSub.id,
          stripeInvoiceId: `inv_${sessionId.slice(-16)}`,
          amount: targetPlan.price,
          status: 'paid',
        },
      });

      await this.prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          stripePaymentId: `pay_${sessionId.slice(-16)}`,
          amount: targetPlan.price,
          status: 'succeeded',
          paymentMethod: 'card',
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not save invoice/payment record: ${e.message}`);
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        userEmail: user.email,
        action: 'subscription.checkout_verified',
        resource: 'subscriptions',
        details: { plan: targetPlan.name, sessionId, stripeSubscriptionId: verified.subscriptionId },
      },
    });

    return {
      success: true,
      message: `Your ${targetPlan.name} subscription is now fully active!`,
      plan: targetPlan.name,
      status: 'ACTIVE',
      currentPeriodEnd: periodEnd,
    };
  }

  // 5. Activate Free Plan
  async activateFreePlan(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { orgMemberships: true },
    });

    if (!user || !user.orgMemberships[0]) {
      throw new NotFoundException('User organization not found');
    }

    const orgId = user.orgMemberships[0].organizationId;
    const freePlan = await this.prisma.subscriptionPlan.findUnique({ where: { name: 'Free' } });
    if (!freePlan) {
      throw new NotFoundException('Free plan not found');
    }

    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const existingSub = await this.prisma.subscription.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    if (existingSub) {
      await this.prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          organizationId: orgId,
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        userEmail: user.email,
        action: 'subscription.free_activated',
        resource: 'subscriptions',
        details: { plan: 'Free' },
      },
    });

    return {
      success: true,
      plan: 'Free',
      status: 'ACTIVE',
      currentPeriodEnd: periodEnd,
    };
  }

  // 6. Stripe-Ready Billing Webhook Processor (Idempotent)
  async handleWebhook(event: { type: string; data: any }) {
    const { type, data } = event;
    this.logger.log(`Processing Stripe billing webhook event: ${type}`);

    switch (type) {
      case 'checkout.session.completed': {
        const session = data.object;
        const orgId = session.metadata?.organizationId;
        const planId = session.metadata?.planId;
        const stripeSubscriptionId = session.subscription;

        if (orgId && planId) {
          const sub = await this.prisma.subscription.findFirst({
            where: { organizationId: orgId },
          });

          if (sub) {
            await this.prisma.subscription.update({
              where: { id: sub.id },
              data: {
                planId,
                status: SubscriptionStatus.ACTIVE,
                stripeSubscriptionId: stripeSubscriptionId || sub.stripeSubscriptionId,
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                cancelAtPeriodEnd: false,
              },
            });
          }
        }
        break;
      }

      case 'invoice.paid': {
        const stripeSubscriptionId = data.object.subscription;
        const amountPaid = (data.object.amount_paid || 0) / 100;

        if (stripeSubscriptionId) {
          const sub = await this.prisma.subscription.findUnique({
            where: { stripeSubscriptionId },
          });

          if (sub) {
            await this.prisma.subscription.update({
              where: { id: sub.id },
              data: {
                status: SubscriptionStatus.ACTIVE,
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSubscriptionId = data.object.id;
        const statusMap: Record<string, SubscriptionStatus> = {
          active: SubscriptionStatus.ACTIVE,
          trialing: SubscriptionStatus.TRIALING,
          past_due: SubscriptionStatus.PAST_DUE,
          canceled: SubscriptionStatus.CANCELED,
          unpaid: SubscriptionStatus.UNPAID,
        };

        const status = statusMap[data.object.status] || SubscriptionStatus.ACTIVE;

        const sub = await this.prisma.subscription.findUnique({
          where: { stripeSubscriptionId },
        });

        if (sub) {
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status,
              currentPeriodStart: new Date(data.object.current_period_start * 1000),
              currentPeriodEnd: new Date(data.object.current_period_end * 1000),
              cancelAtPeriodEnd: !!data.object.cancel_at_period_end,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubscriptionId = data.object.id;
        const sub = await this.prisma.subscription.findUnique({
          where: { stripeSubscriptionId },
        });

        if (sub) {
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: SubscriptionStatus.CANCELED,
              cancelAtPeriodEnd: true,
            },
          });
        }
        break;
      }

      default:
        this.logger.log(`Billing webhook event unhandled: ${type}`);
    }

    return { received: true };
  }

  // 7. Cancel Subscription
  async cancelSubscription(userId: string) {
    const subInfo = await this.getCurrentSubscription(userId);
    if (!subInfo.hasSubscription || !subInfo.id) {
      throw new NotFoundException('No active subscription found to cancel.');
    }

    if (subInfo.stripeSubscriptionId) {
      await this.stripeProvider.cancelSubscription(subInfo.stripeSubscriptionId);
    }

    await this.prisma.subscription.update({
      where: { id: subInfo.id },
      data: { cancelAtPeriodEnd: true },
    });

    return {
      success: true,
      message: 'Subscription has been marked for cancellation at the end of the billing period.',
      currentPeriodEnd: subInfo.currentPeriodEnd,
    };
  }

  // 8. Create Portal Session
  async createPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orgMemberships: {
          include: {
            organization: {
              include: {
                subscriptions: true,
              },
            },
          },
        },
      },
    });

    const sub = user?.orgMemberships[0]?.organization?.subscriptions[0];
    const customerId = sub?.stripeSubscriptionId ? `cus_${sub.stripeSubscriptionId.slice(4, 18)}` : '';
    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/billing`;

    return this.stripeProvider.createPortalSession(customerId, returnUrl);
  }
}
