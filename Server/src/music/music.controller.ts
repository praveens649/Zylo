import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { MusicService } from './music.service.js';
import { MusicCheckoutDto } from './dto.js';

/**
 * Zylo Music:
 *   GET  /api/v1/music/plans              — purchasable plans
 *   GET  /api/v1/music/subscription       — current subscription + days left
 *   POST /api/v1/music/checkout           — Stripe checkout for a plan
 *   GET  /api/v1/music/checkout/sync      — success-page fulfilment check
 *   GET  /api/v1/music/featured           — curated landing catalog (sub-gated)
 *   GET  /api/v1/music/search?q=          — catalog search (sub-gated)
 */
@Controller('music')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class MusicController {
  constructor(private readonly music: MusicService) {}

  @Get('plans')
  async plans() {
    return { data: await this.music.listPlans() };
  }

  @Get('subscription')
  async subscription(@CurrentUser() user: UserModel) {
    return { data: await this.music.me(user.id) };
  }

  @Post('checkout')
  async checkout(@Body() dto: MusicCheckoutDto, @CurrentUser() user: UserModel) {
    return { data: await this.music.createCheckout(user, dto) };
  }

  @Get('checkout/sync')
  async syncCheckout(
    @Query('session_id') sessionId: string,
    @CurrentUser() user: UserModel,
  ) {
    if (!sessionId) return { data: { synced: false, subscription: null } };
    return { data: await this.music.syncCheckout(user, sessionId) };
  }

  @Get('featured')
  async featured(@CurrentUser() user: UserModel) {
    return { data: await this.music.featured(user.id) };
  }

  @Get('search')
  async search(@Query('q') q: string, @CurrentUser() user: UserModel) {
    return { data: await this.music.search(user.id, q ?? '') };
  }
}
