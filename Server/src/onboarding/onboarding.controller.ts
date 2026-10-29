import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserWithRole } from '../auth/auth.service.js';
import { OnboardingService } from './onboarding.service.js';
import {
  AcceptBusinessInviteDto,
  CompleteOnboardingDto,
  CreateBusinessInviteDto,
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
   * Owner: list invites for their organization.
   */
  @Get('invites')
  async listInvites(@CurrentUser() user: UserWithRole) {
    const data = await this.onboarding.listInvites(user.id);
    return { data };
  }

  /**
   * Owner: invite a member by email. Returns the raw token once — share it
   * as `/onboarding?invite=<token>` (email delivery is not wired in dev).
   */
  @Post('invites')
  async createInvite(
    @CurrentUser() user: UserWithRole,
    @Body() dto: CreateBusinessInviteDto,
  ) {
    const data = await this.onboarding.createInvite(user.id, dto);
    return { data };
  }

  /**
   * Owner: cancel a pending invite.
   */
  @Delete('invites/:id')
  async cancelInvite(
    @CurrentUser() user: UserWithRole,
    @Param('id') inviteId: string,
  ) {
    const data = await this.onboarding.cancelInvite(user.id, inviteId);
    return { data };
  }

  /**
   * Invitee: pending invites addressed to the logged-in account
   * (dashboard accept card).
   */
  @Get('invites/mine')
  async myInvites(@CurrentUser() user: UserWithRole) {
    const data = await this.onboarding.myInvites(user.id);
    return { data };
  }

  /**
   * Invitee: accept an invite from the dashboard card.
   */
  @Post('invites/:id/accept')
  async acceptInviteById(
    @CurrentUser() user: UserWithRole,
    @Param('id') inviteId: string,
  ) {
    const data = await this.onboarding.acceptInviteById(user.id, inviteId);
    return { data };
  }

  /**
   * Invitee: decline an invite from the dashboard card.
   */
  @Post('invites/:id/decline')
  async declineInviteById(
    @CurrentUser() user: UserWithRole,
    @Param('id') inviteId: string,
  ) {
    const data = await this.onboarding.declineInviteById(user.id, inviteId);
    return { data };
  }

  /**
   * Invitee: preview an invite by its raw token (read-only).
   */
  @Get('invites/lookup')
  async lookupInvite(@Query('token') token: string) {
    const data = await this.onboarding.getInviteByToken(token);
    return { data };
  }

  /**
   * Invitee: accept an invite — joins the organization as an ACTIVE member.
   */
  @Post('invites/accept')
  async acceptInvite(
    @CurrentUser() user: UserWithRole,
    @Body() dto: AcceptBusinessInviteDto,
  ) {
    const data = await this.onboarding.acceptInvite(user.id, dto);
    return { data };
  }

  /**
   * Invitee: decline an invite.
   */
  @Post('invites/decline')
  async declineInvite(
    @CurrentUser() user: UserWithRole,
    @Body() dto: AcceptBusinessInviteDto,
  ) {
    const data = await this.onboarding.declineInvite(user.id, dto);
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
