import { describe, expect, it } from 'vitest';
import { createFakePrisma, createTable } from '../../test/fake-prisma.js';
import { MusicService } from './music.service.js';

const user = { id: 'u1', name: 'Asha', email: 'asha@test.dev' } as any;

const plan = {
  id: 'mp1',
  name: 'Music Premium',
  price: 149,
  currency: 'inr',
  validityDays: 30,
  audioQuality: 'hd',
  maxDevices: 3,
  isActive: true,
  sortOrder: 1,
};

function prisma(seed: Record<string, any[]> = {}) {
  const fake = createFakePrisma(seed);
  const plans = seed.musicPlan ?? [];
  fake.musicPlan = createTable(plans);
  fake.musicSubscription = createTable(seed.musicSubscription, (s: any) => ({
    ...s,
    plan: plans.find((p: any) => p.id === s.planId) ?? null,
  }));
  const subs = fake.musicSubscription;
  fake.order = createTable(seed.order, (o: any) => {
    const row = { ...o, musicPlan: plans.find((p: any) => p.id === o.musicPlanId) ?? null };
    Object.defineProperty(row, 'musicSubscription', {
      get: () => subs.rows.find((s: any) => s.orderId === o.id) ?? null,
      enumerable: true,
    });
    return row;
  });
  return fake;
}

function svc(seed: Record<string, any[]> = {}) {
  const p = prisma(seed);
  return { service: new MusicService(p as any), prisma: p };
}

describe('MusicService.me', () => {
  it('returns the active subscription with days left', async () => {
    const { service } = svc({
      musicPlan: [plan],
      musicSubscription: [
        {
          id: 'ms1', userId: 'u1', planId: 'mp1', status: 'ACTIVE',
          startDate: new Date(), endDate: new Date(Date.now() + 10 * 86400000),
        },
      ],
    });
    const { subscription } = await service.me('u1');
    expect(subscription).toMatchObject({ status: 'ACTIVE', plan: { name: 'Music Premium' } });
    expect(subscription!.daysLeft).toBe(10);
  });

  it('lazily expires a lapsed subscription', async () => {
    const p = prisma({
      musicPlan: [plan],
      musicSubscription: [
        {
          id: 'ms1', userId: 'u1', planId: 'mp1', status: 'ACTIVE',
          startDate: new Date(Date.now() - 40 * 86400000), endDate: new Date(Date.now() - 86400000),
        },
      ],
    });
    const { subscription } = await new MusicService(p as any).me('u1');
    expect(subscription).toBeNull();
    expect(p.musicSubscription.rows[0].status).toBe('EXPIRED');
  });
});

describe('MusicService.fulfillOrder', () => {
  it('creates an ACTIVE subscription once, even when the webhook fires twice', async () => {
    const p = prisma({
      musicPlan: [plan],
      order: [
        { id: 'o1', userId: 'u1', type: 'MUSIC_SUBSCRIPTION', status: 'PENDING', musicPlanId: 'mp1' },
      ],
    });
    const service = new MusicService(p as any);

    await service.fulfillOrder('o1');
    await service.fulfillOrder('o1');

    expect(p.musicSubscription.rows).toHaveLength(1);
    expect(p.musicSubscription.rows[0]).toMatchObject({ status: 'ACTIVE', planId: 'mp1' });
    expect(p.order.rows[0].status).toBe('COMPLETED');
    expect(p.notification.rows).toHaveLength(1);
  });

  it('stacks a renewal after the current subscription end date', async () => {
    const end = new Date(Date.now() + 10 * 86400000);
    const p = prisma({
      musicPlan: [plan],
      musicSubscription: [
        { id: 'ms-old', userId: 'u1', planId: 'mp1', status: 'ACTIVE', startDate: new Date(), endDate: end },
      ],
      order: [
        { id: 'o2', userId: 'u1', type: 'MUSIC_SUBSCRIPTION', status: 'PENDING', musicPlanId: 'mp1' },
      ],
    });
    await new MusicService(p as any).fulfillOrder('o2');

    const sub = p.musicSubscription.rows.find((r: any) => r.orderId === 'o2');
    expect(sub.startDate).toEqual(end);
    expect(sub.endDate).toEqual(new Date(end.getTime() + 30 * 86400000));
  });

  it('ignores foreign order types', async () => {
    const p = prisma({
      musicPlan: [plan],
      order: [{ id: 'o3', userId: 'u1', type: 'RECHARGE', status: 'PENDING' }],
    });
    await new MusicService(p as any).fulfillOrder('o3');
    expect(p.musicSubscription.rows).toHaveLength(0);
    expect(p.order.rows[0].status).toBe('PENDING');
  });
});

describe('MusicService.search gating', () => {
  it('refuses the catalog without an active subscription', async () => {
    const { service } = svc();
    await expect(service.search('u1', 'arijit')).rejects.toMatchObject({ code: 'SUBSCRIPTION_REQUIRED' });
    await expect(service.featured('u1')).rejects.toMatchObject({ code: 'SUBSCRIPTION_REQUIRED' });
  });
});

describe('MusicService provider normalization', () => {
  const withSub = () => svc({
    musicPlan: [plan],
    musicSubscription: [
      {
        id: 'ms1', userId: 'u1', planId: 'mp1', status: 'ACTIVE',
        startDate: new Date(), endDate: new Date(Date.now() + 86400000),
      },
    ],
  });

  it('merges + dedupes iTunes and Deezer results into one track shape', async () => {
    const { service } = withSub();
    (service as any).searchItunes = async () => [
      { id: 'i1', title: 'Tum Hi Ho', artist: 'Arijit Singh', album: 'Aashiqui 2', artworkUrl: 'a.jpg', previewUrl: 'p1.mp3', durationMs: 262000, source: 'itunes' },
    ];
    (service as any).searchDeezer = async () => [
      { id: 'd1', title: 'Tum Hi Ho', artist: 'Arijit Singh', album: 'Aashiqui 2', artworkUrl: 'b.jpg', previewUrl: 'p2.mp3', durationMs: 262000, source: 'deezer' },
      { id: 'd2', title: 'Kesariya', artist: 'Arijit Singh', album: 'Brahmastra', artworkUrl: 'c.jpg', previewUrl: 'p3.mp3', durationMs: 268000, source: 'deezer' },
    ];

    const { tracks } = await service.search('u1', 'arijit');
    expect(tracks).toHaveLength(2);
    expect(tracks[0].previewUrl).toBe('p1.mp3'); // iTunes wins dedupe
    expect(tracks.map((t: any) => t.source)).toEqual(['itunes', 'deezer']);
  });

  it('surfaces MUSIC_UNAVAILABLE only when every provider fails', async () => {
    const { service } = withSub();
    (service as any).searchItunes = async () => { throw new Error('down'); };
    (service as any).searchDeezer = async () => [
      { id: 'd2', title: 'Kesariya', artist: 'Arijit Singh', album: null, artworkUrl: null, previewUrl: 'p3.mp3', durationMs: null, source: 'deezer' },
    ];
    const { tracks } = await service.search('u1', 'kesariya');
    expect(tracks).toHaveLength(1); // partial results still served

    (service as any).searchDeezer = async () => { throw new Error('down'); };
    await expect(service.search('u1', 'x')).rejects.toMatchObject({ code: 'MUSIC_UNAVAILABLE' });
  });
});
