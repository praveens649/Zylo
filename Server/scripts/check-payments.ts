import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const payments = await prisma.payment.findMany({
  select: {
    id: true,
    userId: true,
    status: true,
    amount: true,
    type: true,
    createdAt: true,
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
});
console.log('PAYMENTS:', JSON.stringify(payments, null, 2));

const subscriptions = await prisma.stripeSubscription.findMany({
  select: {
    id: true,
    userId: true,
    status: true,
    subscriptionStatus: true,
    stripeSubscriptionId: true,
    createdAt: true,
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
});
console.log('SUBSCRIPTIONS:', JSON.stringify(subscriptions, null, 2));

await prisma.$disconnect();
