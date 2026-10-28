import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { UsageSimulationService } from './usage-simulation.service.js';

/**
 * Data usage simulation endpoints, scoped to a SIM owned by the authenticated user.
 *
 *   POST /api/v1/sims/:simId/usage/start  — start the simulation
 *   GET  /api/v1/sims/:simId/usage        — live status (no state change)
 *   POST /api/v1/sims/:simId/usage/stop   — stop and persist consumed data
 */
@Controller('sims/:simId/usage')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class UsageSimulationController {
  constructor(private readonly usageService: UsageSimulationService) {}

  @Post('start')
  async start(
    @Param('simId') simId: string,
    @CurrentUser() user: UserModel,
  ) {
    const data = await this.usageService.start(simId, user.id);
    return { data };
  }

  @Get()
  async getStatus(
    @Param('simId') simId: string,
    @CurrentUser() user: UserModel,
  ) {
    const data = await this.usageService.getStatus(simId, user.id);
    return { data };
  }

  @Post('stop')
  async stop(
    @Param('simId') simId: string,
    @CurrentUser() user: UserModel,
  ) {
    const data = await this.usageService.stop(simId, user.id);
    return { data };
  }
}
