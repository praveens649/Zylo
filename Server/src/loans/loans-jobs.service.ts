import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { LoansService } from './loans.service.js';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Runs the due-date / auto-repayment tick on a timer (hourly — every
 * transition is status-guarded and reference-guarded, so repeats are no-ops).
 * Set LOAN_JOBS_ENABLED=false to disable the timer.
 */
@Injectable()
export class LoansJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoansJobsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly loans: LoansService) {}

  onModuleInit() {
    if (process.env.LOAN_JOBS_ENABLED === 'false') return;
    this.timer = setInterval(() => void this.tick(), HOUR_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    try {
      return await this.loans.runNightlyTick(new Date());
    } catch (err) {
      this.logger.error(
        `Loan job tick failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
