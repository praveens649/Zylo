import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller.js';
import {
  LoansAdminController,
  LoansJobsController,
} from './loans-admin.controller.js';
import { LoansJobsService } from './loans-jobs.service.js';
import { LoansService } from './loans.service.js';

/**
 * Zylo Data Loan — customers borrow a small amount of data, repaid
 * automatically from new Data Bank deposits or settled on the next recharge.
 *
 *   GET  /api/v1/loans/eligibility?simId=   GET /api/v1/loans/active?simId=
 *   POST /api/v1/loans (Idempotency-Key)    GET /api/v1/loans?simId=
 *   GET  /api/v1/admin/loans[/summary|/:id]  POST /api/v1/admin/loans/:id/cancel
 *   POST /api/v1/admin/jobs/loan-nightly?asOf=  (demo, ALLOW_DEMO_JOBS=true)
 *
 * Imported by DataBankModule (deposit repayment) and RechargeModule
 * (recharge settlement). Simulated — no real network data is involved.
 */
@Module({
  controllers: [LoansController, LoansAdminController, LoansJobsController],
  providers: [LoansService, LoansJobsService],
  exports: [LoansService],
})
export class LoansModule {}
