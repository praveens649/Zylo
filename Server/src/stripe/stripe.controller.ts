import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { StripeService } from './stripe.service.js';
import {
  CreateCheckoutSessionDto,
  CreatePortalSessionDto,
  CreateSubscriptionCheckoutDto,
} from './dto.js';

@Controller('stripe')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class StripeController {
  constructor(private readonly stripe: StripeService) {}

  /**
   * Create a one-time checkout session (e.g. for credits, products, or service fees).
   */
  @Post('checkout')
  async createCheckout(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser() user: UserModel,
  ): Promise<{ data: { sessionId: string; url: string | null } }> {
    const data = await this.stripe.createCheckoutSession(user, dto);
    return { data };
  }

  /**
   * Start a recurring subscription checkout session.
   */
  @Post('subscription/checkout')
  async createSubscriptionCheckout(
    @Body() dto: CreateSubscriptionCheckoutDto,
    @CurrentUser() user: UserModel,
  ): Promise<{ data: { sessionId: string; url: string | null } }> {
    const data = await this.stripe.createSubscriptionCheckout(user, dto);
    return { data };
  }

  /**
   * Get the current authenticated user's subscription.
   */
  @Get('subscription/me')
  async mySubscription(
    @CurrentUser() user: UserModel,
  ): Promise<{ data: unknown }> {
    let subscription = await this.stripe.getSubscription(user.id);
    if (!subscription || subscription.status !== 'active') {
      subscription = await this.stripe.syncUserSubscriptionFromStripe(user);
    }
    return { data: subscription ?? null };
  }

  /**
   * Verify checkout session directly against Stripe.
   */
  @Post('subscription/verify')
  async verifySession(
    @Query('session_id') sessionId: string,
    @CurrentUser() user: UserModel,
  ): Promise<{ data: { verified: boolean; session?: Record<string, unknown> } }> {
    const data = await this.stripe.verifyCheckoutSession(sessionId, user);
    return { data };
  }

  /**
   * Create a Stripe Customer Portal session so the customer can manage
   * their payment methods and subscriptions on Stripe.
   */
  @Post('portal')
  async createCustomerPortal(
    @Body() dto: CreatePortalSessionDto,
    @CurrentUser() user: UserModel,
  ): Promise<{ data: { url: string } }> {
    const data = await this.stripe.createCustomerPortalSession(
      user.id,
      dto.returnUrl,
    );
    return { data };
  }
}
