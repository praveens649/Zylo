import { Module } from '@nestjs/common';
import { LoansModule } from '../loans/loans.module.js';
import { DataBankController } from './data-bank.controller.js';
import { DataBankService } from './data-bank.service.js';

/**
 * Zylo Data Bank — saves a SIM's unused daily data into a bank balance
 * with an auditable ledger (DataBankTransaction).
 *   GET  /api/v1/sims/:simId/data-bank
 *   POST /api/v1/sims/:simId/data-bank/save
 */
@Module({
  imports: [LoansModule],
  controllers: [DataBankController],
  providers: [DataBankService],
  exports: [DataBankService],
})
export class DataBankModule {}
