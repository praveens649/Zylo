import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { AuthService } from '../auth/auth.service.js';
import { SYSTEM_ROLE } from '../common/constants.js';
import { PlansService } from './plans.service.js';
import {
  CreatePlanDto,
  ListPlansQueryDto,
  UpdatePlanDto,
} from './dto.js';

@Controller('plans')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Helper to inspect if request is from an authenticated admin
   * without blocking unauthenticated requests.
   */
  private async isRequestAdmin(req: Request): Promise<boolean> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return false;
    const token = authHeader.slice(7).trim();
    if (!token) return false;

    try {
      const user = await this.authService.resolveTokenUser(token);
      return user.role === SYSTEM_ROLE;
    } catch {
      return false;
    }
  }

  @Get('stats')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async getStats() {
    const stats = await this.plansService.getPlanStats();
    return { data: stats };
  }

  @Get()
  async listPlans(@Query() query: ListPlansQueryDto, @Req() req: Request) {
    const isAdmin = await this.isRequestAdmin(req);
    const { data, meta } = await this.plansService.listPlans(query, isAdmin);
    return { data, meta };
  }

  @Get(':id')
  async getPlan(@Param('id', ParseUUIDPipe) id: string) {
    const plan = await this.plansService.getPlanById(id);
    return { data: plan };
  }

  @Post()
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async createPlan(@Body() dto: CreatePlanDto) {
    const plan = await this.plansService.createPlan(dto);
    return { data: plan };
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    const plan = await this.plansService.updatePlan(id, dto);
    return { data: plan };
  }

  @Patch(':id/toggle-status')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async toggleStatus(@Param('id', ParseUUIDPipe) id: string) {
    const plan = await this.plansService.togglePlanStatus(id);
    return { data: plan };
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async deletePlan(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.plansService.deletePlan(id);
    return { data: result };
  }
}
