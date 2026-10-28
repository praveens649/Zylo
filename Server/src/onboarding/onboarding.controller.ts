import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserWithRole } from '../auth/auth.service.js';
import { OnboardingService } from './onboarding.service.js';
import { CompleteOnboardingDto, SubmitKycDto } from './dto.js';

@Controller('onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  /**
   * Get user onboarding status (KYC state, active SIMs, completed flag).
   */
  @Get('status')
  async getStatus(@CurrentUser() user: UserWithRole) {
    const data = await this.onboarding.getStatus(user.id);
    return { data };
  }

  /**
   * Submit KYC identity details.
   */
  @Post('kyc')
  async submitKyc(
    @CurrentUser() user: UserWithRole,
    @Body() dto: SubmitKycDto,
  ) {
    const data = await this.onboarding.submitKyc(user.id, dto);
    return { data };
  }

  /**
   * List starter plans available during onboarding.
   */
  @Get('starter-plans')
  async getStarterPlans() {
    const data = await this.onboarding.getStarterPlans();
    return { data };
  }

  /**
   * Create a Stripe Checkout session for the SIM onboarding payment.
   * Returns the hosted-checkout URL to redirect the customer to.
   */
  @Post('checkout')
  async createCheckout(
    @CurrentUser() user: UserWithRole,
    @Body() dto: CompleteOnboardingDto,
  ) {
    const data = await this.onboarding.createCheckout(user.id, dto);
    return { data };
  }

  /**
   * Verify a Stripe checkout session after redirect and activate the SIM.
   */
  @Get('checkout/verify')
  async verifyCheckout(
    @CurrentUser() user: UserWithRole,
    @Query('session_id') sessionId: string,
  ) {
    const data = await this.onboarding.verifyCheckout(user.id, sessionId);
    return { data };
  }

  /**
   * Complete onboarding: assign number, activate SIM, and provision plan.
   * Development-only fallback used when Stripe is not configured.
   */
  @Post('complete')
  async completeOnboarding(
    @CurrentUser() user: UserWithRole,
    @Body() dto: CompleteOnboardingDto,
  ) {
    const data = await this.onboarding.completeOnboarding(user.id, dto);
    return { data };
  }
}
