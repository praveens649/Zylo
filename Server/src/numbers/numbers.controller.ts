import {
  Body,
  Controller,
  Delete,
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
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { NumbersService } from './numbers.service.js';
import {
  GenerateNumbersDto,
  ListAvailableNumbersDto,
  ReleaseNumberDto,
  ReserveNumberDto,
} from './dto.js';

@Controller('numbers')
export class NumbersController {
  constructor(private readonly numbersService: NumbersService) {}

  /**
   * Admin-Only: Trigger the Number Generation Engine.
   * Generates batches (default 10) of validated, unique Indian phone numbers:
   * - Type 1: PERSONAL (+91[6-9]XXXXXXXXX with Standard vs VIP/Premium detection)
   * - Type 2: BUSINESS (+91 + 4-digit prefix + 6 digits for Organization & Members)
   */
  @Post('generate')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async generateNumbers(@Body() dto: GenerateNumbersDto) {
    const result = await this.numbersService.generateNumbers(dto);
    return { data: result };
  }

  /**
   * Customer Onboarding:
   * Query available numbers to select during SIM purchase/onboarding.
   * Supports filtering by category (PERSONAL vs BUSINESS), standard vs premium, prefix, or search digit pattern.
   */
  @Get('available')
  async getAvailableNumbers(@Query() query: ListAvailableNumbersDto) {
    return this.numbersService.getAvailableNumbers(query);
  }

  /**
   * Customer Checkout:
   * Temporarily reserve a phone number for 15 minutes during SIM checkout.
   */
  @Post('reserve')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard)
  async reserveNumber(
    @Body() dto: ReserveNumberDto,
    @CurrentUser() user: UserModel,
  ) {
    const result = await this.numbersService.reserveNumber(dto, user.id);
    return { data: result };
  }

  /**
   * Customer Checkout:
   * Release a previously held number if the user changes their mind.
   */
  @Post('release')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard)
  async releaseNumber(
    @Body() dto: ReleaseNumberDto,
    @CurrentUser() user: UserModel,
  ) {
    const result = await this.numbersService.releaseNumber(dto, user);
    return { data: result };
  }

  /**
   * Admin-Only:
   * Complete inventory list with statistics (Total, Available, Reserved, Assigned).
   */
  @Get('admin/inventory')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async getAdminInventory(@Query() query: ListAvailableNumbersDto) {
    return this.numbersService.getAdminInventory(query);
  }

  /**
   * Admin-Only:
   * Delete an unassigned number from inventory.
   */
  @Delete('admin/:id')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async deleteNumber(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.numbersService.deleteNumber(id);
    return { data: result };
  }
}
