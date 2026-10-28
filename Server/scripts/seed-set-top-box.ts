import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const MODELS = [
  {
    name: 'Zylo Box HD',
    sku: 'ZTV-HD',
    code: 'HD',
    description: 'Entry-level HD set-top box for live TV.',
    resolution: 'HD' as const,
    isSmart: false,
    hasRecording: false,
    storageGb: null,
    purchasePrice: 1499,
    rentalPerMonth: 99,
    securityDeposit: 999,
    isFeatured: false,
  },
  {
    name: 'Zylo Box Smart HD',
    sku: 'ZTV-SMART-HD',
    code: 'SH',
    description: 'Android TV box with apps and 8 GB storage.',
    resolution: 'HD' as const,
    isSmart: true,
    hasRecording: true,
    storageGb: 8,
    purchasePrice: 2999,
    rentalPerMonth: 149,
    securityDeposit: 1499,
    isFeatured: true,
  },
  {
    name: 'Zylo Box 4K',
    sku: 'ZTV-4K',
    code: '4K',
    description: '4K UHD smart box with 32 GB recording storage.',
    resolution: 'UHD_4K' as const,
    isSmart: true,
    hasRecording: true,
    storageGb: 32,
    purchasePrice: 4999,
    rentalPerMonth: null,
    securityDeposit: null,
    isFeatured: false,
  },
];

const PLANS = [
  { name: 'Zylo Lite', type: 'BASE', price: 199, validityDays: 30, channelCount: 120, hdChannelCount: 10, languages: ['Tamil', 'English'], requires4kBox: false, isFeatured: false, description: 'Essential entertainment and news.' },
  { name: 'Zylo Family', type: 'BASE', price: 349, validityDays: 30, channelCount: 250, hdChannelCount: 40, languages: ['Tamil', 'English', 'Hindi'], requires4kBox: false, isFeatured: true, description: 'Entertainment, kids, movies and sports.' },
  { name: 'Zylo Premium', type: 'BASE', price: 549, validityDays: 30, channelCount: 400, hdChannelCount: 120, languages: ['Tamil', 'English', 'Hindi', 'Telugu', 'Malayalam'], requires4kBox: false, isFeatured: false, description: 'Everything in Family plus premium HD channels.' },
  { name: 'Zylo Ultra 4K', type: 'BASE', price: 799, validityDays: 30, channelCount: 450, hdChannelCount: 200, languages: ['Tamil', 'English', 'Hindi', 'Telugu', 'Malayalam'], requires4kBox: true, isFeatured: false, description: 'Full premium lineup with 4K channels.' },
  { name: 'Sports Pack', type: 'ADD_ON', price: 149, validityDays: 30, channelCount: 25, hdChannelCount: 15, languages: ['English', 'Hindi', 'Tamil'], requires4kBox: false, isFeatured: false, description: 'Live cricket, football and more.' },
  { name: 'Movies Pack', type: 'ADD_ON', price: 129, validityDays: 30, channelCount: 30, hdChannelCount: 20, languages: ['English', 'Hindi', 'Tamil', 'Telugu'], requires4kBox: false, isFeatured: false, description: 'Round-the-clock movie channels.' },
  { name: 'Kids Pack', type: 'ADD_ON', price: 79, validityDays: 30, channelCount: 15, hdChannelCount: 5, languages: ['English', 'Tamil', 'Hindi'], requires4kBox: false, isFeatured: false, description: 'Cartoons and learning channels.' },
  { name: '4K Showcase Pack', type: 'ADD_ON', price: 199, validityDays: 30, channelCount: 10, hdChannelCount: 10, languages: ['English'], requires4kBox: true, isFeatured: false, description: 'Native 4K UHD channels.' },
] as const;

async function main() {
  for (const { code, ...m } of MODELS) {
    const model = await prisma.setTopBoxModel.upsert({
      where: { sku: m.sku },
      update: {},
      create: m,
    });

    const existing = await prisma.setTopBoxUnit.count({ where: { modelId: model.id } });
    for (let i = existing + 1; i <= 10; i++) {
      const n = String(i).padStart(3, '0');
      const serialNumber = `ZTV-${code}-${n}`;
      await prisma.setTopBoxUnit.create({
        data: {
          modelId: model.id,
          serialNumber,
          macAddress: `02:5A:${code === 'HD' ? '01' : code === 'SH' ? '02' : '03'}:00:00:${i.toString(16).padStart(2, '0').toUpperCase()}`,
          smartCardNumber: `${code === 'HD' ? '1001' : code === 'SH' ? '1002' : '1003'}${String(i).padStart(8, '0')}`,
          warrantyEndsAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        },
      });
    }
    console.log(`Model ${model.name}: units ensured (10)`);
  }

  for (const p of PLANS) {
    await prisma.tvPlan.upsert({
      where: { name: p.name },
      update: {},
      create: { ...p, languages: [...p.languages] },
    });
  }
  console.log(`TV plans ensured: ${PLANS.length}`);
}

main()
  .catch((e) => {
    console.error('Set-top box seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
