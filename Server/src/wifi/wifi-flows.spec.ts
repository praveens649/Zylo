import { describe, expect, it } from 'vitest';
import { createFakePrisma, createTable } from '../../test/fake-prisma.js';
import { WifiFulfilmentService } from './wifi-fulfilment.service.js';
import { WifiAdminService } from './wifi-admin.service.js';
import { WifiCustomerService } from './wifi-customer.service.js';
import { resumeConnection, runLifecycleTick } from './wifi-lifecycle.js';
import { addDays } from './wifi-rules.js';

const now = new Date('2026-10-28T10:00:00Z');
const user = { id: 'u1', role: 'CUSTOMER' } as any;

const basePlan = { id: 'p-base', type: 'BASE', name: 'Zylo Fiber 100', validityDays: 30 };

/** WiFi tables on top of the shared fake (order / notification are already wired). */
function wifiPrisma(seed: Record<string, any[]> = {}) {
  const fake = createFakePrisma(seed);
  const plans = seed.wifiPlan ?? [];
  fake.wifiPlan = createTable(plans);
  fake.wifiSubscription = createTable(seed.wifiSubscription ?? [], (s: any) => ({
    ...s,
    wifiPlan: plans.find((p) => p.id === s.wifiPlanId),
  }));
  fake.wifiConnection = createTable(seed.wifiConnection ?? [], (c: any) => ({
    ...c,
    device: { id: c.deviceId },
    unit: null,
    subscriptions: fake.wifiSubscription.rows
      .filter((s: any) => s.connectionId === c.id)
      .map((s: any) => ({ ...s, wifiPlan: plans.find((p) => p.id === s.wifiPlanId) })),
    installations: [],
  }));
  fake.wifiDeviceUnit = createTable(seed.wifiDeviceUnit);
  fake.wifiInstallation = createTable(seed.wifiInstallation);
  return fake;
}

function connection(over: Record<string, unknown> = {}) {
  return {
    id: 'c1', connectionNumber: 'ZWF-000001', userId: 'u1', deviceId: 'd1', status: 'ACTIVE',
    ownership: 'PURCHASE', unitId: null, planExpiredAt: addDays(now, 10), gracePeriodEndsAt: null,
    pausedAt: null, pauseEndsAt: null, pauseDaysUsed: 0, pauseWindowStartedAt: null, ...over,
  };
}

describe('double webhook delivery', () => {
  it('extends a renewal once even when the payment webhook arrives twice', async () => {
    const end = addDays(now, 10);
    const prisma = wifiPrisma({
      wifiPlan: [basePlan],
      order: [{ id: 'o1', userId: 'u1', type: 'WIFI_PLAN_PURCHASE', status: 'PENDING', wifiConnectionId: 'c1' }],
      wifiConnection: [connection({ planExpiredAt: end })],
      wifiSubscription: [{ id: 's1', connectionId: 'c1', wifiPlanId: 'p-base', orderId: 'o1', status: 'PENDING' }],
    });
    const svc = new WifiFulfilmentService(prisma);

    expect(await svc.onOrderPaid('o1', now)).toBe(true);
    expect(await svc.onOrderPaid('o1', now)).toBe(false);

    const sub = prisma.wifiSubscription.rows[0];
    expect(sub.status).toBe('ACTIVE');
    expect(sub.endDate).toEqual(addDays(end, 30));
    expect(prisma.wifiConnection.rows[0].planExpiredAt).toEqual(addDays(end, 30));
    expect(prisma.order.rows[0].status).toBe('COMPLETED');
    expect(prisma.notification.rows).toHaveLength(1);
  });

  it('completes a router order on payment but does NOT activate the connection', async () => {
    const prisma = wifiPrisma({
      wifiPlan: [basePlan],
      order: [{ id: 'o2', userId: 'u1', type: 'WIFI_ORDER', status: 'PENDING', wifiConnectionId: 'c1' }],
      wifiConnection: [connection({ status: 'PENDING_INSTALLATION', planExpiredAt: null })],
      wifiSubscription: [{ id: 's2', connectionId: 'c1', wifiPlanId: 'p-base', orderId: 'o2', status: 'PENDING' }],
    });
    const svc = new WifiFulfilmentService(prisma);
    await svc.onOrderPaid('o2', now);
    await svc.onOrderPaid('o2', now);

    expect(prisma.order.rows[0].status).toBe('COMPLETED');
    expect(prisma.wifiConnection.rows[0].status).toBe('PENDING_INSTALLATION');
    expect(prisma.wifiSubscription.rows[0].status).toBe('PENDING');
    expect(prisma.notification.rows).toHaveLength(1);
  });

  it('ignores non-WiFi orders', async () => {
    const prisma = wifiPrisma({ order: [{ id: 'o3', userId: 'u1', type: 'RECHARGE', status: 'PENDING' }] });
    expect(await new WifiFulfilmentService(prisma).onOrderPaid('o3', now)).toBe(false);
    expect(prisma.order.rows[0].status).toBe('PENDING');
  });
});

