import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import type { SubscriptionStatus } from '../generated/prisma/enums.js';
import type { UserModel } from '../generated/prisma/models.js';

function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const itemEnd = sub.items?.data?.[0]?.current_period_end;
  const legacyEnd = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const unix = itemEnd ?? legacyEnd;
  return unix ? new Date(unix * 1000) : null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const ref =
    invoice.parent?.subscription_details?.subscription ??
    (invoice as unknown as { subscription?: string | { id: string } | null })
      .subscription;
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

function toSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIALING';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELLED';
    case 'incomplete_expired':
      return 'EXPIRED';
    case 'unpaid':
      return 'UNPAID';
    default:
      return 'INCOMPLETE';
  }
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private _stripe?: Stripe;

  private get stripe(): Stripe {
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

  private get frontendUrl(): string {
    const raw =
      process.env.FRONTEND_URL ??
      process.env.CLIENT_URL ??
      'http://localhost:3000';
    return raw.split(',')[0].trim().replace(/\/+$/, '');
  }

  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // One-Time Checkout Sessions
  // -----------------------------------------------------------------------

  async createCheckoutSession(
    user: { id: string; email: string },
    opts: {
      amount: number;
      currency?: string;
      name: string;
      description?: string;
      successUrl?: string;
      cancelUrl?: string;
    },
  ) {
    const currency = (opts.currency || 'usd').toLowerCase();
    const amountInCents = Math.round(opts.amount * 100);

    if (amountInCents <= 0) {
      throw new ApiException(
        400,
        'INVALID_AMOUNT',
        'Amount must be greater than zero',
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountInCents,
            product_data: {
              name: opts.name,
              description: opts.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'one_time',
        userId: user.id,
      },
      success_url:
        opts.successUrl ||
        `${this.frontendUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: opts.cancelUrl || `${this.frontendUrl}/payments/cancel`,
    });

    await this.prisma.payment.create({
      data: {
        userId: user.id,
        type: 'ONE_TIME',
        status: 'PENDING',
        amount: opts.amount,
        currency,
        description: opts.name,
        stripeCheckoutSessionId: session.id,
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  // -----------------------------------------------------------------------
  // Subscriptions
  // -----------------------------------------------------------------------

  async createSubscriptionCheckout(
    user: { id: string; email: string },
    opts: {
      priceId: string;
      planName?: string;
      successUrl?: string;
      cancelUrl?: string;
    },
  ) {
    const metadata = {
      type: 'subscription',
      userId: user.id,
      planName: opts.planName ?? '',
    };

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: opts.priceId, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      success_url:
        opts.successUrl ||
        `${this.frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        opts.cancelUrl || `${this.frontendUrl}/subscription?cancelled=true`,
    });

    return { sessionId: session.id, url: session.url };
  }

  /** The user's stored subscription record (null when never subscribed). */
  async getSubscription(userId: string) {
    return this.prisma.subscription.findUnique({
      where: { userId },
    });
  }

  /**
   * Sync a user's subscription from Stripe if missing or inactive in the local DB.
   */
  async syncUserSubscriptionFromStripe(user: { id: string; email: string }) {
    const existing = await this.getSubscription(user.id);
    if (existing && existing.status === 'active') {
      return existing;
    }

    try {
      const sessions = await this.stripe.checkout.sessions.list({
        limit: 10,
      });
      const userSession = sessions.data.find(
        (s) =>
          s.mode === 'subscription' &&
          (s.status === 'complete' || s.payment_status === 'paid') &&
          (s.client_reference_id === user.id ||
            s.metadata?.userId === user.id ||
            s.customer_email?.toLowerCase() === user.email.toLowerCase()),
      );

      if (userSession && userSession.subscription) {
        const subId = idOf(userSession.subscription);
        if (subId) {
          const subscription =
            await this.stripe.subscriptions.retrieve(subId);
          await this.syncSubscription(subscription, {
            userId: user.id,
            stripeCustomerId: idOf(userSession.customer) ?? undefined,
            planName: userSession.metadata?.planName ?? undefined,
          });
          return this.getSubscription(user.id);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not sync subscription from Stripe: ${msg}`);
    }

    return existing;
  }

  /**
   * Verify a checkout session directly against Stripe.
   */
  async verifyCheckoutSession(
    sessionId: string,
    user: UserModel,
  ): Promise<{ verified: boolean; session?: Record<string, unknown> }> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    const sessionUserId =
      session.client_reference_id ?? session.metadata?.userId;
    if (
      sessionUserId &&
      sessionUserId !== user.id &&
      user.role !== 'SUPER_ADMIN'
    ) {
      throw new ApiException(
        403,
        'FORBIDDEN',
        'This checkout session belongs to another user',
      );
    }

    if (session.status === 'complete' || session.payment_status === 'paid') {
      if (session.mode === 'subscription') {
        const subscriptionId = idOf(session.subscription);
        if (subscriptionId) {
          const subscription =
            await this.stripe.subscriptions.retrieve(subscriptionId);
          await this.syncSubscription(subscription, {
            userId: session.client_reference_id ?? user.id,
            stripeCustomerId: idOf(session.customer) ?? undefined,
            planName: session.metadata?.planName ?? undefined,
          });
        }
      } else {
        await this.handlePaymentSessionCompleted(session);
      }

      return {
        verified: true,
        session: session as unknown as Record<string, unknown>,
      };
    }

    return {
      verified: false,
      session: session as unknown as Record<string, unknown>,
    };
  }

  /**
   * Create a Stripe Billing Customer Portal session so users can manage their payment
   * methods, view invoices, or cancel subscriptions directly on Stripe.
   */
  async createCustomerPortalSession(userId: string, returnUrl?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new ApiException(
        400,
        'NO_STRIPE_CUSTOMER',
        'No active billing customer found for this account',
      );
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl || `${this.frontendUrl}/subscription`,
    });

    return { url: session.url };
  }

  // -----------------------------------------------------------------------
  // Webhook event handlers
  // -----------------------------------------------------------------------

  async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.mode === 'payment') {
      return this.handlePaymentSessionCompleted(session);
    }

    const subscriptionId = idOf(session.subscription);
    if (!subscriptionId) {
      this.logger.warn(
        `checkout.session.completed ${session.id} had no subscription`,
      );
      return;
    }

    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);
    await this.syncSubscription(subscription, {
      userId: session.client_reference_id ?? undefined,
      stripeCustomerId: idOf(session.customer) ?? undefined,
      planName: session.metadata?.planName ?? undefined,
    });
  }

  private async handlePaymentSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripeCheckoutSessionId: session.id },
    });

    if (!payment) {
      // If payment record wasn't pre-created, create it
      const userId = session.client_reference_id ?? session.metadata?.userId;
      if (userId) {
        await this.prisma.payment.create({
          data: {
            userId,
            type: 'ONE_TIME',
            status: 'SUCCEEDED',
            amount: (session.amount_total ?? 0) / 100,
            currency: session.currency || 'usd',
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: idOf(session.payment_intent),
            paidAt: new Date(),
          },
        });
      }
      return;
    }

    if (payment.status === 'SUCCEEDED') return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCEEDED',
        paidAt: new Date(),
        stripePaymentIntentId: idOf(session.payment_intent),
      },
    });
  }

  async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = invoiceSubscriptionId(invoice);
    if (subscriptionId) {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);
      await this.syncSubscription(subscription);
    }

    // Record payment if user is found
    const customerId = idOf(invoice.customer);
    if (customerId) {
      const sub = await this.prisma.subscription.findUnique({
        where: { stripeCustomerId: customerId },
      });
      if (sub?.userId) {
        const paymentIntent = (
          invoice as unknown as {
            payment_intent?: string | { id: string } | null;
          }
        ).payment_intent;
        await this.prisma.payment.upsert({
          where: { stripeInvoiceId: invoice.id },
          update: {
            status: 'SUCCEEDED',
            paidAt: new Date(),
          },
          create: {
            userId: sub.userId,
            type: 'SUBSCRIPTION',
            status: 'SUCCEEDED',
            amount: (invoice.amount_paid ?? 0) / 100,
            currency: invoice.currency || 'usd',
            stripeInvoiceId: invoice.id,
            stripePaymentIntentId: idOf(paymentIntent),
            paidAt: new Date(),
          },
        });
      }
    }
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoiceSubscriptionId(invoice);
    if (!subscriptionId) return;

    await this.prisma.subscription
      .update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: 'past_due',
          subscriptionStatus: 'PAST_DUE',
        },
      })
      .catch(() => {});
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    await this.syncSubscription(subscription);
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.prisma.subscription
      .update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: 'canceled',
          subscriptionStatus: 'CANCELLED',
          cancelAtPeriodEnd: false,
        },
      })
      .catch(() => {});
  }

  private async syncSubscription(
    subscription: Stripe.Subscription,
    extras: {
      userId?: string;
      stripeCustomerId?: string;
      planName?: string;
    } = {},
  ) {
    const userId =
      extras.userId ?? subscription.metadata?.userId ?? undefined;
    const stripeCustomerId =
      extras.stripeCustomerId ?? idOf(subscription.customer);

    const existing =
      (await this.prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
      })) ??
      (userId
        ? await this.prisma.subscription.findUnique({
            where: { userId },
          })
        : null);

    const resolvedUserId = userId ?? existing?.userId;
    if (!resolvedUserId) {
      this.logger.warn(
        `Subscription ${subscription.id} has no resolvable userId — skipped`,
      );
      return;
    }

    const priceId = idOf(subscription.items?.data?.[0]?.price);
    const planName =
      extras.planName ??
      subscription.metadata?.planName ??
      existing?.plan ??
      null;

    const interval =
      subscription.items?.data?.[0]?.price?.recurring?.interval ?? null;

    const data = {
      userId: resolvedUserId,
      stripeCustomerId:
        stripeCustomerId ?? existing?.stripeCustomerId ?? null,
      stripePriceId: priceId ?? existing?.stripePriceId ?? null,
      plan: planName,
      billingInterval: interval,
      status: subscription.status,
      subscriptionStatus: toSubscriptionStatus(subscription.status),
      currentPeriodEnd: subscriptionPeriodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          stripeSubscriptionId: subscription.id,
          ...data,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          stripeSubscriptionId: subscription.id,
          ...data,
        },
      });
    }
  }
}
