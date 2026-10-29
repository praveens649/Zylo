import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { CustomerOnlyGuard } from './customer-only.guard.js';
import { WifiCustomerService } from './wifi-customer.service.js';
import { WifiCheckoutService } from './wifi-checkout.service.js';
import {
  AddOnDto,
  CreateWifiTicketDto,
  ListWifiPlansQueryDto,
  PauseDto,
  RenewDto,
  RescheduleDto,
  WifiCheckoutDto,
} from './dto.js';

/** Zylo WiFi — customer endpoints. Every connection lookup is scoped to the signed-in user. */
@Controller('wifi')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class WifiController {
  constructor(
    private readonly customer: WifiCustomerService,
    private readonly checkout: WifiCheckoutService,
  ) {}

  @Get('devices')
  async devices() {
    return { data: await this.customer.listDevices() };
  }

  @Get('plans')
  async plans(@Query() query: ListWifiPlansQueryDto) {
    return { data: await this.customer.listPlans(query) };
  }

  @Post('checkout')
  @UseGuards(CustomerOnlyGuard)
  async doCheckout(@Body() dto: WifiCheckoutDto, @CurrentUser() user: UserModel, @Headers('origin') origin?: string) {
    return { data: await this.checkout.checkout(user, dto, origin) };
  }

  // Pending payments: verify with Stripe, pay again, or give up on an unpaid order.
  @Post('orders/:id/sync')
  async syncOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserModel) {
    return { data: await this.checkout.syncOrder(user, id) };
  }

  @Post('orders/:id/pay')
  @UseGuards(CustomerOnlyGuard)
  async payOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserModel, @Headers('origin') origin?: string) {
    return { data: await this.checkout.retryPayment(user, id, origin) };
  }

  @Post('orders/:id/cancel')
  async cancelOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserModel) {
    return { data: await this.checkout.cancelPending(user, id) };
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
  @UseGuards(CustomerOnlyGuard)
  async renew(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RenewDto, @CurrentUser() user: UserModel, @Headers('origin') origin?: string) {
    return { data: await this.checkout.renew(user, id, dto, origin) };
  }

  @Post('connections/:id/add-on')
  @UseGuards(CustomerOnlyGuard)
  async addOn(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddOnDto, @CurrentUser() user: UserModel, @Headers('origin') origin?: string) {
    return { data: await this.checkout.addOn(user, id, dto, origin) };
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
  async ticket(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateWifiTicketDto, @CurrentUser() user: UserModel) {
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