describe('assigning a unit', () => {
  const seed = () =>
    wifiPrisma({
      order: [
        { id: 'oa', type: 'WIFI_ORDER', status: 'COMPLETED', wifiConnectionId: 'c1' },
        { id: 'ob', type: 'WIFI_ORDER', status: 'COMPLETED', wifiConnectionId: 'c2' },
      ],
      wifiConnection: [
        connection({ id: 'c1', status: 'PENDING_INSTALLATION' }),
        connection({ id: 'c2', status: 'PENDING_INSTALLATION', userId: 'u2' }),
      ],
      wifiDeviceUnit: [{ id: 'unit1', deviceId: 'd1', status: 'IN_STOCK', createdAt: 1 }],
    });

  it('hands the same unit to only one connection', async () => {
    const prisma = seed();
    const admin = new WifiAdminService(prisma);

    await expect(admin.assignUnit('c1', {})).resolves.toMatchObject({ unitId: 'unit1' });
    await expect(admin.assignUnit('c2', {})).rejects.toMatchObject({ code: 'NO_UNIT_AVAILABLE' });
    await expect(admin.assignUnit('c2', { unitId: 'unit1' })).rejects.toMatchObject({ code: 'UNIT_UNAVAILABLE' });

    expect(prisma.wifiDeviceUnit.rows[0].status).toBe('ASSIGNED');
    expect(prisma.wifiConnection.rows[0].unitId).toBe('unit1');
    expect(prisma.wifiConnection.rows[1].unitId).toBeNull();
  });

  it('refuses to assign twice to the same connection, or before payment is confirmed', async () => {
    const prisma = seed();
    prisma.wifiDeviceUnit.rows.push({ id: 'unit2', deviceId: 'd1', status: 'IN_STOCK', createdAt: 2 });
    const admin = new WifiAdminService(prisma);
    await admin.assignUnit('c1', {});
    await expect(admin.assignUnit('c1', {})).rejects.toMatchObject({ code: 'ASSIGN_NOT_ALLOWED' });

    prisma.order.rows[1].status = 'PENDING';
    await expect(admin.assignUnit('c2', {})).rejects.toMatchObject({ code: 'PAYMENT_NOT_CONFIRMED' });
  });
});

