import { beforeEach, describe, expect, it } from 'vitest';
import { createFakePrisma } from '../../test/fake-prisma.js';
import { ParkingCarrierClient } from './parking-carrier.js';
import {
  normalizeIndianMobile,
  ParkingService,
} from './parking.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const user = { id: 'u1', role: 'CUSTOMER' } as any;
const admin = { id: 'root', role: 'SUPER_ADMIN' } as any;

const personalSim = {
  id: 's1',
  userId: 'u1',
  category: 'PERSONAL',
  status: 'ACTIVE',
  organizationId: null,
};
const businessSim = {
  id: 's2',
  userId: 'u9',
  category: 'BUSINESS',
  status: 'ACTIVE',
  organizationId: 'org1',
};

const phone = (number: string, sim: any, org: any = null) => ({
  id: `pn-${number}`,
  number,
  countryCode: 'IN',
  sim,
  organization: org,
});

const parkingRow = (over: Record<string, unknown> = {}) => ({
  id: 'pk1',
  reference: 'ref-1',
  userId: 'u1',
  simId: 's1',
  phoneNumberId: 'pn1',
  organizationId: null,
  status: 'ACTIVE',
  durationDays: 15,
  parkedAt: new Date('2026-10-01T00:00:00Z'),
  expiresAt: new Date(Date.now() + 10 * DAY_MS),
  extensionsUsed: 0,
  reactivatedAt: null,
  phoneNumber: { number: '+919876543210' },
  sim: personalSim,
  organization: null,
  orders: [],
  extensions: [],
  createdAt: 1,
  ...over,
});

function service(seed: Parameters<typeof createFakePrisma>[0]) {
  const prisma = createFakePrisma(seed);
  return {
    prisma,
    svc: new ParkingService(prisma as any, new ParkingCarrierClient()),
  };
}

beforeEach(() => {
  delete process.env.ZYLO_CARRIER_API_URL;
  delete process.env.ZYLO_CARRIER_API_KEY;
  delete process.env.STRIPE_SECRET_KEY; // deterministic rollback path
});

describe('normalizeIndianMobile', () => {
  it('accepts common input shapes', () => {
    expect(normalizeIndianMobile('9876543210')).toBe('+919876543210');
    expect(normalizeIndianMobile('+91 98765 43210')).toBe('+919876543210');
    expect(normalizeIndianMobile('919876543210')).toBe('+919876543210');
    expect(normalizeIndianMobile('09876543210')).toBe('+919876543210');
    expect(normalizeIndianMobile('123')).toBeNull();
  });
});

