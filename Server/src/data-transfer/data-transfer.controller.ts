import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { DataTransferService } from './data-transfer.service.js';
import { SendTransferDto } from './dto.js';

/**
 * Zylo Data Transfer — send banked data to a friend on another Zylo number.
 *
 *   GET  /api/v1/data-transfer/overview — my SIMs + transfer eligibility
 *   GET  /api/v1/data-transfer/lookup?number= — find the friend (exact match)
 *   POST /api/v1/data-transfer — send data
 *   GET  /api/v1/data-transfer/history — sent + received
 */
@Controller('data-transfer')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class DataTransferController {
  constructor(private readonly transfers: DataTransferService) {}

  @Get('overview')
  async overview(@CurrentUser() user: UserModel) {
    return { data: await this.transfers.overview(user.id) };
  }

  /** Find the friend who owns a full Zylo number (exact match, no listing). */
  @Get('lookup')
  async lookup(
    @Query('number') number: string,
    @CurrentUser() user: UserModel,
  ) {
    if (!number || number.trim().length < 8) {
      return { data: { recipient: null } };
    }
    return { data: await this.transfers.lookupRecipient(user, number) };
  }

  @Post()
  async send(@Body() dto: SendTransferDto, @CurrentUser() user: UserModel) {
    return { data: await this.transfers.send(user, dto) };
  }

  @Get('history')
  async history(@CurrentUser() user: UserModel) {
    return { data: await this.transfers.history(user.id) };
  }
}
