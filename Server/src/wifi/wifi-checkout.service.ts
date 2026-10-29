import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { UserModel } from '../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { getStripeClient } from '../stripe/stripe-client.js';
import type { AddOnDto, RenewDto, WifiCheckoutDto } from './dto.js';
import { wifiConfig } from './wifi.config.js';
import { checkPlanEligibility, addDays, startOfDay } from './wifi-rules.js';
import { notify, WIFI_ORDER_TYPES, uniqueRef, type Tx } from './wifi-lifecycle.js';
import { WifiFulfilmentService } from './wifi-fulfilment.service.js';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/**
 * Where Stripe sends the customer back to. Uses the browser's own Origin when it is
 * an allowed client (or localhost in development), so a different dev port still works;
 * otherwise falls back to the configured URL.
 */
export function returnBase(origin?: string): string {
  const configured = (process.env.FRONTEND_URL ?? process.env.CLIENT_URL ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (origin) {
    try {
      const u = new URL(origin);
      const dev = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(u.hostname);
      if (configured.includes(u.origin) || dev) return u.origin;
    } catch {
      /* ignore malformed origin */
    }
  }
  return configured[0];
}

export interface SyncOrderResult {
  status: string;
  paid: boolean;
  /** Stripe's own session state (open / complete / expired), when the order is still unpaid. */
  sessionStatus?: string;
}

@Injectable()
export class WifiCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fulfilment: WifiFulfilmentService,
  ) {}

  /** Percent discount on plan prices when the SIM belongs to the customer and is ACTIVE. */
  private async bundleDiscount(
    tx: Tx,
    userId: string,
    simId: string | null | undefined,
    planTotal: Prisma.Decimal,
    strict: boolean,
  ) {
    if (!simId) return { simId: null, discount: D(0) };
    const sim = await tx.sim.findFirst({
      where: { id: simId, userId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!sim) {
      if (strict) {
        throw new ApiException(400, 'SIM_NOT_ELIGIBLE', 'The selected SIM must be your own active Zylo SIM');
      }
      return { simId: null, discount: D(0) };
    }
    const discount = planTotal.mul(wifiConfig.simBundleDiscountPercent).div(100).toDecimalPlaces(2);
    return { simId: sim.id, discount };
  }

  // -------------------------------------------------------------- checkout

  async checkout(user: UserModel, dto: WifiCheckoutDto, origin?: string) {
    const now = new Date();
    const preferred = new Date(dto.preferredDate);
    if (preferred < startOfDay(now) || preferred > addDays(now, 60)) {
      throw new ApiException(400, 'INVALID_INSTALL_DATE', 'Preferred installation date must be within the next 60 days');
    }
    const addOnIds = dto.addOnPlanIds ?? [];

    const created = await this.prisma.$transaction(async (tx) => {
      const device = await tx.wifiDevice.findFirst({ where: { id: dto.deviceId, isActive: true } });
      if (!device) throw new ApiException(404, 'DEVICE_NOT_FOUND', 'Router model not available');

      const hardware =
        dto.ownership === 'PURCHASE'
          ? device.purchasePrice
          : device.rentalPerMonth
            ? device.rentalPerMonth.add(device.securityDeposit ?? 0)
            : null;
      if (hardware === null || hardware === undefined) {
        throw new ApiException(400, 'OWNERSHIP_NOT_OFFERED', `This router is not offered for ${dto.ownership.toLowerCase()}`);
      }

      const base = await tx.wifiPlan.findFirst({ where: { id: dto.basePlanId, isActive: true, type: 'BASE' } });
      if (!base) throw new ApiException(400, 'INVALID_BASE_PLAN', 'Choose an active base plan');
      const addOns = addOnIds.length
        ? await tx.wifiPlan.findMany({ where: { id: { in: addOnIds }, isActive: true, type: 'ADD_ON' } })
        : [];
      if (addOns.length !== addOnIds.length) {
        throw new ApiException(400, 'INVALID_ADD_ON', 'One or more add-ons are unavailable');
      }

      for (const p of [base, ...addOns]) {
        const err = checkPlanEligibility({
          planType: p.type,
          planRequiresTriBand: p.requiresTriBand,
          deviceBand: device.band,
          hasActiveBase: true,
        });
        if (err) throw new ApiException(400, err, `${p.name}: ${err === 'PLAN_REQUIRES_TRI_BAND_ROUTER' ? 'requires a tri-band router' : 'needs an active base plan'}`);
      }

      const inStock = await tx.wifiDeviceUnit.count({ where: { deviceId: device.id, status: 'IN_STOCK' } });
      const reserved = await tx.wifiConnection.count({
        where: { deviceId: device.id, unitId: null, status: 'PENDING_INSTALLATION' },
      });
      if (inStock - reserved <= 0) {
        throw new ApiException(409, 'OUT_OF_STOCK', 'This router is currently out of stock');
      }

      const planTotal = [base, ...addOns].reduce((s, p) => s.add(p.price), D(0));
      const { simId, discount } = await this.bundleDiscount(tx, user.id, dto.simId, planTotal, true);
      const amount = D(hardware).add(planTotal).sub(discount);

      const order = await tx.order.create({
        data: {
          userId: user.id,
          type: 'WIFI_ORDER',
          status: 'PENDING',
          amount,
          currency: wifiConfig.currency,
          simId,
          wifiDeviceId: device.id,
          wifiPlanId: base.id,
        },
      });

      const connectionNumber = await uniqueRef('ZWF', async (ref) =>
        !!(await tx.wifiConnection.findUnique({ where: { connectionNumber: ref }, select: { id: true } })),
      );
      const connection = await tx.wifiConnection.create({
        data: {
          connectionNumber,
          userId: user.id,
          deviceId: device.id,
          simId,
          ownership: dto.ownership,
          status: 'PENDING_INSTALLATION',
          addressLine: dto.addressLine,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          contactPhone: dto.contactPhone,
        },
      });
      await tx.order.update({ where: { id: order.id }, data: { wifiConnectionId: connection.id } });

      await tx.wifiSubscription.create({
        data: { connectionId: connection.id, wifiPlanId: base.id, orderId: order.id, status: 'PENDING' },
      });
      for (const a of addOns) {
        await tx.wifiSubscription.create({
          data: { connectionId: connection.id, wifiPlanId: a.id, status: 'PENDING' },
        });
      }
      await tx.wifiInstallation.create({
        data: {
          connectionId: connection.id,
          type: dto.installationType ?? 'TECHNICIAN',
          status: 'REQUESTED',
          preferredDate: preferred,
          preferredSlot: dto.preferredSlot,
          customerNotes: dto.customerNotes,
        },
      });

      const description = [
        `${device.name} (${dto.ownership.toLowerCase()})`,
        base.name,
        ...addOns.map((a) => a.name),
      ].join(' + ');
      return { order, connection, amount, description };
    });

    try {
      const session = await this.createStripeSession(user, created.order.id, created.amount, `Zylo WiFi ${created.connection.connectionNumber}`, created.description, origin);
      return {
        orderId: created.order.id,
        connectionId: created.connection.id,
        connectionNumber: created.connection.connectionNumber,
        amount: created.amount.toString(),
        currency: wifiConfig.currency,
        sessionId: session.sessionId,
        url: session.url,
      };
    } catch (err) {
      await this.cancelUnpaid(created.order.id);
      throw err;
    }
  }

  // ------------------------------------------------- renew / add-on plans

  async renew(user: UserModel, connectionId: string, dto: RenewDto, origin?: string) {
    return this.planPurchase(user, connectionId, 'renew', dto.wifiPlanId, origin);
  }

  async addOn(user: UserModel, connectionId: string, dto: AddOnDto, origin?: string) {
    return this.planPurchase(user, connectionId, 'add-on', dto.wifiPlanId, origin);
  }

  private async planPurchase(
    user: UserModel,
    connectionId: string,
    kind: 'renew' | 'add-on',
    requestedPlanId?: string,
    origin?: string,
  ) {
    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const conn = await tx.wifiConnection.findFirst({
        where: { id: connectionId, userId: user.id },
        include: { device: true },
      });
      if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'WiFi connection not found');

      let planId = requestedPlanId;
      if (kind === 'renew') {
        if (!['ACTIVE', 'GRACE_PERIOD', 'SUSPENDED'].includes(conn.status)) {
          throw new ApiException(409, 'RENEWAL_NOT_ALLOWED', `A ${conn.status.toLowerCase()} connection cannot be renewed`);
        }
        if (!planId) {
          const current = await tx.wifiSubscription.findFirst({
            where: { connectionId, wifiPlan: { type: 'BASE' }, status: { in: ['ACTIVE', 'EXPIRED'] } },
            orderBy: { createdAt: 'desc' },
          });
          planId = current?.wifiPlanId;
        }
        if (!planId) throw new ApiException(400, 'PLAN_REQUIRED', 'Choose a base plan to renew');
      } else if (conn.status !== 'ACTIVE') {
        throw new ApiException(409, 'ADD_ON_NOT_ALLOWED', 'Add-ons can only be bought on an active connection');
      }

      const plan = await tx.wifiPlan.findFirst({
        where: { id: planId!, isActive: true, type: kind === 'renew' ? 'BASE' : 'ADD_ON' },
      });
      if (!plan) throw new ApiException(400, 'INVALID_PLAN', 'Plan is unavailable');

      const activeBase = await tx.wifiSubscription.findFirst({
        where: { connectionId, status: 'ACTIVE', endDate: { gt: now }, wifiPlan: { type: 'BASE' } },
      });
      const err = checkPlanEligibility({
        planType: plan.type,
        planRequiresTriBand: plan.requiresTriBand,
        deviceBand: conn.device.band,
        hasActiveBase: !!activeBase,
      });
      if (err) throw new ApiException(400, err, err === 'PLAN_REQUIRES_TRI_BAND_ROUTER' ? 'This plan requires a tri-band router' : 'An active base plan is required for add-ons');

      const { simId, discount } = await this.bundleDiscount(tx, user.id, conn.simId, plan.price, false);
      const amount = plan.price.sub(discount);

      const order = await tx.order.create({
        data: {
          userId: user.id,
          type: 'WIFI_PLAN_PURCHASE',
          status: 'PENDING',
          amount,
          currency: wifiConfig.currency,
          simId,
          wifiPlanId: plan.id,
          wifiConnectionId: conn.id,
        },
      });
      await tx.wifiSubscription.create({
        data: { connectionId: conn.id, wifiPlanId: plan.id, orderId: order.id, status: 'PENDING' },
      });
      return { order, conn, plan, amount };
    });

    try {
      const session = await this.createStripeSession(
        user,
        created.order.id,
        created.amount,
        `${created.plan.name} — ${created.conn.connectionNumber}`,
        kind === 'renew' ? 'Zylo WiFi plan renewal' : 'Zylo WiFi add-on',
        origin,
      );
      return {
        orderId: created.order.id,
        amount: created.amount.toString(),
        currency: wifiConfig.currency,
        sessionId: session.sessionId,
        url: session.url,
      };
    } catch (err) {
      await this.cancelUnpaid(created.order.id);
      throw err;
    }
  }

  // ---------------------------------------------------------------- stripe

  private stripeOrThrow() {
    const stripe = getStripeClient();
    if (!stripe) {
      throw new ApiException(503, 'STRIPE_NOT_CONFIGURED', 'Payments are not configured on this server');
    }
    return stripe;
  }

  private async createStripeSession(
    user: UserModel,
    orderId: string,
    amount: Prisma.Decimal,
    name: string,
    description: string,
    origin?: string,
  ) {
    const session = await this.openSession(user, orderId, amount, name, description, origin);
    await this.prisma.payment.create({
      data: {
        userId: user.id,
        orderId,
        type: 'ONE_TIME',
        status: 'PENDING',
        amount,
        currency: wifiConfig.currency,
        description: name,
        stripeCheckoutSessionId: session.id,
      },
    });
    return { sessionId: session.id, url: session.url };
  }

  private async openSession(
    user: UserModel,
    orderId: string,
    amount: Prisma.Decimal,
    name: string,
    description: string,
    origin?: string,
  ) {
    const stripe = this.stripeOrThrow();
    const base = returnBase(origin);
    const unitAmount = Math.round(amount.mul(100).toNumber());
    if (unitAmount <= 0) throw new ApiException(400, 'INVALID_AMOUNT', 'Amount must be greater than zero');

    const metadata = { kind: 'wifi', orderId, userId: user.id };
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        client_reference_id: user.id,
        line_items: [
          {
            price_data: {
              currency: wifiConfig.currency,
              unit_amount: unitAmount,
              product_data: { name, description },
            },
            quantity: 1,
          },
        ],
        metadata,
        payment_intent_data: { metadata },
        success_url: `${base}/wifi/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/wifi/my?payment=cancelled`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ApiException(502, 'STRIPE_API_FAILED', `Stripe operation failed: ${msg}`);
    }
    return session;
  }

  // ----------------------------------------- pending payments (My WiFi)

  private async ownedPendingOrder(user: UserModel, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: user.id, type: { in: [...WIFI_ORDER_TYPES] } },
      include: { payment: true, wifiConnection: { select: { connectionNumber: true } }, wifiPlan: { select: { name: true } } },
    });
    if (!order) throw new ApiException(404, 'ORDER_NOT_FOUND', 'Order not found');
    return order;
  }

  /**
   * Asks Stripe whether the order's checkout session was paid and, if so, confirms it.
   * Idempotent. This heals the cases where the webhook is not running or the browser
   * never came back from Stripe.
   */
  async syncOrder(user: UserModel, orderId: string): Promise<SyncOrderResult> {
    const order = await this.ownedPendingOrder(user, orderId);
    if (order.status !== 'PENDING') return { status: order.status, paid: order.status === 'COMPLETED' };

    const sessionId = order.payment?.stripeCheckoutSessionId;
    if (!sessionId) return { status: order.status, paid: false };

    const session = await this.stripeOrThrow().checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      await this.prisma.payment.updateMany({
        where: { id: order.payment!.id, status: { not: 'SUCCEEDED' } },
        data: {
          status: 'SUCCEEDED',
          paidAt: new Date(),
          stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null),
        },
      });
      await this.fulfilment.onOrderPaid(order.id);
      return { status: 'COMPLETED', paid: true };
    }
    return { status: order.status, paid: false, sessionStatus: session.status ?? undefined };
  }

  /** "Pay again": reuses the still-open Stripe session, or opens a fresh one for the same order. */
  async retryPayment(user: UserModel, orderId: string, origin?: string) {
    const synced = await this.syncOrder(user, orderId);
    if (synced.paid) return { alreadyPaid: true, url: null as string | null };

    const order = await this.ownedPendingOrder(user, orderId);
    if (order.status !== 'PENDING') {
      throw new ApiException(409, 'ORDER_NOT_PAYABLE', `This order is ${order.status.toLowerCase()} and can no longer be paid`);
    }

    const stripe = this.stripeOrThrow();
    const oldId = order.payment?.stripeCheckoutSessionId;
    if (oldId) {
      const old = await stripe.checkout.sessions.retrieve(oldId);
      if (old.status === 'open' && old.url) return { alreadyPaid: false, url: old.url };
    }

    const name =
      order.type === 'WIFI_ORDER'
        ? `Zylo WiFi ${order.wifiConnection?.connectionNumber ?? ''}`.trim()
        : `${order.wifiPlan?.name ?? 'Zylo WiFi plan'} — ${order.wifiConnection?.connectionNumber ?? ''}`.trim();
    const description = order.type === 'WIFI_ORDER' ? 'Zylo WiFi router and plan' : 'Zylo WiFi plan';
    const session = await this.openSession(user, order.id, order.amount, name, description, origin);

    if (order.payment) {
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: { stripeCheckoutSessionId: session.id, status: 'PENDING' },
      });
    } else {
      await this.prisma.payment.create({
        data: { userId: user.id, orderId: order.id, type: 'ONE_TIME', status: 'PENDING', amount: order.amount, currency: wifiConfig.currency, description: name, stripeCheckoutSessionId: session.id },
      });
    }
    return { alreadyPaid: false, url: session.url };
  }

  /** Customer gives up on an unpaid order. Refuses if Stripe says it was actually paid. */
  async cancelPending(user: UserModel, orderId: string) {
    const synced = await this.syncOrder(user, orderId);
    if (synced.paid) {
      throw new ApiException(409, 'ORDER_ALREADY_PAID', 'This order was already paid, so it cannot be cancelled here');
    }
    const order = await this.ownedPendingOrder(user, orderId);
    if (order.status !== 'PENDING') {
      throw new ApiException(409, 'ORDER_NOT_CANCELLABLE', `This order is already ${order.status.toLowerCase()}`);
    }
    const sessionId = order.payment?.stripeCheckoutSessionId;
    if (sessionId) {
      try {
        await this.stripeOrThrow().checkout.sessions.expire(sessionId);
      } catch {
        /* session already expired or completed — the sync above handled completed */
      }
    }
    await this.prisma.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    await this.cancelUnpaid(orderId);
    return { status: 'CANCELLED' };
  }

  /** Rolls back an unpaid order (Stripe session creation failed). */
  async cancelUnpaid(orderId: string) {
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (r.count === 0) return;
      const order = await tx.order.findUnique({ where: { id: orderId } });
      await tx.wifiSubscription.updateMany({
        where: { orderId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (order?.type === 'WIFI_ORDER' && order.wifiConnectionId) {
        await tx.wifiSubscription.updateMany({
          where: { connectionId: order.wifiConnectionId, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        await tx.wifiInstallation.updateMany({
          where: { connectionId: order.wifiConnectionId, status: 'REQUESTED' },
          data: { status: 'CANCELLED' },
        });
        await tx.wifiConnection.updateMany({
          where: { id: order.wifiConnectionId, status: 'PENDING_INSTALLATION' },
          data: { status: 'CANCELLED' },
        });
        await notify(tx, order.userId, 'Zylo WiFi order cancelled', 'Your unpaid WiFi order was cancelled.');
      }
    });
  }
}
