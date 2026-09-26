export interface CreateCheckoutSessionParams {
  organizationId: string;
  userId: string;
  planId: string;
  planName: string;
  planPrice: number;
  priceCode?: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface PaymentProvider {
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ sessionId: string; url: string }>;
  verifyCheckoutSession(sessionId: string): Promise<any>;
  cancelSubscription(stripeSubscriptionId: string): Promise<void>;
  createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }>;
}
