import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { RequirePasswordChangedGuard } from '../auth/require-password-changed.guard.js';
import { SupportService } from './support.service.js';
import { AdminListTicketsQueryDto, AdminUpdateTicketDto } from './dto.js';

/**
 * Admin support console — SUPER_ADMIN reviews every customer ticket,
 * replies, and moves tickets through their lifecycle.
 *
 *   GET   /api/v1/admin/support/tickets      — all tickets w/ filters
 *   GET   /api/v1/admin/support/tickets/:id  — ticket detail
 *   PATCH /api/v1/admin/support/tickets/:id  — reply / status / priority
 */
@Controller('admin/support/tickets')
@UseGuards(AuthGuard, RequirePasswordChangedGuard, AdminGuard)
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  async listTickets(@Query() query: AdminListTicketsQueryDto) {
    const { data, meta } = await this.support.adminListTickets(query);
    return { data, meta };
  }

  @Get(':id')
  async getTicket(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.support.adminGetTicket(id) };
  }

  @Patch(':id')
  async updateTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateTicketDto,
  ) {
    return { data: await this.support.adminUpdateTicket(id, dto) };
  }
}
