import { Module } from '@nestjs/common';
import { RechargeModule } from '../recharge/recharge.module.js';
import { StripeService } from './stripe.service.js';
import { StripeController } from './stripe.controller.js';
import { StripeWebhookController } from './stripe-webhook.controller.js';

/**
 * Self-contained Stripe module:
 *   POST /api/v1/stripe/checkout               — one-time checkout session (JWT)
 *   POST /api/v1/stripe/subscription/checkout  — subscription checkout session (JWT)
 *   GET  /api/v1/stripe/subscription/me        — current subscription record (JWT)
 *   POST /api/v1/stripe/subscription/verify    — verify checkout session (JWT)
 *   POST /api/v1/stripe/portal                 — customer billing portal (JWT)
 *   POST /api/v1/stripe/webhook                — Stripe event receiver (signature)
 */
@Module({
  imports: [RechargeModule],
  controllers: [StripeController, StripeWebhookController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