describe('validateNumber', () => {
  it('rejects malformed input before any lookup', async () => {
    const { svc } = service({});
    const res = await svc.validateNumber(user, 'abc');
    expect(res.eligible).toBe(false);
    expect(res.code).toBe('INVALID_NUMBER_FORMAT');
  });

  it('rejects numbers that are not Zylo numbers', async () => {
    const { svc } = service({ phoneNumber: [] });
    const res = await svc.validateNumber(user, '+919876543210');
    expect(res.code).toBe('NOT_A_ZYLO_NUMBER');
  });

  it('rejects numbers owned by someone else', async () => {
    const { svc } = service({
      phoneNumber: [
        phone('+919876543210', { ...personalSim, userId: 'u2' }),
      ],
    });
    const res = await svc.validateNumber(user, '9876543210');
    expect(res.code).toBe('NOT_YOUR_NUMBER');
  });

  it('rejects numbers on non-parkable SIM states', async () => {
    const { svc } = service({
      phoneNumber: [
        phone('+919876543210', { ...personalSim, status: 'SUSPENDED' }),
      ],
    });
    const res = await svc.validateNumber(user, '9876543210');
    expect(res.code).toBe('NUMBER_NOT_ELIGIBLE');
  });

  it('rejects numbers that are already parked', async () => {
    const { svc } = service({
      phoneNumber: [phone('+919876543210', personalSim)],
      numberParking: [parkingRow({ status: 'ACTIVE', simId: 's1' })],
    });
    const res = await svc.validateNumber(user, '9876543210');
    expect(res.code).toBe('ALREADY_PARKED');
  });

  it('accepts an owned active personal number', async () => {
    const { svc } = service({
      phoneNumber: [phone('+919876543210', personalSim)],
    });
    const res = await svc.validateNumber(user, '98765 43210');
    expect(res.eligible).toBe(true);
    expect(res.category).toBe('PERSONAL');
    expect(res.simulated).toBe(true); // no carrier API configured
  });

  it('rejects a number whose plan is still active', async () => {
    const { svc } = service({
      phoneNumber: [
        phone('+919876543210', {
          ...personalSim,
          planSubscriptions: [
            {
              status: 'ACTIVE',
              endDate: new Date(Date.now() + 20 * DAY_MS),
              plan: { name: 'Zylo Super Hero 299' },
            },
          ],
        }),
      ],
    });
    const res = await svc.validateNumber(user, '9876543210');
    expect(res.code).toBe('PLAN_STILL_ACTIVE');
  });

  it('still accepts a number whose plan just expired', async () => {
    const { svc } = service({
      phoneNumber: [
        phone('+919876543210', {
          ...personalSim,
          planSubscriptions: [
            {
              status: 'ACTIVE',
              endDate: new Date(Date.now() - DAY_MS),
              plan: { name: 'Zylo Super Hero 299' },
            },
          ],
        }),
      ],
    });
    const res = await svc.validateNumber(user, '9876543210');
    expect(res.eligible).toBe(true);
    expect(res.plan?.status).toBe('EXPIRED');
  });

  it('lets an org ADMIN manage a business number they do not own', async () => {
    const org = { id: 'org1', name: 'Acme Corp', numberPrefix: '0482' };
    const { svc } = service({
      phoneNumber: [
        phone('+910482123456', businessSim, org),
      ],
      organizationMember: [
        { userId: 'u1', organizationId: 'org1', status: 'ACTIVE', role: 'ADMIN' },
      ],
    });
    const res = await svc.validateNumber(user, '0482123456');
    expect(res.eligible).toBe(true);
    expect(res.organizationName).toBe('Acme Corp');
  });

  it('does not let an EMPLOYEE park an org number they do not own', async () => {
    const org = { id: 'org1', name: 'Acme Corp', numberPrefix: '0482' };
    const { svc } = service({
      phoneNumber: [phone('+910482123456', businessSim, org)],
      organizationMember: [
        { userId: 'u1', organizationId: 'org1', status: 'ACTIVE', role: 'EMPLOYEE' },
      ],
    });
    const res = await svc.validateNumber(user, '0482123456');
    expect(res.code).toBe('NOT_YOUR_NUMBER');
  });
});

describe('fulfillOrder — initial parking', () => {
  const seed = () => ({
    numberParking: [parkingRow({ status: 'PENDING_PAYMENT', expiresAt: null })],
    order: [
      {
        id: 'o1',
        userId: 'u1',
        type: 'NUMBER_PARKING',
        status: 'PENDING',
        numberParkingId: 'pk1',
        numberParking: parkingRow({
          status: 'PENDING_PAYMENT',
          expiresAt: null,
        }),
      },
    ],
  });

  it('activates the parking only after payment, once', async () => {
    const { prisma, svc } = service(seed());
    await svc.fulfillOrder('o1');
    const parking = prisma.numberParking.rows[0];
    expect(parking.status).toBe('ACTIVE');
    expect(parking.parkedAt).toBeInstanceOf(Date);
    expect(
      parking.expiresAt.getTime() - parking.parkedAt.getTime(),
    ).toBe(15 * DAY_MS);
    expect(prisma.notification.rows).toHaveLength(1);

    // Duplicate webhook/verify call — fully idempotent.
    await svc.fulfillOrder('o1');
    expect(prisma.notification.rows).toHaveLength(1);
  });

  it('ignores non-parking orders', async () => {
    const { prisma, svc } = service({
      order: [{ id: 'o9', type: 'RECHARGE', status: 'PENDING' }],
    });
    await svc.fulfillOrder('o9');
    expect(prisma.order.rows[0].status).toBe('PENDING');
  });
});

