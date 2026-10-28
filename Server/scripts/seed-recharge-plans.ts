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
    name: 'Zylo Super Hero 299',
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
  },
  {
    name: 'Zylo Unlimited Max 749',
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
  },
  {
    name: 'Zylo Annual Mega 2999',
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
  },
  {
    name: 'Zylo Validity Booster 155',
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
  },
  {
    name: 'Zylo Postpaid Infinity 599',
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
  },
  {
    name: 'Zylo Enterprise Pro 1199',
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
  },
];

async function main() {
  console.log('Seeding initial recharge plans...');
  let created = 0;

  for (const plan of SAMPLE_PLANS) {
    const existing = await prisma.plan.findUnique({
      where: { name: plan.name },
    });

    if (!existing) {
      await prisma.plan.create({ data: plan });
      console.log(`+ Created plan: ${plan.name} (₹${plan.price})`);
      created++;
    } else {
      console.log(`= Already exists: ${plan.name}`);
    }
  }

  console.log(`Done! Seeded ${created} plans.`);
}

main()
  .catch((err) => {
    console.error('Seeding plans failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
