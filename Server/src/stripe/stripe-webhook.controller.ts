import {
  Controller,
  Post,
  Req,
  Headers,
} from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { ApiException } from '../common/api-error.js';
import { StripeService } from './stripe.service.js';

/**
 * Stripe webhook receiver.
 *
 * No AuthGuard — Stripe authenticates via the `stripe-signature` header,
 * which is verified against the raw request body (requires `rawBody: true`
 * in NestFactory.create).
 */
@Controller('stripe')
export class StripeWebhookController {
  private _stripe?: Stripe;
  private get stripe() {
    if (!this._stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new ApiException(
          500,
          'STRIPE_NOT_CONFIGURED',
          'Stripe is not configured on the server',
        );
      }
      this._stripe = new Stripe(key);
    }
    return this._stripe;
  }

  constructor(private readonly stripeService: StripeService) {}

  @Post('webhook')
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!req.rawBody || !signature) {
      throw new ApiException(
        400,
        'WEBHOOK_BODY_MISSING',
        'Missing webhook body or signature',
      );
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new ApiException(
        500,
        'STRIPE_NOT_CONFIGURED',
        'Stripe webhook secret is not configured on the server',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        secret,
      );
    } catch {
      throw new ApiException(
        400,
        'WEBHOOK_SIGNATURE_INVALID',
        'Invalid Stripe webhook signature',
      );
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.stripeService.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'invoice.paid':
        await this.stripeService.handleInvoicePaid(
          event.data.object as Stripe.Invoice,
        );
        break;

      case 'invoice.payment_failed':
        await this.stripeService.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;

      case 'customer.subscription.updated':
        await this.stripeService.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'customer.subscription.deleted':
        await this.stripeService.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
    }

    return { data: { received: true } };
  }
}
