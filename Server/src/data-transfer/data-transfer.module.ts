import { Module } from '@nestjs/common';
import { DataQuestModule } from '../data-quest/data-quest.module.js';
import { DataTransferController } from './data-transfer.controller.js';
import { DataTransferService } from './data-transfer.service.js';

/**
 * Zylo Data Transfer — P2P sharing of today's remaining daily data.
 * Sends are atomic (one transaction spends the sender's daily pool, credits
 * the recipient's Data Bank, writes the ledger entry and notifications) and
 * idempotent via the client-supplied idempotencyKey.
 */
@Module({
  imports: [DataQuestModule],
  controllers: [DataTransferController],
  providers: [DataTransferService],
})
export class DataTransferModule {}
