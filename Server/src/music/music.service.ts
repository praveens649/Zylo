import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import type { UserModel } from '../generated/prisma/models.js';
import type { MusicCheckoutDto } from './dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Normalized track shape returned to the client regardless of provider. */
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  /** 30s MP3 preview served by the provider — playable with <audio>. */
  previewUrl: string | null;
  durationMs: number | null;
  /** Set for YouTube results — plays in the official embedded player. */
  youtubeVideoId?: string | null;
  source: 'itunes' | 'deezer' | 'youtube';
}

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

/**
 * Zylo Music — a small subscription streaming product.
 * Customers buy a MusicPlan via Stripe checkout; an ACTIVE subscription
 * unlocks the catalog search + 30s preview playback proxied from the public
 * iTunes Search API and Deezer API. Demo scope: previews only, no licensing.
 */
@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);
  private _stripe?: Stripe;

  constructor(private readonly prisma: PrismaService) {}

  private get stripe(): Stripe {
    if (!this._stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new ApiException(
          500,
          'STRIPE_NOT_CONFIGURED',
          'Stripe is not configured on the server',
        );
      }
      this._stripe = new Stripe(key);
    }
    return this._stripe;
  }

  private get frontendUrl(): string {
    const raw =
      process.env.FRONTEND_URL ??
      process.env.CLIENT_URL ??
      'http://localhost:3000';
    return raw.split(',')[0].trim().replace(/\/+$/, '');
  }

  // -----------------------------------------------------------------------
  // Plans + subscription status
  // -----------------------------------------------------------------------

  async listPlans() {
    const plans = await this.prisma.musicPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { plans };
  }

  /**
   * The customer's current subscription — ACTIVE only while endDate is in
   * the future; lapsed subs are marked EXPIRED on read.
   */
  async me(userId: string) {
    const sub = await this.prisma.musicSubscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });
    if (!sub) return { subscription: null };

    if (sub.endDate.getTime() <= Date.now()) {
      await this.prisma.musicSubscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      return { subscription: null };
    }

    return {
      subscription: {
        id: sub.id,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        daysLeft: Math.max(
          1,
          Math.ceil((sub.endDate.getTime() - Date.now()) / DAY_MS),
        ),
        plan: {
          id: sub.plan.id,
          name: sub.plan.name,
          audioQuality: sub.plan.audioQuality,
          maxDevices: sub.plan.maxDevices,
        },
      },
    };
  }

  private async activeSubscription(tx: Tx | PrismaService, userId: string) {
    return tx.musicSubscription.findFirst({
      where: { userId, status: 'ACTIVE', endDate: { gt: new Date() } },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });
  }

  // -----------------------------------------------------------------------
  // Checkout — order + Stripe session (recharge pattern)
  // -----------------------------------------------------------------------

  async createCheckout(user: UserModel, dto: MusicCheckoutDto) {
    const plan = await this.prisma.musicPlan.findFirst({
      where: { id: dto.planId, isActive: true },
    });
    if (!plan) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'Music plan not found');
    }

    const order = await this.prisma.order.create({
      data: {
        userId: user.id,
        type: 'MUSIC_SUBSCRIPTION',
        status: 'PENDING',
        amount: plan.price,
        currency: plan.currency,
        musicPlanId: plan.id,
      },
    });

    const currency = plan.currency.toLowerCase();
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: Math.round(Number(plan.price) * 100),
            product_data: {
              name: `Zylo Music — ${plan.name}`,
              description: `${plan.validityDays} days · ${plan.audioQuality.toUpperCase()} audio`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'music',
        orderId: order.id,
        userId: user.id,
        planId: plan.id,
      },
      success_url: `${this.frontendUrl}/music?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/music?cancelled=true`,
    });

    await this.prisma.payment.create({
      data: {
        userId: user.id,
        orderId: order.id,
        type: 'ONE_TIME',
        status: 'PENDING',
        amount: plan.price,
        currency,
        description: `Zylo Music — ${plan.name} (${plan.validityDays} days)`,
        stripeCheckoutSessionId: session.id,
      },
    });

    return { sessionId: session.id, url: session.url, orderId: order.id };
  }

  /**
   * Success-page verify — the customer returns from Stripe before the
   * webhook lands; safe to call repeatedly.
   */
  async syncCheckout(user: UserModel, sessionId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
    });
    if (!payment || payment.userId !== user.id) {
      throw new ApiException(404, 'SESSION_NOT_FOUND', 'Checkout session not found');
    }
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid' && session.metadata?.type === 'music') {
      await this.fulfillFromCheckoutSession(session);
    }
    return { synced: true, ...(await this.me(user.id)) };
  }

  // -----------------------------------------------------------------------
  // Fulfillment — called once Stripe confirms payment (webhook / verify).
  // Stacks behind an existing active subscription (renewal extends endDate).
  // -----------------------------------------------------------------------

  async fulfillFromCheckoutSession(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      this.logger.warn(`Music session ${session.id} had no orderId metadata — skipped`);
      return;
    }
    await this.fulfillOrder(orderId);
  }

  async fulfillOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { musicPlan: true, musicSubscription: { select: { id: true } } },
    });
    if (!order || order.type !== 'MUSIC_SUBSCRIPTION' || !order.musicPlan) {
      this.logger.warn(`Music order ${orderId} is missing or invalid`);
      return;
    }
    // Idempotent — a subscription already exists for this order.
    if (order.musicSubscription) return;

    const plan = order.musicPlan;
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        // Renewals queue after the current sub's endDate.
        const last = await tx.musicSubscription.findFirst({
          where: { userId: order.userId, status: 'ACTIVE' },
          orderBy: { endDate: 'desc' },
        });
        const startDate =
          last && last.endDate.getTime() > now.getTime() ? last.endDate : now;
        const endDate = new Date(startDate.getTime() + plan.validityDays * DAY_MS);

        await tx.musicSubscription.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            planId: plan.id,
            status: 'ACTIVE',
            startDate,
            endDate,
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'COMPLETED' },
        });
        await tx.notification.create({
          data: {
            userId: order.userId,
            title: 'Zylo Music activated',
            message: `${plan.name} is live until ${endDate.toDateString()} — open Music and press play.`,
          },
        });
      });
    } catch (err: any) {
      // orderId unique constraint → a concurrent fulfilment already created it.
      if (err?.code === 'P2002') return;
      throw err;
    }
    this.logger.log(`Fulfilled music order ${orderId} (${plan.name})`);
  }

  // -----------------------------------------------------------------------
  // Catalog — proxied to public provider APIs, gated on an ACTIVE sub.
  // -----------------------------------------------------------------------

  private async requireActive(userId: string) {
    const sub = await this.activeSubscription(this.prisma, userId);
    if (!sub) {
      throw new ApiException(
        403,
        'SUBSCRIPTION_REQUIRED',
        'Subscribe to a Zylo Music plan to browse and play.',
      );
    }
    return sub;
  }

  /** Curated catalog for the landing grid when the user hasn't searched. */
  async featured(userId: string) {
    await this.requireActive(userId);
    const tracks = await this.searchProviders('tamil hits');
    return { tracks };
  }

  async search(userId: string, query: string) {
    await this.requireActive(userId);
    const q = query.trim();
    if (!q) return { tracks: [] };
    const tracks = await this.searchProviders(q);
    return { tracks };
  }

  /**
   * Hit all configured providers, merge, dedupe by title+artist.
   * YouTube is queried only when YOUTUBE_API_KEY is set — audio tracks are
   * preferred in dedupe since they carry playable previews.
   */
  private async searchProviders(q: string): Promise<MusicTrack[]> {
    const tasks: Promise<MusicTrack[]>[] = [
      this.searchItunes(q),
      this.searchDeezer(q),
    ];
    if (process.env.YOUTUBE_API_KEY) {
      tasks.push(this.searchYouTube(q));
    }
    const settled = await Promise.allSettled(tasks);
    const merged: MusicTrack[] = [];
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        merged.push(...r.value);
      } else {
        this.logger.warn(
          `Music provider #${i} failed: ${r.reason?.message ?? r.reason}`,
        );
      }
    });
    if (!merged.length) {
      throw new ApiException(
        502,
        'MUSIC_UNAVAILABLE',
        'Music catalog is temporarily unavailable — try again.',
      );
    }

    const seen = new Set<string>();
    const out: MusicTrack[] = [];
    for (const t of merged) {
      const key = `${t.title}||${t.artist}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
      if (out.length >= 48) break;
    }
    return out;
  }

  private async searchItunes(q: string): Promise<MusicTrack[]> {
    const url =
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}` +
      `&media=music&entity=song&limit=30&country=IN`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`iTunes ${res.status}`);
    const json = (await res.json()) as { results?: any[] };
    return (json.results ?? []).map((r) => ({
      id: `itunes-${r.trackId}`,
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName ?? null,
      artworkUrl: r.artworkUrl100
        ? r.artworkUrl100.replace('100x100', '300x300')
        : null,
      previewUrl: r.previewUrl ?? null,
      durationMs: r.trackTimeMillis ?? null,
      source: 'itunes' as const,
    }));
  }

  /**
   * YouTube Data API v3 search — needs YOUTUBE_API_KEY. Videos play through
   * the official embed player (audio-only extraction is not allowed).
   * Quota: ~100 search units/key/day on the free tier.
   * ` song` is appended to the query and obvious non-song titles are
   * filtered so trailers/reactions don't show up in the catalog.
   */
  private static readonly NON_SONG_TITLE =
    /\b(trailer|teaser|reaction|review|making|interview|comedy|prank|recap|explained|tutorial|karaoke|cover|mashup|glimpse|first look|motion poster|audio launch|jukebox|full movie|climax|intro|unseen|leaked|promo)\b/i;

  private async searchYouTube(q: string): Promise<MusicTrack[]> {
    const key = process.env.YOUTUBE_API_KEY!;
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      videoCategoryId: '10', // Music
      maxResults: '20', // extra headroom — some get filtered below
      q: `${q} song`,
      key,
    });
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`YouTube ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { items?: any[] };
    return (json.items ?? [])
      .filter(
        (r) =>
          r.id?.videoId &&
          r.snippet?.title &&
          !MusicService.NON_SONG_TITLE.test(r.snippet.title) &&
          !MusicService.NON_SONG_TITLE.test(r.snippet.description ?? ''),
      )
      .map((r) => ({
        id: `youtube-${r.id.videoId}`,
        title: r.snippet.title,
        artist: r.snippet.channelTitle,
        album: null,
        artworkUrl:
          r.snippet.thumbnails?.medium?.url ?? r.snippet.thumbnails?.default?.url ?? null,
        previewUrl: null,
        durationMs: null,
        youtubeVideoId: r.id.videoId,
        source: 'youtube' as const,
      }));
  }

  private async searchDeezer(q: string): Promise<MusicTrack[]> {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=30`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Deezer ${res.status}`);
    const json = (await res.json()) as { data?: any[] };
    return (json.data ?? []).map((r) => ({
      id: `deezer-${r.id}`,
      title: r.title,
      artist: r.artist?.name ?? 'Unknown',
      album: r.album?.title ?? null,
      artworkUrl: r.album?.cover_medium ?? r.album?.cover ?? null,
      previewUrl: r.preview ?? null,
      durationMs: r.duration ? r.duration * 1000 : null,
      source: 'deezer' as const,
    }));
  }
}
