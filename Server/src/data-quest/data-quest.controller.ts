import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { QuestService } from './quest.service.js';
import { QuestRulesEngine } from './quest-rules.engine.js';
import { QuestCronService } from './quest-cron.service.js';

@Controller('quests')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class DataQuestController {
  constructor(
    private readonly questService: QuestService,
    private readonly rulesEngine: QuestRulesEngine,
    private readonly cronService: QuestCronService,
  ) {}

  /**
   * Retrieves user's Quest Board:
   * Level & XP progress, Active Quests, Completed Quests, Badges, and Streaks.
   */
  @Get('board')
  async getBoard(@CurrentUser() user: UserModel) {
    const board = await this.questService.getUserQuestBoard(user.id);
    return { data: board };
  }

  /**
   * Daily check-in action:
   * Emits a verified DAILY_CHECK_IN event to advance quests and maintain streaks.
   */
  @Post('check-in')
  async dailyCheckIn(@CurrentUser() user: UserModel) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const reference = `checkin_${user.id}_${todayStr}`;

    const result = await this.rulesEngine.processVerifiedEvent({
      type: 'DAILY_CHECK_IN',
      userId: user.id,
      amount: 1,
      reference,
      metadata: { checkInDate: todayStr },
    });

    return { data: result };
  }

  /**
   * Redeem a voucher using spendable pack XP.
   */
  @Post('vouchers/:id/redeem')
  async redeemVoucher(
    @CurrentUser() user: UserModel,
    @Param('id') voucherId: string,
  ) {
    const result = await this.questService.redeemVoucher(user.id, voucherId);
    return { data: result };
  }

  /**
   * Trigger maintenance manually (e.g. for testing or admin jobs).
   */
  @Post('maintenance')
  async runMaintenance() {
    const result = await this.cronService.performMaintenance();
    return { data: result };
  }
}
