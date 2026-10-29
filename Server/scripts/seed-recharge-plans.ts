import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { Prisma } from '../src/generated/prisma/client.js';

config({ path: '.env.local' });
config({ path: '.env' });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const SAMPLE_PLANS = [
  {
    name: 'Plan 1',
    description: 'Truly Unlimited Voice Calls + 1.5 GB/day High-Speed Data + Zylo Data Bank rollover eligible',
    type: 'PREPAID' as const,
    price: new Prisma.Decimal(299),
    currency: 'inr',
    validityDays: 28,
    dataAllowanceGb: new Prisma.Decimal(1.5),
    callingBenefit: 'Unlimited (Local, STD, Roaming)',
    smsCount: 100,
    businessOnly: false,
    isActive: true,
    isFeatured: true,
    isValidityOnly: false,
    dataBankEnabled: true,
    rolloverLimitMb: 10240, // 10 GB
    rolloverExpiryDays: 90,
    dataTransferEnabled: true,
    transferLimitMb: 2048,
    dailyDataAllowanceMb: 1536, // 1.5 GB/day
  },
  {
    name: 'Plan 2',
    description: 'Ultra value combo with 2 GB/day, Unlimited 5G Data, and Zylo Peer Data Transfer support',
    type: 'PREPAID' as const,
    price: new Prisma.Decimal(749),
    currency: 'inr',
    validityDays: 70,
    dataAllowanceGb: new Prisma.Decimal(2.0),
    callingBenefit: 'Unlimited Calls Across India',
    smsCount: 100,
    businessOnly: false,
    isActive: true,
    isFeatured: true,
    isValidityOnly: false,
    dataBankEnabled: true,
    rolloverLimitMb: 20480, // 20 GB
    rolloverExpiryDays: 90,
    dataTransferEnabled: true,
    transferLimitMb: 5120,
    dailyDataAllowanceMb: 2048, // 2 GB/day
  },
  {
    name: 'Plan 3',
    description: '365 Days non-stop connectivity with 2.5 GB/day, zero daily stress & full Data Bank rollover',
    type: 'PREPAID' as const,
    price: new Prisma.Decimal(2999),
    currency: 'inr',
    validityDays: 365,
    dataAllowanceGb: new Prisma.Decimal(2.5),
    callingBenefit: 'Unlimited Pan-India Calls',
    smsCount: 3600,
    businessOnly: false,
    isActive: true,
    isFeatured: false,
    isValidityOnly: false,
    dataBankEnabled: true,
    rolloverLimitMb: 51200, // 50 GB
    rolloverExpiryDays: 180,
    dataTransferEnabled: true,
    transferLimitMb: 10240,
    dailyDataAllowanceMb: 2560, // 2.5 GB/day
  },
  {
    name: 'Plan 4',
    description: 'Affordable validity extension with basic calling and emergency data buffer',
    type: 'VALIDITY_ONLY' as const,
    price: new Prisma.Decimal(155),
    currency: 'inr',
    validityDays: 24,
    dataAllowanceGb: new Prisma.Decimal(1.0),
    callingBenefit: '300 Local/STD Minutes',
    smsCount: 300,
    businessOnly: false,
    isActive: true,
    isFeatured: false,
    isValidityOnly: true,
    dataBankEnabled: false,
    rolloverLimitMb: null,
    rolloverExpiryDays: null,
    dataTransferEnabled: false,
    transferLimitMb: null,
    dailyDataAllowanceMb: null, // validity-only pack — no daily data
  },
  {
    name: 'Plan 5',
    description: 'Postpaid family plan with 75 GB monthly data pool, unlimited calling & rollover up to 200 GB',
    type: 'POSTPAID' as const,
    price: new Prisma.Decimal(599),
    currency: 'inr',
    validityDays: 30,
    dataAllowanceGb: new Prisma.Decimal(75.0),
    callingBenefit: 'Unlimited Calling + Roaming',
    smsCount: 100,
    businessOnly: false,
    isActive: true,
    isFeatured: true,
    isValidityOnly: false,
    dataBankEnabled: true,
    rolloverLimitMb: 204800, // 200 GB
    rolloverExpiryDays: 365,
    dataTransferEnabled: true,
    transferLimitMb: 20480,
    dailyDataAllowanceMb: 2560, // ~2.5 GB/day effective from the 75 GB pool
  },
  {
    name: 'Plan 6',
    description: 'Tailored for business SIMs with dedicated priority bandwidth, business prefix support & pool data transfer',
    type: 'BUSINESS' as const,
    price: new Prisma.Decimal(1199),
    currency: 'inr',
    validityDays: 30,
    dataAllowanceGb: new Prisma.Decimal(150.0),
    callingBenefit: 'Unlimited Business Lines + CUG Calling',
    smsCount: 500,
    businessOnly: true,
    isActive: true,
    isFeatured: false,
    isValidityOnly: false,
    dataBankEnabled: true,
    rolloverLimitMb: 512000, // 500 GB
    rolloverExpiryDays: 365,
    dataTransferEnabled: true,
    transferLimitMb: 51200,
    dailyDataAllowanceMb: 5120, // ~5 GB/day effective from the 150 GB pool
  },
];

async function main() {
  console.log('Seeding initial recharge plans...');
  let created = 0;
  let updated = 0;

  for (const plan of SAMPLE_PLANS) {
    const existing = await prisma.plan.findUnique({
      where: { name: plan.name },
    });

    if (!existing) {
      await prisma.plan.create({ data: plan });
      console.log(`+ Created plan: ${plan.name} (Rs.${plan.price})`);
      created++;
      continue;
    }

    // Backfill the usage-simulation / data-bank fields on existing rows
    // without overwriting anything an admin may have configured.
    const backfill: Record<string, number | null> = {};
    if (
      existing.dailyDataAllowanceMb == null &&
      plan.dailyDataAllowanceMb != null
    ) {
      backfill.dailyDataAllowanceMb = plan.dailyDataAllowanceMb;
    }

    if (Object.keys(backfill).length > 0) {
      await prisma.plan.update({
        where: { id: existing.id },
        data: backfill,
      });
      console.log(`~ Backfilled ${Object.keys(backfill).join(', ')}: ${plan.name}`);
      updated++;
    } else {
      console.log(`= Already exists: ${plan.name}`);
    }
  }

  console.log(`Done! Seeded ${created} plans, backfilled ${updated}.`);

  // Second pass: derive dailyDataAllowanceMb on ANY plan still missing it —
  // covers plans created through the admin UI before this field existed.
  // Same rule as the server: dataAllowanceGb × 1024 for per-day plans;
  // POSTPAID pools and validity-only packs stay null.
  const missing = await prisma.plan.findMany({
    where: { dailyDataAllowanceMb: null },
  });
  let derived = 0;
  for (const plan of missing) {
    if (plan.type === 'POSTPAID' || plan.isValidityOnly) continue;
    const gb = plan.dataAllowanceGb ? Number(plan.dataAllowanceGb) : null;
    if (gb == null || gb <= 0) continue;
    const mb = Math.round(gb * 1024);
    await prisma.plan.update({
      where: { id: plan.id },
      data: { dailyDataAllowanceMb: mb },
    });
    console.log(`~ Derived dailyDataAllowanceMb=${mb} (${gb} GB/day): ${plan.name}`);
    derived++;
  }
  console.log(`Derived dailyDataAllowanceMb on ${derived} existing plans.`);
}

main()
  .catch((err) => {
    console.error('Seeding plans failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
