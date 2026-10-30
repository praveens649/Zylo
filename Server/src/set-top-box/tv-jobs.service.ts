import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { runLifecycleTick, runRentalBilling } from './tv-lifecycle.js';
import { stripeRentCharger } from './tv-rent.js';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Runs the expiry / grace / suspend / auto-resume tick on a timer.
 * Every transition is status-guarded, so overlapping runs (several server
 * instances, or a manual admin run) cannot double-apply anything.
 * Set TV_JOBS_ENABLED=false to disable the timer.
 */
@Injectable()
export class TvJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TvJobsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.TV_JOBS_ENABLED === 'false') return;
    this.timer = setInterval(() => void this.tick(), HOUR_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    try {
      const now = new Date();
      const r = await runLifecycleTick(this.prisma, now);
      const rent = await runRentalBilling(this.prisma, now, stripeRentCharger(this.prisma));
      if (r.resumed || r.expiredSubscriptions || r.gracePeriod || r.suspended || rent.charged || rent.toManualPay) {
        this.logger.log(`TV lifecycle: ${JSON.stringify(r)} rent: ${JSON.stringify(rent)}`);
      }
      return { ...r, rent };
    } catch (err) {
      this.logger.error(`TV lifecycle tick failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }
}
