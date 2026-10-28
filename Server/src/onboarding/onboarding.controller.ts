import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserWithRole } from '../auth/auth.service.js';
import { OnboardingService } from './onboarding.service.js';
import {
  CompleteOnboardingDto,
  RegisterBusinessDto,
  SubmitKycDto,
} from './dto.js';

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
   * Business onboarding — register & verify the organization, activate its
   * 4-digit number prefix, and stock the first batch of corporate numbers.
   */
  @Post('business')
  async registerBusiness(
    @CurrentUser() user: UserWithRole,
    @Body() dto: RegisterBusinessDto,
  ) {
    const data = await this.onboarding.registerBusiness(user.id, dto);
    return { data };
  }

  /**
   * Business-only plans available during business SIM onboarding.
   */
  @Get('business-plans')
  async getBusinessPlans() {
    const data = await this.onboarding.getBusinessPlans();
    return { data };
  }

  /**
   * Complete onboarding: assign number, activate SIM, and provision plan.
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
