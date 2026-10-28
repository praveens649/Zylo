import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const orgs = await prisma.businessOrganization.findMany({
    select: {
      id: true,
      name: true,
      numberPrefix: true,
      registrationNumber: true,
      status: true,
      ownerUserId: true,
      createdAt: true,
    },
  });
  console.log(JSON.stringify(orgs, null, 2));
}

main().finally(() => prisma.$disconnect());
