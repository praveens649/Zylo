import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { ParkingService } from './parking.service.js';
import {
  CreateParkingCheckoutDto,
  ExtendParkingDto,
  ValidateParkingNumberDto,
} from './dto.js';

@Controller('parking')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class ParkingController {
  constructor(private readonly parking: ParkingService) {}

  /** Parking periods, prices, fees and extension rules (server config). */
  @Get('config')
  async config() {
    return { data: this.parking.getPublicConfig() };
  }

  /**
   * Step 1 — validate a mobile number for parking: format, ownership,
   * SIM status, current parking state, and carrier eligibility.
   */
  @Post('validate')
  async validate(
    @Body() dto: ValidateParkingNumberDto,
    @CurrentUser() user: UserModel,
  ) {
    const data = await this.parking.validateNumber(user, dto.number);
    return { data };
  }

  /**
   * Step 2 — start parking: creates the pending parking record, order and
   * Stripe checkout session. Returns the hosted checkout URL.
   */
  @Post('checkout')
  async checkout(
    @Body() dto: CreateParkingCheckoutDto,
    @CurrentUser() user: UserModel,
    @Headers('origin') origin?: string,
  ) {
    const data = await this.parking.createCheckout(user, dto, origin);
    return { data };
  }

  /** Number Vault — every parking the user can manage. */
  @Get('vault')
  async vault(@CurrentUser() user: UserModel) {
    const data = await this.parking.getVault(user);
    return { data };
  }

  /** Single parking detail (receipt/status view). */
  @Get(':id')
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    const data = await this.parking.getParking(user, id);
    return { data };
  }

  /** Start a paid extension for an active parking. */
  @Post(':id/extend')
  async extend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendParkingDto,
    @CurrentUser() user: UserModel,
    @Headers('origin') origin?: string,
  ) {
    const data = await this.parking.createExtensionCheckout(
      user,
      id,
      dto,
      origin,
    );
    return { data };
  }

  /** Reactivate an actively parked number before its expiry. */
  @Post(':id/reactivate')
  async reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    const data = await this.parking.reactivate(user, id);
    return { data };
  }
}
