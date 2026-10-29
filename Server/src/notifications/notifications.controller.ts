import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** The logged-in customer's notifications, newest first. */
  @Get()
  async list(@CurrentUser() user: UserModel) {
    return { data: await this.notifications.list(user.id) };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: UserModel) {
    return { data: await this.notifications.markRead(user.id, id) };
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: UserModel) {
    return { data: await this.notifications.markAllRead(user.id) };
  }
}
