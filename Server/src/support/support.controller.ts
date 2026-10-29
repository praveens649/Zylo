import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserModel } from '../generated/prisma/models.js';
import { SupportService } from './support.service.js';
import { CreateTicketDto, ListTicketsQueryDto } from './dto.js';

/**
 * Customer support tickets — the authenticated customer files issues and
 * tracks their status and the admin reply.
 *
 *   POST /api/v1/support/tickets      — create a ticket
 *   GET  /api/v1/support/tickets      — list own tickets (status/category filters)
 *   GET  /api/v1/support/tickets/:id  — view one own ticket
 */
@Controller('support/tickets')
@UseGuards(AuthGuard, RequirePasswordChangedGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  async createTicket(
    @CurrentUser() user: UserModel,
    @Body() dto: CreateTicketDto,
  ) {
    const data = await this.support.createTicket(user.id, dto);
    return { data };
  }

  @Get()
  async listTickets(
    @CurrentUser() user: UserModel,
    @Query() query: ListTicketsQueryDto,
  ) {
    const { data, meta } = await this.support.listMyTickets(user.id, query);
    return { data, meta };
  }

  @Get(':id')
  async getTicket(
    @CurrentUser() user: UserModel,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.support.getMyTicket(user.id, id);
    return { data };
  }
}
