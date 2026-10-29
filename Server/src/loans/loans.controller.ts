import {
  Body,
  Controller,
  Get,
  Headers,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { LoansService } from './loans.service.js';
import { BorrowLoanDto, RepayLoanDto } from './dto.js';

/**
 * Zylo Data Loan — customer endpoints, always scoped to the caller's own SIMs.
 *
 *   GET  /api/v1/loans/eligibility?simId=  — can this SIM borrow right now?
 *   POST /api/v1/loans                    — borrow (Idempotency-Key required)
 *   GET  /api/v1/loans?simId=             — loan history with transactions
 *   GET  /api/v1/loans/active?simId=      — the open loan, or null
 */
@Controller('loans')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Get('eligibility')
  async eligibility(
    @Query('simId', ParseUUIDPipe) simId: string,
    @CurrentUser() user: UserModel,
  ) {
    return { data: await this.loans.getEligibility(simId, user) };
  }

  @Get('active')
  async active(
    @Query('simId', ParseUUIDPipe) simId: string,
    @CurrentUser() user: UserModel,
  ) {
    return { data: await this.loans.getActive(simId, user.id) };
  }

  @Get()
  async history(
    @Query('simId', ParseUUIDPipe) simId: string,
    @CurrentUser() user: UserModel,
  ) {
    return { data: await this.loans.listForSim(simId, user.id) };
  }

  @Post()
  async borrow(
    @Body() dto: BorrowLoanDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: UserModel,
  ) {
    return { data: await this.loans.borrow(user, dto, idempotencyKey) };
  }

  /** "Repay now" — moves Data Bank balance into the open loan. */
  @Post('repay')
  async repay(@Body() dto: RepayLoanDto, @CurrentUser() user: UserModel) {
    return { data: await this.loans.repayFromBankNow(dto.simId, user.id) };
  }
}
