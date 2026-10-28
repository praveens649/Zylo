import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { TvCustomerService } from './tv-customer.service.js';
import { TvCheckoutService } from './tv-checkout.service.js';
import {
  AddOnDto,
  CreateTvTicketDto,
  ListTvPlansQueryDto,
  PauseDto,
  RenewDto,
  RescheduleDto,
  TvCheckoutDto,
} from './dto.js';

/** Zylo TV — customer endpoints. Every connection lookup is scoped to the signed-in user. */
@Controller('tv')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class TvController {
  constructor(
    private readonly customer: TvCustomerService,
    private readonly checkout: TvCheckoutService,
  ) {}

  @Get('boxes')
  async boxes() {
    return { data: await this.customer.listBoxes() };
  }

  @Get('plans')
  async plans(@Query() query: ListTvPlansQueryDto) {
    return { data: await this.customer.listPlans(query) };
  }

  @Post('checkout')
  async doCheckout(@Body() dto: TvCheckoutDto, @CurrentUser() user: UserModel) {
    return { data: await this.checkout.checkout(user, dto) };
  }

  @Get('connections')
  async connections(@CurrentUser() user: UserModel) {
    return { data: await this.customer.listConnections(user) };
  }

  @Get('connections/:id')
  async connection(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserModel) {
    return { data: await this.customer.getConnection(user, id) };
  }

  @Post('connections/:id/renew')
  async renew(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RenewDto, @CurrentUser() user: UserModel) {
    return { data: await this.checkout.renew(user, id, dto) };
  }

  @Post('connections/:id/add-on')
  async addOn(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddOnDto, @CurrentUser() user: UserModel) {
    return { data: await this.checkout.addOn(user, id, dto) };
  }

  @Post('connections/:id/pause')
  async pause(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PauseDto, @CurrentUser() user: UserModel) {
    return { data: await this.customer.pause(user, id, dto) };
  }

  @Post('connections/:id/resume')
  async resume(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserModel) {
    return { data: await this.customer.resume(user, id) };
  }

  @Post('connections/:id/support-tickets')
  async ticket(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTvTicketDto, @CurrentUser() user: UserModel) {
    return { data: await this.customer.createTicket(user, id, dto) };
  }

  @Post('installations/:id/reschedule')
  async reschedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RescheduleDto, @CurrentUser() user: UserModel) {
    return { data: await this.customer.reschedule(user, id, dto) };
  }

  @Post('installations/:id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserModel) {
    return { data: await this.customer.cancelInstallation(user, id) };
  }
}
