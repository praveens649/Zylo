import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const PLANS = [
  {
    name: 'Music Basic',
    description: 'Unlimited catalog search and 30-second previews on one device.',
    price: 59,
    validityDays: 30,
    audioQuality: 'standard',
    maxDevices: 1,
    sortOrder: 0,
  },
  {
    name: 'Music Premium',
    description: 'Ad-free listening, HD audio, and offline-ready queue on 3 devices.',
    price: 149,
    validityDays: 30,
    audioQuality: 'hd',
    maxDevices: 3,
    sortOrder: 1,
  },
  {
    name: 'Music Family',
    description: 'Premium for the whole home — lossless audio on 6 devices.',
    price: 249,
    validityDays: 30,
    audioQuality: 'lossless',
    maxDevices: 6,
    sortOrder: 2,
  },
];

async function main() {
  for (const p of PLANS) {
    await prisma.musicPlan.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }
  console.log(`Music plans ensured: ${PLANS.length}`);
}

main()
  .catch((e) => {
    console.error('Music seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
