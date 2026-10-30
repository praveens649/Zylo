import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { MusicAdminService } from './music-admin.service.js';
import { CreateMusicPlanDto, UpdateMusicPlanDto } from './dto.js';

/** Zylo Music — SUPER_ADMIN only. */
@Controller('admin/music')
@UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
export class MusicAdminController {
  constructor(private readonly admin: MusicAdminService) {}

  @Get('plans')
  async plans() {
    return { data: await this.admin.listPlans() };
  }

  @Post('plans')
  async createPlan(@Body() dto: CreateMusicPlanDto) {
    return { data: await this.admin.createPlan(dto) };
  }

  @Patch('plans/:id')
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMusicPlanDto,
  ) {
    return { data: await this.admin.updatePlan(id, dto) };
  }

  @Delete('plans/:id')
  async deletePlan(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.admin.deletePlan(id) };
  }

  @Get('subscriptions')
  async subscriptions() {
    return { data: await this.admin.listSubscriptions() };
  }
}
