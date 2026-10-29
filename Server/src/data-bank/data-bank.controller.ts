import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { DataBankService } from './data-bank.service.js';
import { RedeemDataBankDto } from './dto.js';

/**
 * Zylo Data Bank endpoints, scoped to a SIM owned by the authenticated user.
 *
 *   GET  /api/v1/sims/:simId/data-bank       — balance, limits, savable amount
 *   POST /api/v1/sims/:simId/data-bank/save  — bank today's unused data
 */
@Controller('sims/:simId/data-bank')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class DataBankController {
  constructor(private readonly dataBank: DataBankService) {}

  @Get()
  async getStatus(
    @Param('simId') simId: string,
    @CurrentUser() user: UserModel,
  ) {
    const data = await this.dataBank.getStatus(simId, user.id);
    return { data };
  }

  @Post('save')
  async save(
    @Param('simId') simId: string,
    @CurrentUser() user: UserModel,
  ) {
    const data = await this.dataBank.saveUnused(simId, user.id);
    return { data };
  }

  @Post('redeem')
  async redeem(
    @Param('simId') simId: string,
    @Body() dto: RedeemDataBankDto,
    @CurrentUser() user: UserModel,
  ) {
    const data = await this.dataBank.redeem(simId, user.id, dto.amountMb);
    return { data };
  }
}
