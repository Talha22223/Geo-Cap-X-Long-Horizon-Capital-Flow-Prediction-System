/**
 * ============================================================================
 * STRIPE PAYMENT PROVIDER (StripeProvider)
 * ============================================================================
 * WHAT:
 *   Wraps the official Stripe Node SDK (API version 2024-12-18.acacia) to provide:
 *   - `createCheckoutSession`: Creates Stripe Checkout sessions with dynamic recurring line items
 *     or configured price IDs (`priceCode`).
 *   - `verifyCheckoutSession`: Retrieves session status ('complete', 'paid') and metadata from Stripe API.
 *   - `constructWebhookEvent`: Validates cryptographic signatures using STRIPE_WEBHOOK_SECRET.
 *   - `cancelSubscription`: Updates subscriptions to cancel at period end via Stripe API.
 *   - `createPortalSession`: Generates customer self-service billing management portal sessions.
 *
 * WHY:
 *   Encapsulates all external Stripe communications behind the `PaymentProvider` interface,
 *   supporting test-mode sandboxing and zero-config dynamic recurring line items.
 *
 * ENVIRONMENT VARIABLES:
 *   - STRIPE_SECRET_KEY: Secret API key (starts with sk_test_ or sk_live_).
 *   - STRIPE_WEBHOOK_SECRET: Secret for verifying webhook event signatures (starts with whsec_).
 *   - STRIPE_PRO_PRICE_ID: Optional pre-configured Stripe Price ID for Pro tier.
 *   - STRIPE_ENTERPRISE_PRICE_ID: Optional pre-configured Stripe Price ID for Enterprise tier.
 * ============================================================================
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PaymentProvider, CreateCheckoutSessionParams } from './payment.interface.js';
import Stripe from 'stripe';

@Injectable()
export class StripeProvider implements PaymentProvider {
  private stripeClient: Stripe | null = null;
  private readonly logger = new Logger(StripeProvider.name);

  constructor() {
    this.initStripe();
  }

  private initStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey && secretKey.trim().length > 0 && !secretKey.includes('placeholder')) {
      try {
        this.stripeClient = new Stripe(secretKey, {
          apiVersion: '2024-12-18.acacia' as any,
          typescript: true,
        });
        this.logger.log('Stripe client initialized successfully in test mode.');
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Stripe client: ${err.message}`);
      }
    } else {
      this.logger.warn('STRIPE_SECRET_KEY is not set or empty. Real checkout will require STRIPE_SECRET_KEY.');
    }
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ sessionId: string; url: string }> {
    if (!this.stripeClient) {
      // Re-try initializing in case env var was set dynamically
      this.initStripe();
    }

    if (!this.stripeClient) {
      throw new BadRequestException(
        'Stripe is not configured on the server. Please set STRIPE_SECRET_KEY in your .env configuration to proceed with checkout.'
      );
    }

    try {
      // Build line_items: use priceCode if it's a valid Stripe price id; otherwise create recurring price_data
      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

      if (params.priceCode && params.priceCode.startsWith('price_')) {
        lineItems = [
          {
            price: params.priceCode,
            quantity: 1,
          },
        ];
      } else {
        // Dynamic subscription line item (works out of the box in any Stripe test mode account)
        lineItems = [
          {
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(params.planPrice * 100),
              recurring: {
                interval: 'month',
              },
              product_data: {
                name: `GeoCap-X ${params.planName} Plan`,
                description: `Institutional capital flow intelligence - ${params.planName} tier`,
              },
            },
            quantity: 1,
          },
        ];
      }

      const session = await this.stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'subscription',
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          organizationId: params.organizationId,
          userId: params.userId,
          planId: params.planId,
          planName: params.planName,
        },
      });

      if (!session.url) {
        throw new BadRequestException('Stripe did not return a checkout redirect URL');
      }

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (err: any) {
      this.logger.error(`Stripe checkout creation failed: ${err.message}`, err.stack);
      throw new BadRequestException(`Stripe Checkout Error: ${err.message}`);
    }
  }

  async verifyCheckoutSession(sessionId: string): Promise<any> {
    if (!this.stripeClient) {
      this.initStripe();
    }

    if (!this.stripeClient) {
      throw new BadRequestException('Stripe is not configured on the server.');
    }

    try {
      const session = await this.stripeClient.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });

      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;

      return {
        sessionId: session.id,
        status: session.status, // 'complete', 'open', 'expired'
        paymentStatus: session.payment_status, // 'paid', 'unpaid', 'no_payment_required'
        subscriptionId,
        customerId,
        metadata: session.metadata,
      };
    } catch (err: any) {
      this.logger.error(`Stripe verify session error: ${err.message}`);
      throw new BadRequestException(`Unable to verify Stripe checkout session: ${err.message}`);
    }
  }

  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.stripeClient) {
      this.initStripe();
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!this.stripeClient || !secret) {
      throw new BadRequestException('Stripe webhook secret or client not configured.');
    }

    return this.stripeClient.webhooks.constructEvent(payload, signature, secret);
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<void> {
    if (!this.stripeClient) {
      this.initStripe();
    }

    if (this.stripeClient && stripeSubscriptionId) {
      try {
        await this.stripeClient.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
        return;
      } catch (err: any) {
        this.logger.error(`Stripe cancel error: ${err.message}`);
        throw new BadRequestException(`Stripe Cancellation Error: ${err.message}`);
      }
    }
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    if (!this.stripeClient) {
      this.initStripe();
    }

    if (this.stripeClient && customerId) {
      try {
        const session = await this.stripeClient.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        });
        return { url: session.url };
      } catch (err: any) {
        this.logger.error(`Stripe portal error: ${err.message}`);
        throw new BadRequestException(`Stripe Portal Error: ${err.message}`);
      }
    }
    return { url: returnUrl };
  }
}
