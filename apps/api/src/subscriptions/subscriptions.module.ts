import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { StripeProvider } from './stripe.provider.js';

@Module({
  providers: [SubscriptionsService, StripeProvider],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, StripeProvider],
})
export class SubscriptionsModule {}
