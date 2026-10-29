import { randomInt } from 'crypto';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { wifiConfig } from './wifi.config.js';
import {
  actualPausedDays,
  addDays,
  computeGraceEnd,
  computeRenewalEnd,
  DAY_MS,
} from './wifi-rules.js';

export type Tx = Prisma.TransactionClient;

export const WIFI_ORDER_TYPES = ['WIFI_ORDER', 'WIFI_PLAN_PURCHASE'] as const;

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
 * installation is completed). Returns the base plan end date.
 */
export async function activatePendingSubscriptions(
  tx: Tx,
  connectionId: string,
  now: Date,
): Promise<Date | null> {
  const subs = await tx.wifiSubscription.findMany({
    where: { connectionId, status: 'PENDING' },
    include: { wifiPlan: true },
  });
  let baseEnd: Date | null = null;
  for (const s of subs) {
    const endDate = addDays(now, s.wifiPlan.validityDays);
    await tx.wifiSubscription.update({
      where: { id: s.id },
      data: { status: 'ACTIVE', startDate: now, endDate },
    });
    if (s.wifiPlan.type === 'BASE' && (!baseEnd || endDate > baseEnd)) baseEnd = endDate;
  }
  return baseEnd;
}

/**
 * Applies a paid WIFI_PLAN_PURCHASE (renewal or add-on). Idempotent: only a
 * PENDING subscription is touched, so a repeated call changes nothing.
 */
export async function applyPaidPlanPurchase(tx: Tx, orderId: string, now: Date) {
  const sub = await tx.wifiSubscription.findUnique({
    where: { orderId },
    include: { wifiPlan: true },
  });
  if (!sub || sub.status !== 'PENDING') return;

  const conn = await tx.wifiConnection.findUnique({ where: { id: sub.connectionId } });
  if (!conn) return;

  let currentEnd: Date | null = null;
  if (sub.wifiPlan.type === 'BASE') {
    currentEnd = conn.planExpiredAt;
  } else {
    const same = await tx.wifiSubscription.findFirst({
      where: { connectionId: conn.id, wifiPlanId: sub.wifiPlanId, status: 'ACTIVE', id: { not: sub.id } },
      orderBy: { endDate: 'desc' },
    });
    currentEnd = same?.endDate ?? null;
  }

  const endDate = computeRenewalEnd(currentEnd, now, sub.wifiPlan.validityDays);
  const startDate = currentEnd && currentEnd > now ? currentEnd : now;

  await tx.wifiSubscription.update({
    where: { id: sub.id },
    data: { status: 'ACTIVE', startDate, endDate },
  });

  if (sub.wifiPlan.type === 'BASE') {
    await tx.wifiConnection.update({
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
    'Zylo WiFi plan activated',
    `${sub.wifiPlan.name} is active on ${conn.connectionNumber} until ${endDate.toDateString()}.`,
  );
}

/**
 * Resumes a paused connection and extends the plan end dates by the days
 * actually paused. Returns false when there was nothing to resume (safe to repeat).
 */
export async function resumeConnection(tx: Tx, connectionId: string, now: Date): Promise<boolean> {
  const conn = await tx.wifiConnection.findUnique({ where: { id: connectionId } });
  if (!conn || conn.status !== 'PAUSED' || !conn.pausedAt || !conn.pauseEndsAt) return false;

  const planned = Math.max(1, Math.round((conn.pauseEndsAt.getTime() - conn.pausedAt.getTime()) / DAY_MS));
  const actual = actualPausedDays(conn.pausedAt, now, planned);

  const claimed = await tx.wifiConnection.updateMany({
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

  const subs = await tx.wifiSubscription.findMany({ where: { connectionId, status: 'PAUSED' } });
  for (const s of subs) {
    await tx.wifiSubscription.update({
      where: { id: s.id },
      data: { status: 'ACTIVE', endDate: s.endDate ? addDays(s.endDate, actual) : null },
    });
  }
  await notify(
    tx,
    conn.userId,
    'Zylo WiFi resumed',
    `${conn.connectionNumber} is active again. Your plan was extended by ${actual} day(s).`,
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

  const paused = await prisma.wifiConnection.findMany({
    where: { status: 'PAUSED', pauseEndsAt: { lte: now } },
    select: { id: true },
  });
  for (const c of paused) {
    if (await prisma.$transaction((tx) => resumeConnection(tx, c.id, now))) result.resumed++;
  }

  result.expiredSubscriptions = (
    await prisma.wifiSubscription.updateMany({
      where: { status: 'ACTIVE', endDate: { lt: now } },
      data: { status: 'EXPIRED' },
    })
  ).count;

  const expiring = await prisma.wifiConnection.findMany({
    where: { status: 'ACTIVE', planExpiredAt: { lt: now } },
  });
  for (const c of expiring) {
    const moved = await prisma.$transaction(async (tx) => {
      const r = await tx.wifiConnection.updateMany({
        where: { id: c.id, status: 'ACTIVE', planExpiredAt: { lt: now } },
        data: {
          status: 'GRACE_PERIOD',
          gracePeriodEndsAt: computeGraceEnd(c.planExpiredAt!, wifiConfig.graceDays),
        },
      });
      if (r.count === 1) {
        await notify(tx, c.userId, 'Zylo WiFi plan expired', `${c.connectionNumber} is in a ${wifiConfig.graceDays}-day grace period. Renew to avoid suspension.`);
      }
      return r.count === 1;
    });
    if (moved) result.gracePeriod++;
  }

  const lapsed = await prisma.wifiConnection.findMany({
    where: { status: 'GRACE_PERIOD', gracePeriodEndsAt: { lt: now } },
  });
  for (const c of lapsed) {
    const moved = await prisma.$transaction(async (tx) => {
      const r = await tx.wifiConnection.updateMany({
        where: { id: c.id, status: 'GRACE_PERIOD', gracePeriodEndsAt: { lt: now } },
        data: { status: 'SUSPENDED' },
      });
      if (r.count === 1) {
        await notify(tx, c.userId, 'Zylo WiFi suspended', `${c.connectionNumber} has been suspended. Renew your plan to restore service.`);
      }
      return r.count === 1;
    });
    if (moved) result.suspended++;
  }

  return result;
}