describe('pause and resume', () => {
  const seed = () =>
    wifiPrisma({
      wifiPlan: [basePlan],
      wifiConnection: [connection({ planExpiredAt: addDays(now, 10) })],
      wifiSubscription: [{ id: 's1', connectionId: 'c1', wifiPlanId: 'p-base', status: 'ACTIVE', endDate: addDays(now, 10) }],
    });

  it('pauses an active connection and extends the plan by the days actually paused on resume', async () => {
    const prisma = seed();
    const svc = new WifiCustomerService(prisma);

    await svc.pause(user, 'c1', { days: 10 }, now);
    const c = prisma.wifiConnection.rows[0];
    expect(c.status).toBe('PAUSED');
    expect(c.pauseEndsAt).toEqual(addDays(now, 10));
    expect(c.pauseDaysUsed).toBe(10);
    expect(prisma.wifiSubscription.rows[0].status).toBe('PAUSED');

    await svc.resume(user, 'c1', addDays(now, 4));
    expect(c.status).toBe('ACTIVE');
    expect(c.pausedAt).toBeNull();
    expect(c.planExpiredAt).toEqual(addDays(now, 14));
    expect(c.pauseDaysUsed).toBe(4);
    expect(prisma.wifiSubscription.rows[0]).toMatchObject({ status: 'ACTIVE', endDate: addDays(now, 14) });
  });

  it('enforces the yearly pause allowance and only pauses active connections', async () => {
    const prisma = seed();
    const svc = new WifiCustomerService(prisma);
    await svc.pause(user, 'c1', { days: 25 }, now);
    await svc.resume(user, 'c1', addDays(now, 25));

    await expect(svc.pause(user, 'c1', { days: 10 }, addDays(now, 26))).rejects.toMatchObject({ code: 'PAUSE_LIMIT_EXCEEDED' });

    prisma.wifiConnection.rows[0].status = 'SUSPENDED';
    await expect(svc.pause(user, 'c1', { days: 1 }, addDays(now, 26))).rejects.toMatchObject({ code: 'PAUSE_NOT_ALLOWED' });
  });

  it("cannot pause another customer's connection", async () => {
    const svc = new WifiCustomerService(seed());
    await expect(svc.pause({ id: 'intruder' } as any, 'c1', { days: 1 }, now)).rejects.toMatchObject({ code: 'CONNECTION_NOT_FOUND' });
  });

  it('auto-resumes at pauseEndsAt, and resuming twice is a no-op', async () => {
    const prisma = seed();
    await new WifiCustomerService(prisma).pause(user, 'c1', { days: 5 }, now);

    const later = addDays(now, 6);
    const first = await runLifecycleTick(prisma, later);
    const second = await runLifecycleTick(prisma, later);

    expect(first.resumed).toBe(1);
    expect(second.resumed).toBe(0);
    expect(prisma.wifiConnection.rows[0].planExpiredAt).toEqual(addDays(now, 15));
    expect(await resumeConnection(prisma, 'c1', later)).toBe(false);
  });
});

describe('daily lifecycle job', () => {
  it('moves expired -> grace -> suspended and is safe to run twice', async () => {
    const expired = addDays(now, -1);
    const prisma = wifiPrisma({
      wifiPlan: [basePlan],
      wifiConnection: [connection({ planExpiredAt: expired })],
      wifiSubscription: [{ id: 's1', connectionId: 'c1', wifiPlanId: 'p-base', status: 'ACTIVE', endDate: expired }],
    });

    const r1 = await runLifecycleTick(prisma, now);
    const r2 = await runLifecycleTick(prisma, now);
    expect(r1).toMatchObject({ expiredSubscriptions: 1, gracePeriod: 1, suspended: 0 });
    expect(r2).toMatchObject({ expiredSubscriptions: 0, gracePeriod: 0, suspended: 0 });
    expect(prisma.wifiConnection.rows[0].status).toBe('GRACE_PERIOD');
    expect(prisma.wifiConnection.rows[0].gracePeriodEndsAt).toEqual(addDays(expired, 3));

    const r3 = await runLifecycleTick(prisma, addDays(now, 3));
    const r4 = await runLifecycleTick(prisma, addDays(now, 3));
    expect(r3.suspended).toBe(1);
    expect(r4.suspended).toBe(0);
    expect(prisma.wifiConnection.rows[0].status).toBe('SUSPENDED');
    expect(prisma.notification.rows).toHaveLength(2);
  });
});
