import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

config({ path: '.env.local' });
config({ path: '.env' });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const name = process.env.SUPER_ADMIN_NAME;
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!process.env.DATABASE_URL || !name || !email || !password) {
    throw new Error(
      'Set DATABASE_URL, SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD',
    );
  }

  if (password.length < 10) {
    throw new Error('Super Admin password must be at least 10 characters');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    if (existingUser.role !== 'SUPER_ADMIN') {
      throw new Error(
        'This email already belongs to a non-Super Admin account',
      );
    }
    console.log('Super Admin already exists. No changes made.');
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      isActive: true,
    },
  });

  console.log('Super Admin created successfully.');
}

main()
  .catch((error) => {
    console.error(
      'Super Admin seed failed:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
