import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { createHash } from 'crypto';

/**
 * Shared Redis client (Upstash over TLS).
 *
 * Upstash's REST credentials don't speak the ioredis protocol — the same
 * host + token are reused on the TLS endpoint instead:
 *   https://<host>.upstash.io  +  token  →  rediss://default:<token>@<host>:6379
 *
 * Every method degrades gracefully: when Redis is unconfigured or
 * unreachable the calls no-op / fall through, so the app never hard-
 * depends on the cache being alive.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: Redis;
  private initFailed = false;

  private get redis(): Redis | null {
    if (this.client || this.initFailed) return this.client ?? null;

    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) {
      this.initFailed = true;
      this.logger.warn('Redis not configured — caching disabled');
      return null;
    }

    const host = url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    try {
      this.client = new Redis(`rediss://default:${token}@${host}:6379`, {
        connectTimeout: 5_000,
        commandTimeout: 3_000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times: number) =>
          times > 3 ? null : Math.min(times * 300, 1_500),
      });
      this.client.on('error', (err: Error) =>
        this.logger.warn(`Redis: ${err.message}`),
      );
      this.client.on('connect', () => this.logger.log('Redis connected'));
    } catch (err) {
      this.initFailed = true;
      this.logger.warn(
        `Redis init failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return this.client ?? null;
  }

  /** SHA-256 hex of an arbitrary string — used for opaque cache key parts. */
  static hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  // ── primitives ──────────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    try {
      return (await this.redis?.get(key)) ?? null;
    } catch {
      return null;
    }
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.redis?.set(key, value, 'EX', Math.ceil(ttlSeconds));
      } else {
        await this.redis?.set(key, value);
      }
    } catch {
      /* cache miss — non-fatal */
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length) await this.redis?.del(...keys);
    } catch {
      /* non-fatal */
    }
  }

  /** Delete every key matching a glob — uses SCAN (never KEYS in prod). */
  async delPattern(pattern: string): Promise<void> {
    const redis = this.redis;
    if (!redis) return;
    try {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const batch: string[] = [];
      for await (const keys of stream) {
        batch.push(...(keys as string[]));
      }
      if (batch.length) await redis.del(...batch);
    } catch {
      /* non-fatal */
    }
  }

  // ── cache-aside ─────────────────────────────────────────────────────────

  /**
   * Read-through cache: return the cached value, otherwise run `compute`,
   * store the result for `ttlSeconds`, and return it. Always computes
   * when Redis is down — the cache can never break a request.
   */
  async remember<T>(
    key: string,
    ttlSeconds: number,
    compute: () => Promise<T>,
  ): Promise<T> {
    const redis = this.redis;
    if (redis) {
      try {
        const cached = await redis.get(key);
        if (cached !== null) return JSON.parse(cached) as T;
      } catch {
        /* fall through to compute */
      }
    }

    const value = await compute();

    if (redis) {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch {
        /* non-fatal */
      }
    }
    return value;
  }

  /** Close the connection when the app shuts down. */
  async onModuleDestroy() {
    try {
      await this.client?.quit();
    } catch {
      this.client?.disconnect();
    }
  }
}
