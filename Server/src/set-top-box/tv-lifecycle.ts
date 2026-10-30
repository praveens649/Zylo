import { randomInt } from 'crypto';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { tvConfig } from './tv.config.js';
import {
  actualPausedDays,
  addDays,
  capAddOnEnd,
  computeGraceEnd,
  computeRenewalEnd,
  DAY_MS,
  RENT_PERIOD_DAYS,
} from './tv-rules.js';

export type Tx = Prisma.TransactionClient;

export const TV_ORDER_TYPES = ['SET_TOP_BOX_ORDER', 'TV_PACK_PURCHASE'] as const;

export function notify(tx: Tx, userId: string, title: string, message: string) {
  return tx.notification.create({ data: { userId, title, message } });
}

export function randomRef(prefix: string): string {
  return `${prefix}-${String(randomInt(0, 1_000_000)).padStart(6, '0')}`;
}

/** Picks a reference that is unused at the moment of the check (unique index is the final guard). */
export async function uniqueRef(
  prefix: string,
  exists: (ref: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const ref = randomRef(prefix);
    if (!(await exists(ref))) return ref;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Activates every PENDING subscription of a connection (called when the
 * installation is completed). Returns the base pack end date.
 */
export async function activatePendingSubscriptions(
  tx: Tx,
  connectionId: string,
  now: Date,
): Promise<Date | null> {
  const subs = await tx.tvSubscription.findMany({
    where: { connectionId, status: 'PENDING' },
    include: { tvPlan: true },
  });
  let baseEnd: Date | null = null;
  // Base packs first so add-ons can be capped at the base end date.
  const ordered = [...subs].sort((a, b) =>
    a.tvPlan.type === b.tvPlan.type ? 0 : a.tvPlan.type === 'BASE' ? -1 : 1,
  );
  for (const s of ordered) {
    let endDate = addDays(now, s.tvPlan.validityDays);
    if (s.tvPlan.type === 'ADD_ON') endDate = capAddOnEnd(endDate, baseEnd);
    await tx.tvSubscription.update({
      where: { id: s.id },
      data: { status: 'ACTIVE', startDate: now, endDate },
    });
    if (s.tvPlan.type === 'BASE' && (!baseEnd || endDate > baseEnd)) baseEnd = endDate;
  }
  return baseEnd;
}

/**
 * Applies a paid TV_PACK_PURCHASE (renewal or add-on). Idempotent: only a
 * PENDING subscription is touched, so a repeated call changes nothing.
 */
export async function applyPaidPackPurchase(tx: Tx, orderId: string, now: Date) {
  const sub = await tx.tvSubscription.findUnique({
    where: { orderId },
    include: { tvPlan: true },
  });
  if (!sub || sub.status !== 'PENDING') return;

  const conn = await tx.setTopBoxConnection.findUnique({ where: { id: sub.connectionId } });
  if (!conn) return;

  let currentEnd: Date | null = null;
  if (sub.tvPlan.type === 'BASE') {
    currentEnd = conn.planExpiredAt;
  } else {
    const same = await tx.tvSubscription.findFirst({
      where: { connectionId: conn.id, tvPlanId: sub.tvPlanId, status: 'ACTIVE', id: { not: sub.id } },
      orderBy: { endDate: 'desc' },
    });
    currentEnd = same?.endDate ?? null;
  }

  let endDate = computeRenewalEnd(currentEnd, now, sub.tvPlan.validityDays);
  // An add-on ends with the base pack it was bought under — buying a 30-day
  // add-on with 12 days of base left gives 12 days, not 30.
  if (sub.tvPlan.type === 'ADD_ON') {
    const activeBase = await tx.tvSubscription.findFirst({
      where: { connectionId: conn.id, status: 'ACTIVE', tvPlan: { type: 'BASE' } },
      orderBy: { endDate: 'desc' },
    });
    endDate = capAddOnEnd(endDate, activeBase?.endDate ?? conn.planExpiredAt);
  }
  const startDate = currentEnd && currentEnd > now ? currentEnd : now;

  await tx.tvSubscription.update({
    where: { id: sub.id },
    data: { status: 'ACTIVE', startDate, endDate },
  });

  if (sub.tvPlan.type === 'BASE') {
    await tx.setTopBoxConnection.update({
      where: { id: conn.id },
      data: {
        planExpiredAt: endDate,
        ...(conn.status === 'GRACE_PERIOD' || conn.status === 'SUSPENDED'
          ? { status: 'ACTIVE', gracePeriodEndsAt: null }
          : {}),
      },
    });
  }
  await notify(
    tx,
    conn.userId,
    'Zylo TV pack activated',
    `${sub.tvPlan.name} is active on ${conn.connectionNumber} until ${endDate.toDateString()}.`,
  );
}

/**
 * Resumes a paused connection and extends the pack end dates by the days
 * actually paused. Returns false when there was nothing to resume (safe to repeat).
 */
export async function resumeConnection(tx: Tx, connectionId: string, now: Date): Promise<boolean> {
  const conn = await tx.setTopBoxConnection.findUnique({ where: { id: connectionId } });
  if (!conn || conn.status !== 'PAUSED' || !conn.pausedAt || !conn.pauseEndsAt) return false;

  const planned = Math.max(1, Math.round((conn.pauseEndsAt.getTime() - conn.pausedAt.getTime()) / DAY_MS));
  const actual = actualPausedDays(conn.pausedAt, now, planned);

  const claimed = await tx.setTopBoxConnection.updateMany({
    where: { id: connectionId, status: 'PAUSED' },
    data: {
      status: 'ACTIVE',
      pausedAt: null,
      pauseEndsAt: null,
      pauseDaysUsed: Math.max(0, conn.pauseDaysUsed - (planned - actual)),
      planExpiredAt: conn.planExpiredAt ? addDays(conn.planExpiredAt, actual) : null,
    },
  });
  if (claimed.count === 0) return false;

  const subs = await tx.tvSubscription.findMany({ where: { connectionId, status: 'PAUSED' } });
  for (const s of subs) {
    await tx.tvSubscription.update({
      where: { id: s.id },
      data: { status: 'ACTIVE', endDate: s.endDate ? addDays(s.endDate, actual) : null },
    });
  }
  await notify(
    tx,
    conn.userId,
    'Zylo TV resumed',
    `${conn.connectionNumber} is active again. Your pack was extended by ${actual} day(s).`,
  );
  return true;
}

export interface LifecycleResult {
  resumed: number;
  expiredSubscriptions: number;
  gracePeriod: number;
  suspended: number;
}

/** Daily job body. Every transition is guarded by its current status, so running it twice is safe. */
export async function runLifecycleTick(
  prisma: PrismaService,
  now: Date = new Date(),
): Promise<LifecycleResult> {
  const result: LifecycleResult = { resumed: 0, expiredSubscriptions: 0, gracePeriod: 0, suspended: 0 };

  const paused = await prisma.setTopBoxConnection.findMany({
    where: { status: 'PAUSED', pauseEndsAt: { lte: now } },
    select: { id: true },
  });
  for (const c of paused) {
    if (await prisma.$transaction((tx) => resumeConnection(tx, c.id, now))) result.resumed++;
  }

  result.expiredSubscriptions = (
    await prisma.tvSubscription.updateMany({
      where: { status: 'ACTIVE', endDate: { lt: now } },
      data: { status: 'EXPIRED' },
    })
  ).count;

  const expiring = await prisma.setTopBoxConnection.findMany({
    where: { status: 'ACTIVE', planExpiredAt: { lt: now } },
  });
  for (const c of expiring) {
    const moved = await prisma.$transaction(async (tx) => {
      const r = await tx.setTopBoxConnection.updateMany({
        where: { id: c.id, status: 'ACTIVE', planExpiredAt: { lt: now } },
        data: {
          status: 'GRACE_PERIOD',
          gracePeriodEndsAt: computeGraceEnd(c.planExpiredAt!, tvConfig.graceDays),
        },
      });
      if (r.count === 1) {
        await notify(tx, c.userId, 'Zylo TV pack expired', `${c.connectionNumber} is in a ${tvConfig.graceDays}-day grace period. Renew to avoid suspension.`);
      }
      return r.count === 1;
    });
    if (moved) result.gracePeriod++;
  }

  const lapsed = await prisma.setTopBoxConnection.findMany({
    where: { status: 'GRACE_PERIOD', gracePeriodEndsAt: { lt: now } },
  });
  for (const c of lapsed) {
    const moved = await prisma.$transaction(async (tx) => {
      const r = await tx.setTopBoxConnection.updateMany({
        where: { id: c.id, status: 'GRACE_PERIOD', gracePeriodEndsAt: { lt: now } },
        data: { status: 'SUSPENDED' },
      });
      if (r.count === 1) {
        await notify(tx, c.userId, 'Zylo TV suspended', `${c.connectionNumber} has been suspended. Renew your pack to restore service.`);
      }
      return r.count === 1;
    });
    if (moved) result.suspended++;
  }

  return result;
}

// ------------------------------------------------------------- rental autopay
//
// Rent coverage is derived, not stored: the box order already includes month 1
// rent, so every COMPLETED SET_TOP_BOX_ORDER on the connection pays one month.
// Monthly rent orders are SET_TOP_BOX_ORDER rows with setTopBoxModelId = null —
// that is how they are told apart from the original box purchase.

export function rentPaidUntilFrom(activatedAt: Date, paidMonths: number): Date {
  return addDays(activatedAt, RENT_PERIOD_DAYS * paidMonths);
}

export interface RentChargeOutcome {
  ok: boolean;
  paymentIntentId?: string;
  message?: string;
}

/** Injected so the billing loop itself stays Stripe-free and unit-testable. */
export type RentCharger = (
  conn: { id: string; connectionNumber: string },
  amountPaise: number,
  orderId: string,
) => Promise<RentChargeOutcome>;

export interface RentalBillingResult {
  charged: number;
  toManualPay: number;
  skippedPending: number;
}

/**
 * Monthly rent collection for RENTAL connections. For every connection whose
 * paid coverage has run out it creates a payable rent order, then tries the
 * saved card off-session:
 *  - success → order + payment complete, coverage rolls forward one month
 *  - failure → order stays PENDING so the customer can pay it from My TV;
 *    the pending order also stops the next tick from retrying or stacking
 * Safe to rerun: paid-month counting and the pending-order guard are both
 * idempotent, and the Stripe charge uses the order id as idempotency key.
 */
export async function runRentalBilling(
  prisma: PrismaService,
  now: Date,
  charge: RentCharger,
): Promise<RentalBillingResult> {
  const result: RentalBillingResult = { charged: 0, toManualPay: 0, skippedPending: 0 };

  const conns = await prisma.setTopBoxConnection.findMany({
    where: {
      ownership: 'RENTAL',
      status: { in: ['ACTIVE', 'PAUSED', 'GRACE_PERIOD', 'SUSPENDED'] },
      activatedAt: { not: null },
    },
    include: { model: { select: { rentalPerMonth: true } } },
  });

  for (const conn of conns) {
    const rent = conn.model.rentalPerMonth;
    if (!rent || Number(rent) <= 0) continue;

    const paidMonths = await prisma.order.count({
      where: {
        setTopBoxConnectionId: conn.id,
        type: 'SET_TOP_BOX_ORDER',
        status: 'COMPLETED',
      },
    });
    if (rentPaidUntilFrom(conn.activatedAt!, paidMonths).getTime() > now.getTime()) continue;

    // Any pending SET_TOP_BOX_ORDER on an already-activated connection is a
    // rent order (the original box order is COMPLETED before installation).
    const pending = await prisma.order.findFirst({
      where: {
        setTopBoxConnectionId: conn.id,
        type: 'SET_TOP_BOX_ORDER',
        status: 'PENDING',
      },
      select: { id: true },
    });
    if (pending) {
      result.skippedPending++;
      continue;
    }

    // The order is created before charging so a process crash still leaves a
    // payable order (and never a double charge — the Stripe call keys on it).
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          userId: conn.userId,
          type: 'SET_TOP_BOX_ORDER',
          status: 'PENDING',
          amount: rent,
          currency: tvConfig.currency,
          simId: conn.simId,
          setTopBoxConnectionId: conn.id,
          setTopBoxModelId: null, // rent order — not a box purchase
        },
      });
      await tx.payment.create({
        data: {
          userId: conn.userId,
          orderId: o.id,
          type: 'SUBSCRIPTION',
          status: 'PENDING',
          amount: rent,
          currency: tvConfig.currency,
          description: `Monthly box rent — ${conn.connectionNumber}`,
        },
      });
      return o;
    });

    const outcome = await charge(
      { id: conn.id, connectionNumber: conn.connectionNumber },
      Math.round(Number(rent) * 100),
      order.id,
    );
    if (!outcome.ok) {
      result.toManualPay++;
      await prisma.$transaction((tx) =>
        notify(
          tx,
          conn.userId,
          'Zylo TV rent autopay failed',
          `We could not charge your saved card for ${conn.connectionNumber} (${outcome.message ?? 'card declined'}). Pay the pending rent order from My TV.`,
        ),
      );
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: 'COMPLETED' } });
      await tx.payment.update({
        where: { orderId: order.id },
        data: { status: 'SUCCEEDED', paidAt: now, stripePaymentIntentId: outcome.paymentIntentId },
      });
      const covered = rentPaidUntilFrom(conn.activatedAt!, paidMonths + 1);
      await notify(
        tx,
        conn.userId,
        'Zylo TV rent auto-debited',
        `Monthly rent for ${conn.connectionNumber} was charged to your saved card. Box covered till ${covered.toDateString()}.`,
      );
    });
    result.charged++;
  }

  return result;
}
