import { Module } from '@nestjs/common';
import { LoansModule } from '../loans/loans.module.js';
import { RechargeController } from './recharge.controller.js';
import { RechargeService } from './recharge.service.js';

/**
 * Customer recharge flow:
 *   GET  /api/v1/recharge/overview  — own SIMs with current + queued plans
 *   POST /api/v1/recharge/checkout  — order + Stripe checkout session
 * Plan fulfillment happens in RechargeService.fulfillOrder, triggered from
 * the Stripe webhook (or the session-verify fallback) via StripeModule.
 */
@Module({
  imports: [LoansModule],
  controllers: [RechargeController],
  providers: [RechargeService],
  exports: [RechargeService],
})
export class RechargeModule {}
