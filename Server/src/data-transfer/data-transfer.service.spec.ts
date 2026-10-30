import { describe, expect, it } from 'vitest';
import { createFakePrisma, createTable } from '../../test/fake-prisma.js';
import { DataTransferService } from './data-transfer.service.js';
import type { SendTransferDto } from './dto.js';

const user = { id: 'u1', name: 'Asha' } as any;

const FRIEND_NUMBER = '+919876543210';
const MY_NUMBER = '+919123456789';

const plan = {
  id: 'plan1',
  name: 'Zylo Ultra',
  dataTransferEnabled: true,
  transferLimitMb: 512,
  dailyDataAllowanceMb: 2048,
};

/** IST cycle date — mirrors the service's getCycleDate so seeded rows match. */
function istCycleDate(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00.000Z`);
}

function activeSub(simId: string, planId = 'plan1') {
  const now = new Date();
  return {
    id: `sub-${simId}`,
    simId,
    planId,
    status: 'ACTIVE',
    startDate: new Date(now.getTime() - 86400000),
    endDate: new Date(now.getTime() + 86400000),
    plan,
  };
}

/** Sim rows get the relations the service asks for via include(). */
function simRow(over: Record<string, unknown> = {}) {
  const row: Record<string, unknown> = {
    id: 'sim1',
    userId: 'u1',
    status: 'ACTIVE',
    category: 'PERSONAL',
    ...over,
  };
  row.user = { id: row.userId as string, name: (over.userName as string) ?? 'Owner' };
  row.phoneNumber = { number: (over.number as string) ?? MY_NUMBER };
  return row;
}

function prisma(seed: Record<string, any[]> = {}) {
  const fake = createFakePrisma(seed);
  const sims = seed.sim ?? [];
  fake.phoneNumber = createTable(
    (seed.phoneNumber ?? []).map((p: any) => ({
      ...p,
      sim: sims.find((s) => s.id === p.simId) ?? p.sim ?? null,
    })),
  );
  fake.dataTransfer = createTable(seed.dataTransfer);
  return fake;
}

const questStub = { processVerifiedEvent: async () => ({}) };

function dto(over: Partial<SendTransferDto> = {}): SendTransferDto {
  return {
    simId: 'sim1',
    targetNumber: FRIEND_NUMBER,
    amountMb: 500,
    ...over,
  };
}

function baseSeed() {
  return {
    sim: [
      simRow({ id: 'sim1', userId: 'u1', userName: 'Asha', number: MY_NUMBER }),
      simRow({ id: 'sim2', userId: 'u2', userName: 'Bhavna', number: FRIEND_NUMBER }),
    ],
    phoneNumber: [
      { id: 'pn1', number: MY_NUMBER, simId: 'sim1' },
      { id: 'pn2', number: FRIEND_NUMBER, simId: 'sim2' },
    ],
    plan: [plan],
    planSubscription: [activeSub('sim1'), activeSub('sim2')],
    dataBankAccount: [
      { id: 'bank1', simId: 'sim1', balanceMb: 1000 },
      { id: 'bank2', simId: 'sim2', balanceMb: 50 },
    ],
  };
}

describe('DataTransferService.send', () => {
  it('spends from today\'s remaining data and banks it for the friend', async () => {
    const fake = prisma(baseSeed());
    const svc = new DataTransferService(fake as any, questStub as any);

    const { transfer, replayed } = await svc.send(user, dto({ message: 'happy bday' }));

    expect(replayed).toBe(false);
    expect(transfer.status).toBe('COMPLETED');
    expect(transfer.amountMb).toBe(500);

    // Sender: today's usage went up, bank untouched.
    const daily = fake.dailyDataUsage.rows[0];
    expect(daily).toMatchObject({ simId: 'sim1', allowanceMb: 2048, usedMb: 500 });
    expect(fake.dataBankAccount.rows[0].balanceMb).toBe(1000);

    // Friend: Data Bank credited + ledger entry.
    expect(fake.dataBankAccount.rows[1].balanceMb).toBe(550);
    expect(fake.dataBankTransaction.rows).toHaveLength(1);
    expect(fake.dataBankTransaction.rows[0]).toMatchObject({
      dataBankId: 'bank2',
      type: 'TRANSFER_IN',
      amountMb: 500,
      balanceAfterMb: 550,
    });

    expect(fake.notification.rows).toHaveLength(2);
    expect(fake.notification.rows.some((n: any) => n.userId === 'u2')).toBe(true);
  });

  it('creates the recipient bank lazily when the friend never used Data Bank', async () => {
    const seed = baseSeed();
    seed.dataBankAccount = [{ id: 'bank1', simId: 'sim1', balanceMb: 1000 }];
    const fake = prisma(seed);
    await new DataTransferService(fake as any, questStub as any).send(user, dto());

    const dest = fake.dataBankAccount.rows.find((a: any) => a.simId === 'sim2');
    expect(dest.balanceMb).toBe(500);
  });

  it('only lets me share what is left of today\'s allowance', async () => {
    const fake = prisma(baseSeed());
    const svc = new DataTransferService(fake as any, questStub as any);

    await svc.send(user, dto({ amountMb: 500 })); // usedMb 500
    await svc.send(user, dto({ amountMb: 500 })); // usedMb 1000
    await svc.send(user, dto({ amountMb: 512 })); // usedMb 1512 → 536 left
    await svc.send(user, dto({ amountMb: 512 })); // usedMb 2024 → 24 left

    await expect(svc.send(user, dto({ amountMb: 50 }))).rejects.toMatchObject({
      code: 'INSUFFICIENT_DATA',
    });
    expect(fake.dataBankAccount.rows[0].balanceMb).toBe(1000); // bank never touched
    expect(fake.dataTransfer.rows).toHaveLength(4);
  });

  it('does not let me share data I already saved into the bank', async () => {
    const seed = {
      ...baseSeed(),
      dailyDataUsage: [
        {
          id: 'du1', simId: 'sim1', planId: 'plan1', cycleDate: istCycleDate(),
          allowanceMb: 2048, usedMb: 0, bankedMb: 1600, redeemedMb: 0,
        },
      ],
    };
    const fake = prisma(seed);
    // shareable = 2048 - 0 - 1600 = 448 → 500 does not fit
    await expect(
      new DataTransferService(fake as any, questStub as any).send(user, dto({ amountMb: 500 })),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_DATA' });
    expect(fake.dataBankAccount.rows[1].balanceMb).toBe(50);
  });

  it('enforces the plan per-transfer limit', async () => {
    const fake = prisma(baseSeed());
    await expect(
      new DataTransferService(fake as any, questStub as any).send(user, dto({ amountMb: 600 })),
    ).rejects.toMatchObject({ code: 'TRANSFER_LIMIT_EXCEEDED' });
    expect(fake.dailyDataUsage.rows).toHaveLength(0); // nothing spent
  });

  it('blocks plans without dataTransferEnabled and self-transfers', async () => {
    const noTransferPlan = { ...plan, dataTransferEnabled: false };
    const fake1 = prisma({ ...baseSeed(), plan: [noTransferPlan], planSubscription: [
      { ...activeSub('sim1'), plan: noTransferPlan },
      activeSub('sim2'),
    ] });
    await expect(
      new DataTransferService(fake1 as any, questStub as any).send(user, dto()),
    ).rejects.toMatchObject({ code: 'TRANSFER_NOT_ENABLED' });

    const fake2 = prisma(baseSeed());
    await expect(
      new DataTransferService(fake2 as any, questStub as any).send(user, dto({ targetNumber: MY_NUMBER })),
    ).rejects.toMatchObject({ code: 'SELF_TRANSFER' });
  });

  it('rejects when the friend has no active plan or unknown number', async () => {
    const fake = prisma(baseSeed());
    const svc = new DataTransferService(fake as any, questStub as any);
    fake.planSubscription.rows.splice(
      fake.planSubscription.rows.findIndex((s: any) => s.simId === 'sim2'),
      1,
    );
    await expect(svc.send(user, dto())).rejects.toMatchObject({ code: 'RECIPIENT_NOT_ELIGIBLE' });
    await expect(svc.send(user, dto({ targetNumber: '1111111111' }))).rejects.toMatchObject({ code: 'NUMBER_NOT_FOUND' });
  });

  it('is idempotent — same key replays the original transfer without a second spend', async () => {
    const fake = prisma(baseSeed());
    const svc = new DataTransferService(fake as any, questStub as any);

    const first = await svc.send(user, dto({ idempotencyKey: 'key-1' }));
    const second = await svc.send(user, dto({ idempotencyKey: 'key-1' }));

    expect(second.replayed).toBe(true);
    expect(second.transfer.id).toBe(first.transfer.id);
    expect(fake.dailyDataUsage.rows[0].usedMb).toBe(500); // spent once
    expect(fake.dataTransfer.rows).toHaveLength(1);

    await expect(
      svc.send(user, dto({ idempotencyKey: 'key-1', amountMb: 100 })),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });

  it('enforces the daily sending allowance', async () => {
    const seed = {
      ...baseSeed(),
      dataTransfer: [
        { id: 't0', fromSimId: 'sim1', toSimId: 'sim2', amountMb: 5120, status: 'COMPLETED', completedAt: new Date() },
      ],
    };
    const fake = prisma(seed);
    await expect(
      new DataTransferService(fake as any, questStub as any).send(user, dto({ amountMb: 500 })),
    ).rejects.toMatchObject({ code: 'DAILY_LIMIT_EXCEEDED' });
  });

  it('rejects a SIM that does not belong to the customer', async () => {
    const fake = prisma(baseSeed());
    await expect(
      new DataTransferService(fake as any, questStub as any).send(user, dto({ simId: 'sim2' })),
    ).rejects.toMatchObject({ code: 'SIM_NOT_FOUND' });
  });
});

describe('DataTransferService.lookupRecipient + history', () => {
  it('finds the friend by exact number and refuses self', async () => {
    const fake = prisma(baseSeed());
    const svc = new DataTransferService(fake as any, questStub as any);

    const { recipient } = await svc.lookupRecipient(user, FRIEND_NUMBER);
    expect(recipient).toMatchObject({ name: 'Bhavna', number: FRIEND_NUMBER });
    await expect(svc.lookupRecipient(user, MY_NUMBER)).rejects.toMatchObject({ code: 'SELF_TRANSFER' });
    await expect(svc.lookupRecipient(user, '1111111111')).rejects.toMatchObject({ code: 'NUMBER_NOT_FOUND' });
  });

  it('returns sent and received entries for the customer SIMs', async () => {
    const fake = prisma(baseSeed());
    const svc = new DataTransferService(fake as any, questStub as any);
    await svc.send(user, dto());

    const { transfers } = await svc.history('u1');
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toMatchObject({ direction: 'SENT', amountMb: 500 });

    const theirs = await svc.history('u2');
    expect(theirs.transfers[0]).toMatchObject({ direction: 'RECEIVED', amountMb: 500 });
  });
});
