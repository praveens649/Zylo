import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { UserModel } from '../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { getStripeClient } from '../stripe/stripe-client.js';
import type { AddOnDto, RenewDto, TvCheckoutDto } from './dto.js';
import { tvConfig } from './tv.config.js';
import { checkPackEligibility, addDays, startOfDay } from './tv-rules.js';
import { notify, uniqueRef, type Tx } from './tv-lifecycle.js';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

function frontendUrl(): string {
  const raw = process.env.FRONTEND_URL ?? process.env.CLIENT_URL ?? 'http://localhost:3000';
  return raw.split(',')[0].trim().replace(/\/+$/, '');
}

@Injectable()
export class TvCheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  /** Percent discount on pack prices when the SIM belongs to the customer and is ACTIVE. */
  private async bundleDiscount(
    tx: Tx,
    userId: string,
    simId: string | null | undefined,
    packTotal: Prisma.Decimal,
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
    const discount = packTotal.mul(tvConfig.simBundleDiscountPercent).div(100).toDecimalPlaces(2);
    return { simId: sim.id, discount };
  }

  // -------------------------------------------------------------- checkout

  async checkout(user: UserModel, dto: TvCheckoutDto) {
    const now = new Date();
    const preferred = new Date(dto.preferredDate);
    if (preferred < startOfDay(now) || preferred > addDays(now, 60)) {
      throw new ApiException(400, 'INVALID_INSTALL_DATE', 'Preferred installation date must be within the next 60 days');
    }
    const addOnIds = dto.addOnPlanIds ?? [];

    const created = await this.prisma.$transaction(async (tx) => {
      const model = await tx.setTopBoxModel.findFirst({ where: { id: dto.modelId, isActive: true } });
      if (!model) throw new ApiException(404, 'BOX_NOT_FOUND', 'Box model not available');

      const hardware =
        dto.ownership === 'PURCHASE'
          ? model.purchasePrice
          : model.rentalPerMonth
            ? model.rentalPerMonth.add(model.securityDeposit ?? 0)
            : null;
      if (hardware === null || hardware === undefined) {
        throw new ApiException(400, 'OWNERSHIP_NOT_OFFERED', `This box is not offered for ${dto.ownership.toLowerCase()}`);
      }

      const base = await tx.tvPlan.findFirst({ where: { id: dto.basePlanId, isActive: true, type: 'BASE' } });
      if (!base) throw new ApiException(400, 'INVALID_BASE_PLAN', 'Choose an active base pack');
      const addOns = addOnIds.length
        ? await tx.tvPlan.findMany({ where: { id: { in: addOnIds }, isActive: true, type: 'ADD_ON' } })
        : [];
      if (addOns.length !== addOnIds.length) {
        throw new ApiException(400, 'INVALID_ADD_ON', 'One or more add-on packs are unavailable');
      }

      for (const p of [base, ...addOns]) {
        const err = checkPackEligibility({
          planType: p.type,
          planRequires4k: p.requires4kBox,
          boxResolution: model.resolution,
          hasActiveBase: true,
        });
        if (err) throw new ApiException(400, err, `${p.name}: ${err === 'PACK_REQUIRES_4K_BOX' ? 'requires a 4K box' : 'needs an active base pack'}`);
      }

      const inStock = await tx.setTopBoxUnit.count({ where: { modelId: model.id, status: 'IN_STOCK' } });
      const reserved = await tx.setTopBoxConnection.count({
        where: { modelId: model.id, unitId: null, status: 'PENDING_INSTALLATION' },
      });
      if (inStock - reserved <= 0) {
        throw new ApiException(409, 'OUT_OF_STOCK', 'This box is currently out of stock');
      }

      const packTotal = [base, ...addOns].reduce((s, p) => s.add(p.price), D(0));
      const { simId, discount } = await this.bundleDiscount(tx, user.id, dto.simId, packTotal, true);
      const amount = D(hardware).add(packTotal).sub(discount);

      const order = await tx.order.create({
        data: {
          userId: user.id,
          type: 'SET_TOP_BOX_ORDER',
          status: 'PENDING',
          amount,
          currency: tvConfig.currency,
          simId,
          setTopBoxModelId: model.id,
          tvPlanId: base.id,
        },
      });

      const connectionNumber = await uniqueRef('ZTV', async (ref) =>
        !!(await tx.setTopBoxConnection.findUnique({ where: { connectionNumber: ref }, select: { id: true } })),
      );
      const connection = await tx.setTopBoxConnection.create({
        data: {
          connectionNumber,
          userId: user.id,
          modelId: model.id,
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
      await tx.order.update({ where: { id: order.id }, data: { setTopBoxConnectionId: connection.id } });

      await tx.tvSubscription.create({
        data: { connectionId: connection.id, tvPlanId: base.id, orderId: order.id, status: 'PENDING' },
      });
      for (const a of addOns) {
        await tx.tvSubscription.create({
          data: { connectionId: connection.id, tvPlanId: a.id, status: 'PENDING' },
        });
      }
      await tx.installationRequest.create({
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
        `${model.name} (${dto.ownership.toLowerCase()})`,
        base.name,
        ...addOns.map((a) => a.name),
      ].join(' + ');
      return { order, connection, amount, description };
    });

    try {
      const session = await this.createStripeSession(user, created.order.id, created.amount, `Zylo TV ${created.connection.connectionNumber}`, created.description);
      return {
        orderId: created.order.id,
        connectionId: created.connection.id,
        connectionNumber: created.connection.connectionNumber,
        amount: created.amount.toString(),
        currency: tvConfig.currency,
        sessionId: session.sessionId,
        url: session.url,
      };
    } catch (err) {
      await this.cancelUnpaid(created.order.id);
      throw err;
    }
  }

  // ------------------------------------------------- renew / add-on packs

  async renew(user: UserModel, connectionId: string, dto: RenewDto) {
    return this.packPurchase(user, connectionId, 'renew', dto.tvPlanId);
  }

  async addOn(user: UserModel, connectionId: string, dto: AddOnDto) {
    return this.packPurchase(user, connectionId, 'add-on', dto.tvPlanId);
  }

  private async packPurchase(
    user: UserModel,
    connectionId: string,
    kind: 'renew' | 'add-on',
    requestedPlanId?: string,
  ) {
    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const conn = await tx.setTopBoxConnection.findFirst({
        where: { id: connectionId, userId: user.id },
        include: { model: true },
      });
      if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'TV connection not found');

      let planId = requestedPlanId;
      if (kind === 'renew') {
        if (!['ACTIVE', 'GRACE_PERIOD', 'SUSPENDED'].includes(conn.status)) {
          throw new ApiException(409, 'RENEWAL_NOT_ALLOWED', `A ${conn.status.toLowerCase()} connection cannot be renewed`);
        }
        if (!planId) {
          const current = await tx.tvSubscription.findFirst({
            where: { connectionId, tvPlan: { type: 'BASE' }, status: { in: ['ACTIVE', 'EXPIRED'] } },
            orderBy: { createdAt: 'desc' },
          });
          planId = current?.tvPlanId;
        }
        if (!planId) throw new ApiException(400, 'PLAN_REQUIRED', 'Choose a base pack to renew');
      } else if (conn.status !== 'ACTIVE') {
        throw new ApiException(409, 'ADD_ON_NOT_ALLOWED', 'Add-ons can only be bought on an active connection');
      }

      const plan = await tx.tvPlan.findFirst({
        where: { id: planId!, isActive: true, type: kind === 'renew' ? 'BASE' : 'ADD_ON' },
      });
      if (!plan) throw new ApiException(400, 'INVALID_PLAN', 'Pack is unavailable');

      const activeBase = await tx.tvSubscription.findFirst({
        where: { connectionId, status: 'ACTIVE', endDate: { gt: now }, tvPlan: { type: 'BASE' } },
      });
      const err = checkPackEligibility({
        planType: plan.type,
        planRequires4k: plan.requires4kBox,
        boxResolution: conn.model.resolution,
        hasActiveBase: !!activeBase,
      });
      if (err) throw new ApiException(400, err, err === 'PACK_REQUIRES_4K_BOX' ? 'This pack requires a 4K box' : 'An active base pack is required for add-ons');

      const { simId, discount } = await this.bundleDiscount(tx, user.id, conn.simId, plan.price, false);
      const amount = plan.price.sub(discount);

      const order = await tx.order.create({
        data: {
          userId: user.id,
          type: 'TV_PACK_PURCHASE',
          status: 'PENDING',
          amount,
          currency: tvConfig.currency,
          simId,
          tvPlanId: plan.id,
          setTopBoxConnectionId: conn.id,
        },
      });
      await tx.tvSubscription.create({
        data: { connectionId: conn.id, tvPlanId: plan.id, orderId: order.id, status: 'PENDING' },
      });
      return { order, conn, plan, amount };
    });

    try {
      const session = await this.createStripeSession(
        user,
        created.order.id,
        created.amount,
        `${created.plan.name} — ${created.conn.connectionNumber}`,
        kind === 'renew' ? 'Zylo TV pack renewal' : 'Zylo TV add-on pack',
      );
      return {
        orderId: created.order.id,
        amount: created.amount.toString(),
        currency: tvConfig.currency,
        sessionId: session.sessionId,
        url: session.url,
      };
    } catch (err) {
      await this.cancelUnpaid(created.order.id);
      throw err;
    }
  }

  // ---------------------------------------------------------------- stripe

  private async createStripeSession(
    user: UserModel,
    orderId: string,
    amount: Prisma.Decimal,
    name: string,
    description: string,
  ) {
    const stripe = getStripeClient();
    if (!stripe) {
      throw new ApiException(503, 'STRIPE_NOT_CONFIGURED', 'Payments are not configured on this server');
    }
    const unitAmount = Math.round(amount.mul(100).toNumber());
    if (unitAmount <= 0) throw new ApiException(400, 'INVALID_AMOUNT', 'Amount must be greater than zero');

    const metadata = { kind: 'tv', orderId, userId: user.id };
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        client_reference_id: user.id,
        line_items: [
          {
            price_data: {
              currency: tvConfig.currency,
              unit_amount: unitAmount,
              product_data: { name, description },
            },
            quantity: 1,
          },
        ],
        metadata,
        payment_intent_data: { metadata },
        success_url: `${frontendUrl()}/tv/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl()}/tv?cancelled=true`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ApiException(502, 'STRIPE_API_FAILED', `Stripe operation failed: ${msg}`);
    }

    await this.prisma.payment.create({
      data: {
        userId: user.id,
        orderId,
        type: 'ONE_TIME',
        status: 'PENDING',
        amount,
        currency: tvConfig.currency,
        description: name,
        stripeCheckoutSessionId: session.id,
      },
    });
    return { sessionId: session.id, url: session.url };
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
      await tx.tvSubscription.updateMany({
        where: { orderId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (order?.type === 'SET_TOP_BOX_ORDER' && order.setTopBoxConnectionId) {
        await tx.tvSubscription.updateMany({
          where: { connectionId: order.setTopBoxConnectionId, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        await tx.installationRequest.updateMany({
          where: { connectionId: order.setTopBoxConnectionId, status: 'REQUESTED' },
          data: { status: 'CANCELLED' },
        });
        await tx.setTopBoxConnection.updateMany({
          where: { id: order.setTopBoxConnectionId, status: 'PENDING_INSTALLATION' },
          data: { status: 'CANCELLED' },
        });
        await notify(tx, order.userId, 'Zylo TV order cancelled', 'Your TV order could not be started and was cancelled.');
      }
    });
  }
}
