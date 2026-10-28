import { Module } from '@nestjs/common';
import { DataBankController } from './data-bank.controller.js';
import { DataBankService } from './data-bank.service.js';
import { DataQuestModule } from '../data-quest/data-quest.module.js';

/**
 * Zylo Data Bank — saves a SIM's unused daily data into a bank balance
 * with an auditable ledger (DataBankTransaction).
 *   GET  /api/v1/sims/:simId/data-bank
 *   POST /api/v1/sims/:simId/data-bank/save
 *   POST /api/v1/sims/:simId/data-bank/redeem
 */
@Module({
  imports: [DataQuestModule],
  controllers: [DataBankController],
  providers: [DataBankService],
  exports: [DataBankService],
})
export class DataBankModule {}
