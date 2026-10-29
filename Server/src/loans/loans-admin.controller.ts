import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { ApiException } from '../common/api-error.js';
import { LoansService } from './loans.service.js';
import { CancelLoanDto, ListAdminLoansQueryDto, RunNightlyQueryDto } from './dto.js';

/** Zylo Data Loan — SUPER_ADMIN only. */
@Controller('admin/loans')
@UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
export class LoansAdminController {
  constructor(private readonly loans: LoansService) {}

  // `summary` must be declared before `:id` so it isn't captured as an id.
  @Get('summary')
  async summary() {
    return { data: await this.loans.adminSummary() };
  }

  @Get()
  async list(@Query() query: ListAdminLoansQueryDto) {
    return this.loans.adminList(query); // { data, meta } → envelope
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.loans.adminGet(id) };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelLoanDto,
  ) {
    return { data: await this.loans.adminCancel(id, dto.reason) };
  }
}

/**
 * Demo-only trigger for the nightly loan job. Disabled unless
 * ALLOW_DEMO_JOBS=true so production can never fast-forward time.
 *   POST /api/v1/admin/jobs/loan-nightly?asOf=2026-11-05T00:00:00Z
 */
@Controller('admin/jobs')
@UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
export class LoansJobsController {
  constructor(private readonly loans: LoansService) {}

  @Post('loan-nightly')
  async runNightly(@Query() query: RunNightlyQueryDto) {
    if (process.env.ALLOW_DEMO_JOBS !== 'true') {
      throw new ApiException(
        403,
        'DEMO_JOBS_DISABLED',
        'Demo job triggers are disabled on this server.',
      );
    }
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new ApiException(400, 'INVALID_DATE', 'asOf must be an ISO date/time.');
    }
    return { data: await this.loans.runNightlyTick(asOf) };
  }
}
