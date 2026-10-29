import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

config({ path: '.env.local' });
config({ path: '.env' });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const PLANS = [
  // Singapore — matches the Travel Connect reference UI
  {
    name: 'Singapore 3 GB Lite',
    description: '3 GB high-speed data for short trips to Singapore.',
    destinationCountry: 'SG',
    dataAllowanceMb: 3072,
    validityDays: 5,
    pricePaise: 39900,
  },
  {
    name: 'Singapore 5 GB + Calls',
    description:
      '5 GB data, 100 mins local & international calls and 100 SMS.',
    destinationCountry: 'SG',
    dataAllowanceMb: 5120,
    validityDays: 7,
    callMinutes: 100,
    smsCount: 100,
    pricePaise: 79900,
  },
  {
    name: 'Singapore 10 GB + Calls',
    description:
      '10 GB data, 200 mins calls and 200 SMS for longer stays.',
    destinationCountry: 'SG',
    dataAllowanceMb: 10240,
    validityDays: 15,
    callMinutes: 200,
    smsCount: 200,
    pricePaise: 129900,
  },
  // UAE
  {
    name: 'UAE 3 GB Lite',
    description: '3 GB high-speed data for Dubai and the UAE.',
    destinationCountry: 'AE',
    dataAllowanceMb: 3072,
    validityDays: 7,
    pricePaise: 49900,
  },
  {
    name: 'UAE 10 GB + Calls',
    description:
      '10 GB data, 150 mins calls and 100 SMS for longer UAE stays.',
    destinationCountry: 'AE',
    dataAllowanceMb: 10240,
    validityDays: 15,
    callMinutes: 150,
    smsCount: 100,
    pricePaise: 149900,
  },
  // Thailand
  {
    name: 'Thailand 5 GB + Calls',
    description: '5 GB data, 100 mins calls and 100 SMS across Thailand.',
    destinationCountry: 'TH',
    dataAllowanceMb: 5120,
    validityDays: 8,
    callMinutes: 100,
    smsCount: 100,
    pricePaise: 59900,
  },
  // USA
  {
    name: 'USA 5 GB + Calls',
    description:
      '5 GB data, 100 mins calls and 100 SMS on US nationwide networks.',
    destinationCountry: 'US',
    dataAllowanceMb: 5120,
    validityDays: 10,
    callMinutes: 100,
    smsCount: 100,
    pricePaise: 99900,
  },
  {
    name: 'USA 15 GB + Calls',
    description:
      '15 GB data, 300 mins calls and 300 SMS for longer US trips.',
    destinationCountry: 'US',
    dataAllowanceMb: 15360,
    validityDays: 30,
    callMinutes: 300,
    smsCount: 300,
    pricePaise: 249900,
  },
  // UK
  {
    name: 'UK 5 GB + Calls',
    description:
      '5 GB data, 100 mins calls and 100 SMS across the United Kingdom.',
    destinationCountry: 'GB',
    dataAllowanceMb: 5120,
    validityDays: 10,
    callMinutes: 100,
    smsCount: 100,
    pricePaise: 89900,
  },
  // Japan
  {
    name: 'Japan 5 GB + Calls',
    description: '5 GB data, 100 mins calls and 100 SMS across Japan.',
    destinationCountry: 'JP',
    dataAllowanceMb: 5120,
    validityDays: 8,
    callMinutes: 100,
    smsCount: 100,
    pricePaise: 89900,
  },
];

const NUMBERS: { countryCode: string; prefix: string; numbers: string[] }[] = [
  {
    countryCode: 'SG',
    prefix: '+65',
    numbers: [
      '+65 8123 4567', '+65 8456 7890', '+65 8789 0123', '+65 8012 3456',
      '+65 8567 8901', '+65 8901 2345', '+65 8234 5678', '+65 8678 9012',
      '+65 8345 6789', '+65 8856 7890',
    ],
  },
  {
    countryCode: 'AE',
    prefix: '+971',
    numbers: [
      '+971 50 123 4567', '+971 55 678 9012', '+971 52 345 6789',
      '+971 56 890 1234', '+971 54 456 7890', '+971 58 901 2345',
      '+971 50 567 8901', '+971 55 012 3456', '+971 52 678 9012',
      '+971 56 234 5678',
    ],
  },
  {
    countryCode: 'TH',
    prefix: '+66',
    numbers: [
      '+66 61 234 5678', '+66 89 765 4321', '+66 62 345 6789',
      '+66 95 678 9012', '+66 81 456 7890', '+66 92 567 8901',
      '+66 84 678 9012', '+66 97 890 1234', '+66 63 345 6789',
      '+66 86 901 2345',
    ],
  },
  {
    countryCode: 'US',
    prefix: '+1',
    numbers: [
      '+1 415 555 0123', '+1 212 555 0456', '+1 646 555 0789',
      '+1 310 555 0234', '+1 202 555 0567', '+1 617 555 0890',
      '+1 312 555 0345', '+1 206 555 0678', '+1 702 555 0901',
      '+1 305 555 0124',
    ],
  },
  {
    countryCode: 'GB',
    prefix: '+44',
    numbers: [
      '+44 7700 900123', '+44 7911 123456', '+44 7400 654321',
      '+44 7700 900456', '+44 7911 789012', '+44 7455 123098',
      '+44 7700 908765', '+44 7933 456789', '+44 7422 098765',
      '+44 7800 345678',
    ],
  },
  {
    countryCode: 'JP',
    prefix: '+81',
    numbers: [
      '+81 90 1234 5678', '+81 80 9876 5432', '+81 70 4567 8901',
      '+81 90 2345 6789', '+81 80 6789 0123', '+81 70 8901 2345',
      '+81 90 3456 7890', '+81 80 7890 1234', '+81 70 9012 3456',
      '+81 90 4567 8901',
    ],
  },
];

async function main() {
  for (const plan of PLANS) {
    const existing = await prisma.internationalPlan.findFirst({
      where: { name: plan.name, destinationCountry: plan.destinationCountry },
    });
    if (existing) {
      console.log(`skip  ${plan.name} (already exists)`);
      continue;
    }
    await prisma.internationalPlan.create({ data: plan });
    console.log(`seed  ${plan.name}`);
  }

  for (const group of NUMBERS) {
    for (const number of group.numbers) {
      const existing = await prisma.phoneNumber.findUnique({ where: { number } });
      if (existing) {
        console.log(`skip  ${number} (already exists)`);
        continue;
      }
      await prisma.phoneNumber.create({
        data: { number, prefix: group.prefix, countryCode: group.countryCode },
      });
      console.log(`seed  ${number} (${group.countryCode})`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