describe('fulfillOrder — extension', () => {
  it('pushes expiry out and counts the extension exactly once', async () => {
    const prev = new Date(Date.now() + 5 * DAY_MS);
    const parking = parkingRow({ expiresAt: prev });
    const { prisma, svc } = service({
      numberParking: [parking],
      numberParkingExtension: [
        {
          id: 'ext1',
          parkingId: 'pk1',
          orderId: 'o2',
          durationDays: 30,
          previousExpiresAt: prev,
          newExpiresAt: new Date(prev.getTime() + 30 * DAY_MS),
        },
      ],
      order: [
        {
          id: 'o2',
          userId: 'u1',
          type: 'NUMBER_PARKING_EXTENSION',
          status: 'PENDING',
          numberParkingId: 'pk1',
          numberParking: parking,
        },
      ],
    });

    await svc.fulfillOrder('o2');
    const row = prisma.numberParking.rows[0];
    expect(row.extensionsUsed).toBe(1);
    expect(row.expiresAt.getTime()).toBe(prev.getTime() + 30 * DAY_MS);

    await svc.fulfillOrder('o2');
    expect(prisma.numberParking.rows[0].extensionsUsed).toBe(1);
  });
});

describe('extension rules', () => {
  it('rejects extensions beyond the configured maximum', async () => {
    const { svc } = service({
      numberParking: [parkingRow({ extensionsUsed: 2 })],
      organizationMember: [],
    });
    await expect(
      svc.createExtensionCheckout(user, 'pk1', { durationDays: 15 }),
    ).rejects.toMatchObject({ code: 'EXTENSION_LIMIT_REACHED' });
  });

  it('rejects extension of a non-active parking', async () => {
    const { svc } = service({
      numberParking: [parkingRow({ status: 'REACTIVATED' })],
    });
    await expect(
      svc.createExtensionCheckout(user, 'pk1', { durationDays: 15 }),
    ).rejects.toMatchObject({ code: 'PARKING_NOT_ACTIVE' });
  });

  it('rejects durations outside the configured periods', async () => {
    const { svc } = service({
      numberParking: [parkingRow()],
    });
    await expect(
      svc.createExtensionCheckout(user, 'pk1', { durationDays: 7 }),
    ).rejects.toMatchObject({ code: 'INVALID_PARKING_PERIOD' });
  });

  it('rolls back the order when Stripe is not configured', async () => {
    const { prisma, svc } = service({
      numberParking: [parkingRow()],
    });
    await expect(
      svc.createExtensionCheckout(user, 'pk1', { durationDays: 15 }),
    ).rejects.toMatchObject({ code: 'STRIPE_NOT_CONFIGURED' });
    expect(prisma.order.rows[0].status).toBe('CANCELLED');
    expect(prisma.numberParkingExtension.rows).toHaveLength(0);
  });
});

describe('reactivate + expiry', () => {
  it('reactivates an active parking exactly once', async () => {
    const { prisma, svc } = service({
      numberParking: [parkingRow()],
    });
    const res = await svc.reactivate(user, 'pk1');
    expect(res.status).toBe('REACTIVATED');
    expect(prisma.numberParking.rows[0].reactivatedAt).toBeInstanceOf(Date);
    await expect(svc.reactivate(user, 'pk1')).rejects.toMatchObject({
      code: 'PARKING_NOT_ACTIVE',
    });
  });

  it('marks overdue parkings EXPIRED when the vault is read', async () => {
    const { prisma, svc } = service({
      numberParking: [
        parkingRow({ expiresAt: new Date(Date.now() - DAY_MS) }),
      ],
    });
    const vault = await svc.getVault(admin);
    expect(vault.parkings[0].status).toBe('EXPIRED');
    expect(prisma.numberParking.rows[0].status).toBe('EXPIRED');
  });

  it('forbids other customers from managing a parking', async () => {
    const { svc } = service({ numberParking: [parkingRow()] });
    await expect(
      svc.reactivate({ id: 'u2', role: 'CUSTOMER' } as any, 'pk1'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
