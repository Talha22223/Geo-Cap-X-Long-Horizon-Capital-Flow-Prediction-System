/**
 * ============================================================================
 * SUBSCRIPTIONS & BILLING CONTROLLER (SubscriptionsController)
 * ============================================================================
 * WHAT:
 *   Handles all subscription and billing HTTP endpoints:
 *   - GET  /api/v1/subscriptions/plans: Lists active tiers (Free $0, Pro $129, Enterprise $499)
 *   - GET  /api/v1/subscriptions/current: Retrieves active plan, limits, and period status
 *   - POST /api/v1/subscriptions/checkout-session: Initiates Stripe Checkout session or activates Free tier
 *   - POST /api/v1/subscriptions/verify-session: Validates Stripe redirect return and activates subscription
 *   - POST /api/v1/subscriptions/activate-free: Activates Free Sandbox tier for user organization
 *   - POST /api/v1/subscriptions/cancel: Marks subscription for cancellation at period end
 *   - POST /api/v1/subscriptions/portal-session: Launches Stripe Customer Billing Portal
 *   - POST /api/v1/subscriptions/webhook: Ingests asynchronous Stripe billing webhook events
 *
 * WHY:
 *   Orchestrates institutional monetisation, multi-tier plan quotas, and Stripe lifecycle.
 *
 * HOW IT CONNECTS:
 *   - Web Client: Called from `/plans`, `/subscription/success`, `/billing`, and settings.
 *   - Provider: Delegates payment session creation and verification to StripeProvider.
 *   - Database: Updates Prisma `Subscription`, `Invoice`, and `Payment` models.
 * ============================================================================
 */

import { Controller, Get, Post, Body, Param, UseGuards, Req, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CheckoutSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Plan ID is required to launch session' })
  planId!: string;
}

export class VerifySessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Session ID is required' })
  sessionId!: string;
}

@ApiTags('Subscriptions & Billing')
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly subsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all active subscription plan tiers (Free, Pro, Enterprise)' })
  async listPlans() {
    return this.subsService.listPlans();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('current')
  @ApiOperation({ summary: 'Get active subscription and limit counters for the authenticated user' })
  async getCurrentSubscription(@Req() req: any) {
    return this.subsService.getCurrentSubscription(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('checkout-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate a Stripe Checkout session or activate Free tier' })
  async createCheckoutSession(@Req() req: any, @Body() dto: CheckoutSessionDto) {
    return this.subsService.createCheckoutSession(req.user.id, dto.planId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Stripe checkout completion and update subscription' })
  async verifySession(@Req() req: any, @Body() dto: VerifySessionDto) {
    return this.subsService.verifyCheckoutSession(req.user.id, dto.sessionId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('activate-free')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate Free tier for the user organization' })
  async activateFree(@Req() req: any) {
    return this.subsService.activateFreePlan(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  async cancelSubscription(@Req() req: any) {
    return this.subsService.cancelSubscription(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('portal-session')
  @ApiOperation({ summary: 'Create Stripe Billing Portal session' })
  async createPortalSession(@Req() req: any) {
    return this.subsService.createPortalSession(req.user.id);
  }

  // Backwards compatibility endpoint
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':orgId')
  @ApiOperation({ summary: 'Get active subscription and limits for an organization' })
  async getActiveSubscription(@Param('orgId') orgId: string) {
    return this.subsService.getCurrentSubscription(orgId);
  }

  // Backwards compatibility endpoint
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':orgId/stripe-session')
  @ApiOperation({ summary: 'Legacy checkout session starter' })
  async legacyStripeSession(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CheckoutSessionDto
  ) {
    return this.subsService.createCheckoutSession(req.user.id, dto.planId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process Stripe billing notifications (Invoice, Subscriptions)' })
  async handleWebhook(@Body() event: any) {
    return this.subsService.handleWebhook(event);
  }
}
