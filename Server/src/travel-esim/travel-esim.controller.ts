import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { AuthService } from '../auth/auth.service.js';
import { SYSTEM_ROLE } from '../common/constants.js';
import type { UserModel } from '../generated/prisma/models.js';
import { TravelEsimService } from './travel-esim.service.js';
import {
  AdminListNumbersQueryDto,
  CreateInternationalPlanDto,
  GenerateEsimNumbersDto,
  HoldEsimNumberDto,
  ListEsimNumbersQueryDto,
  ListTravelPlansQueryDto,
  TravelEsimCheckoutDto,
  UpdateInternationalPlanDto,
} from './dto.js';

@Controller('travel-esim')
export class TravelEsimController {
  constructor(
    private readonly travelEsim: TravelEsimService,
    private readonly authService: AuthService,
  ) {}

  private async isRequestAdmin(req: Request): Promise<boolean> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return false;
    try {
      const user = await this.authService.resolveTokenUser(
        authHeader.slice(7).trim(),
      );
      return user.role === SYSTEM_ROLE;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------------
  // Catalog (public read — only active plans for non-admins)
  // ------------------------------------------------------------------

  @Get('destinations')
  async destinations() {
    return { data: await this.travelEsim.listDestinations() };
  }

  @Get('plans')
  async plans(@Query() query: ListTravelPlansQueryDto, @Req() req: Request) {
    const isAdmin = await this.isRequestAdmin(req);
    return { data: await this.travelEsim.listPlans(query, isAdmin) };
  }

  // ------------------------------------------------------------------
  // Customer purchase flow
  // ------------------------------------------------------------------

  @Post('checkout')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard)
  async checkout(
    @Body() dto: TravelEsimCheckoutDto,
    @CurrentUser() user: UserModel,
  ) {
    const data = await this.travelEsim.createCheckout(user, dto);
    return { data };
  }

  /** Destination numbers — list, click-to-hold (10 min), release. */
  @Get('numbers')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard)
  async numbers(
    @Query() query: ListEsimNumbersQueryDto,
    @CurrentUser() user: UserModel,
  ) {
    return {
      data: await this.travelEsim.listCountryNumbers(user.id, query),
    };
  }

  @Post('numbers/hold')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard)
  async holdNumber(
    @Body() dto: HoldEsimNumberDto,
    @CurrentUser() user: UserModel,
  ) {
    return { data: await this.travelEsim.holdNumber(user, dto.numberId) };
  }

  @Post('numbers/:numberId/release')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard)
  async releaseNumber(
    @Param('numberId') numberId: string,
    @CurrentUser() user: UserModel,
  ) {
    return { data: await this.travelEsim.releaseHold(user, numberId) };
  }

  /** Verify the Stripe session after redirect and return the ready order. */
  @Post('verify')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard)
  async verify(
    @Query('session_id') sessionId: string,
    @CurrentUser() user: UserModel,
  ) {
    const data = await this.travelEsim.verifyCheckout(user, sessionId);
    return { data };
  }

  @Get('orders')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard)
  async myOrders(@CurrentUser() user: UserModel) {
    return { data: await this.travelEsim.listOrders(user.id) };
  }

  @Get('orders/:reference')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard)
  async orderDetail(
    @Param('reference') reference: string,
    @CurrentUser() user: UserModel,
  ) {
    return {
      data: await this.travelEsim.getOrderByReference(reference, user),
    };
  }

  /** Simulated eSIM profile installation on the customer's device. */
  @Post('orders/:reference/activate')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard)
  async activate(
    @Param('reference') reference: string,
    @CurrentUser() user: UserModel,
  ) {
    return { data: await this.travelEsim.markActivated(reference, user) };
  }

  // ------------------------------------------------------------------
  // Admin plan management
  // ------------------------------------------------------------------

  @Post('admin/plans')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async createPlan(@Body() dto: CreateInternationalPlanDto) {
    return { data: await this.travelEsim.createPlan(dto) };
  }

  @Patch('admin/plans/:id')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateInternationalPlanDto,
  ) {
    return { data: await this.travelEsim.updatePlan(id, dto) };
  }

  @Patch('admin/plans/:id/toggle')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async togglePlan(@Param('id') id: string) {
    return { data: await this.travelEsim.togglePlan(id) };
  }

  @Delete('admin/plans/:id')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async deletePlan(@Param('id') id: string) {
    return { data: await this.travelEsim.deletePlan(id) };
  }

  // ---- Admin number inventory ----

  @Get('admin/numbers')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async adminNumbers(@Query() query: AdminListNumbersQueryDto) {
    return { data: await this.travelEsim.adminListNumbers(query) };
  }

  @Post('admin/numbers/generate')
  @UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
  async generateNumbers(@Body() dto: GenerateEsimNumbersDto) {
    return { data: await this.travelEsim.adminGenerateNumbers(dto) };
  }
}
