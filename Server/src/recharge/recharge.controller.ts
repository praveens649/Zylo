import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { RechargeService } from './recharge.service.js';
import { CreateRechargeCheckoutDto } from './dto.js';

@Controller('recharge')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class RechargeController {
  constructor(private readonly recharge: RechargeService) {}

  /**
   * The customer's SIMs with their current and queued plan subscriptions.
   */
  @Get('overview')
  async overview(@CurrentUser() user: UserModel) {
    const data = await this.recharge.getOverview(user.id);
    return { data };
  }

  /**
   * Start a recharge — creates the order + Stripe checkout session and
   * returns the hosted checkout URL to redirect to.
   */
  @Post('checkout')
  async checkout(
    @Body() dto: CreateRechargeCheckoutDto,
    @CurrentUser() user: UserModel,
  ): Promise<{
    data: { sessionId: string; url: string | null; orderId: string };
  }> {
    const data = await this.recharge.createCheckout(user, dto);
    return { data };
  }
}
