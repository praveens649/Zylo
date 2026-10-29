import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { WifiAdminService } from './wifi-admin.service.js';
import {
  AssignUnitDto,
  BulkImportUnitsDto,
  CreateUnitDto,
  FailInstallationDto,
  ListInstallationsQueryDto,
  ListUnitsQueryDto,
  ListWifiConnectionsQueryDto,
  ListWifiOrdersQueryDto,
  ReplaceUnitDto,
  ScheduleInstallationDto,
  UpdateUnitDto,
  UpdateWifiDeviceDto,
  UpdateWifiPlanDto,
  UpsertWifiDeviceDto,
  UpsertWifiPlanDto,
} from './dto.js';

/** Zylo WiFi — SUPER_ADMIN only. */
@Controller('admin/wifi')
@UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
export class WifiAdminController {
  constructor(private readonly admin: WifiAdminService) {}

  @Get('dashboard')
  async dashboard() {
    return { data: await this.admin.dashboard() };
  }

  // router models
  @Get('devices')
  async devices() {
    return { data: await this.admin.listDevices() };
  }
  @Post('devices')
  async createDevice(@Body() dto: UpsertWifiDeviceDto) {
    return { data: await this.admin.createDevice(dto) };
  }
  @Patch('devices/:id')
  async updateDevice(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWifiDeviceDto) {
    return { data: await this.admin.updateDevice(id, dto) };
  }
  @Delete('devices/:id')
  async deleteDevice(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.admin.deleteDevice(id) };
  }

  // wifi plans
  @Get('plans')
  async plans() {
    return { data: await this.admin.listPlans() };
  }
  @Post('plans')
  async createPlan(@Body() dto: UpsertWifiPlanDto) {
    return { data: await this.admin.createPlan(dto) };
  }
  @Patch('plans/:id')
  async updatePlan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWifiPlanDto) {
    return { data: await this.admin.updatePlan(id, dto) };
  }
  @Delete('plans/:id')
  async deletePlan(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.admin.deletePlan(id) };
  }

  // units (import route must precede :id)
  @Get('units')
  async units(@Query() q: ListUnitsQueryDto) {
    return this.admin.listUnits(q);
  }
  @Post('units/import')
  async importUnits(@Body() dto: BulkImportUnitsDto) {
    return { data: await this.admin.bulkImport(dto) };
  }
  @Post('units')
  async createUnit(@Body() dto: CreateUnitDto) {
    return { data: await this.admin.createUnit(dto) };
  }
  @Patch('units/:id')
  async updateUnit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUnitDto) {
    return { data: await this.admin.updateUnit(id, dto) };
  }
  @Delete('units/:id')
  async deleteUnit(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.admin.deleteUnit(id) };
  }
  @Post('units/:id/mark-faulty')
  async markFaulty(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.admin.markFaulty(id) };
  }
  @Post('units/:id/replace')
  async replace(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplaceUnitDto) {
    return { data: await this.admin.replaceUnit(id, dto) };
  }

  // orders / connections / installations
  @Get('orders')
  async orders(@Query() q: ListWifiOrdersQueryDto) {
    return this.admin.listOrders(q);
  }
  @Get('connections')
  async connections(@Query() q: ListWifiConnectionsQueryDto) {
    return this.admin.listConnections(q);
  }
  @Get('installations')
  async installations(@Query() q: ListInstallationsQueryDto) {
    return this.admin.listInstallations(q);
  }

  @Post('connections/:id/assign-unit')
  async assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignUnitDto) {
    return { data: await this.admin.assignUnit(id, dto) };
  }
  @Post('connections/:id/disconnect')
  async disconnect(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.admin.disconnect(id) };
  }
  @Post('connections/:id/confirm-return')
  async confirmReturn(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.admin.confirmReturn(id) };
  }

  @Post('installations/:id/schedule')
  async schedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ScheduleInstallationDto) {
    return { data: await this.admin.scheduleInstallation(id, dto) };
  }
  @Post('installations/:id/complete')
  async complete(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.admin.completeInstallation(id) };
  }
  @Post('installations/:id/fail')
  async fail(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FailInstallationDto) {
    return { data: await this.admin.failInstallation(id, dto) };
  }

  @Post('jobs/run')
  async runJobs() {
    return { data: await this.admin.runJobs() };
  }
}
