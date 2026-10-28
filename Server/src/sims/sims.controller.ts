import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { SimsService } from './sims.service.js';

// SIM fleet overview — SUPER_ADMIN only.
@Controller('sims')
@UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
export class SimsController {
  constructor(private readonly sims: SimsService) {}

  /**
   * List every purchased SIM with its owner, phone number, and active
   * plan. Returns mock data until real Sim records are created by the
   * purchase flow.
   */
  @Get()
  async listSims() {
    return { data: { sims: await this.sims.listSims() } };
  }
}
