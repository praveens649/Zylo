import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEVICES = [
  {
    name: 'Zylo Router Duo',
    sku: 'ZWF-DUO',
    code: 'DB',
    description: 'Dual-band Wi-Fi 5 router for plans up to 300 Mbps.',
    band: 'DUAL_BAND' as const,
    wifiStandard: 'Wi-Fi 5',
    maxDevices: 32,
    ethernetPorts: 4,
    isMesh: false,
    purchasePrice: 1999,
    rentalPerMonth: 99,
    securityDeposit: 999,
    isFeatured: false,
  },
  {
    name: 'Zylo Router AX',
    sku: 'ZWF-AX',
    code: 'AX',
    description: 'Wi-Fi 6 dual-band router with better range and capacity.',
    band: 'DUAL_BAND' as const,
    wifiStandard: 'Wi-Fi 6',
    maxDevices: 64,
    ethernetPorts: 4,
    isMesh: false,
    purchasePrice: 3499,
    rentalPerMonth: 149,
    securityDeposit: 1499,
    isFeatured: true,
  },
  {
    name: 'Zylo Mesh Trio',
    sku: 'ZWF-TRIO',
    code: 'TR',
    description: 'Tri-band Wi-Fi 6E mesh router. Required for gigabit plans.',
    band: 'TRI_BAND' as const,
    wifiStandard: 'Wi-Fi 6E',
    maxDevices: 128,
    ethernetPorts: 4,
    isMesh: true,
    purchasePrice: 7999,
    rentalPerMonth: null,
    securityDeposit: null,
    isFeatured: false,
  },
];

const PLANS = [
  { name: 'Zylo Fiber 40', type: 'BASE', price: 399, validityDays: 30, speedMbps: 40, dataLimitGb: 3300, postFupSpeedMbps: 4, requiresTriBand: false, isFeatured: false, description: 'Everyday browsing, streaming and calls.', features: ['40 Mbps download', 'Unlimited calls-ready', 'SD/HD streaming'] },
  { name: 'Zylo Fiber 100', type: 'BASE', price: 699, validityDays: 30, speedMbps: 100, dataLimitGb: null, postFupSpeedMbps: null, requiresTriBand: false, isFeatured: true, description: 'Truly unlimited data for work and play.', features: ['100 Mbps download', 'Truly unlimited data', '4K streaming'] },
  { name: 'Zylo Fiber 200', type: 'BASE', price: 999, validityDays: 30, speedMbps: 200, dataLimitGb: null, postFupSpeedMbps: null, requiresTriBand: false, isFeatured: false, description: 'Unlimited data plus OTT entertainment bundle.', features: ['200 Mbps download', 'Truly unlimited data', 'OTT apps included'] },
  { name: 'Zylo Gigabit', type: 'BASE', price: 1999, validityDays: 30, speedMbps: 1000, dataLimitGb: null, postFupSpeedMbps: null, requiresTriBand: true, isFeatured: false, description: '1 Gbps fibre for prosumers — needs a tri-band router.', features: ['1000 Mbps download', 'Truly unlimited data', 'Priority support'] },
  { name: 'Static IP', type: 'ADD_ON', price: 199, validityDays: 30, speedMbps: 1, dataLimitGb: null, postFupSpeedMbps: null, requiresTriBand: false, isFeatured: false, description: 'A dedicated static IP for remote access and hosting.', features: ['1 static IPv4 address'] },
  { name: 'Work From Home Pack', type: 'ADD_ON', price: 149, validityDays: 30, speedMbps: 1, dataLimitGb: null, postFupSpeedMbps: null, requiresTriBand: false, isFeatured: false, description: 'Priority routing for video calls during work hours.', features: ['Priority traffic 9 AM – 6 PM'] },
  { name: 'Gaming Boost', type: 'ADD_ON', price: 129, validityDays: 30, speedMbps: 1, dataLimitGb: null, postFupSpeedMbps: null, requiresTriBand: false, isFeatured: false, description: 'Low-latency routing for competitive gaming.', features: ['Low-latency game routing'] },
] as const;

async function main() {
  for (const { code, ...d } of DEVICES) {
    const device = await prisma.wifiDevice.upsert({
      where: { sku: d.sku },
      update: {},
      create: d,
    });

    const existing = await prisma.wifiDeviceUnit.count({ where: { deviceId: device.id } });
    for (let i = existing + 1; i <= 10; i++) {
      const n = String(i).padStart(3, '0');
      const serialNumber = `ZWF-${code}-${n}`;
      await prisma.wifiDeviceUnit.create({
        data: {
          deviceId: device.id,
          serialNumber,
          macAddress: `02:5B:${code === 'DB' ? '01' : code === 'AX' ? '02' : '03'}:00:00:${i.toString(16).padStart(2, '0').toUpperCase()}`,
          warrantyEndsAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        },
      });
    }
    console.log(`Device ${device.name}: units ensured (10)`);
  }

  for (const p of PLANS) {
    await prisma.wifiPlan.upsert({
      where: { name: p.name },
      update: {},
      create: { ...p, features: [...p.features] },
    });
  }
  console.log(`WiFi plans ensured: ${PLANS.length}`);
}

main()
  .catch((e) => {
    console.error('WiFi seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
