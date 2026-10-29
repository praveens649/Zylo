import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { runLifecycleTick } from './wifi-lifecycle.js';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Runs the expiry / grace / suspend / auto-resume tick on a timer.
 * Every transition is status-guarded, so overlapping runs (several server
 * instances, or a manual admin run) cannot double-apply anything.
 * Set WIFI_JOBS_ENABLED=false to disable the timer.
 */
@Injectable()
export class WifiJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WifiJobsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.WIFI_JOBS_ENABLED === 'false') return;
    this.timer = setInterval(() => void this.tick(), HOUR_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    try {
      const r = await runLifecycleTick(this.prisma);
      if (r.resumed || r.expiredSubscriptions || r.gracePeriod || r.suspended) {
        this.logger.log(`WiFi lifecycle: ${JSON.stringify(r)}`);
      }
      return r;
    } catch (err) {
      this.logger.error(`WiFi lifecycle tick failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }
}
