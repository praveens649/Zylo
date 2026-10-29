import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { listMeta, pageParams } from '../common/pagination.js';
import type { TicketStatus } from '../generated/prisma/enums.js';
import type {
  AdminListTicketsQueryDto,
  AdminUpdateTicketDto,
  CreateTicketDto,
  ListTicketsQueryDto,
} from './dto.js';

/** Relations every ticket payload carries back to the client. */
const TICKET_INCLUDE = {
  sim: { select: { id: true, phoneNumber: { select: { number: true } } } },
  setTopBoxConnection: { select: { id: true, connectionNumber: true } },
} as const;

const ADMIN_TICKET_INCLUDE = {
  ...TICKET_INCLUDE,
  user: { select: { id: true, name: true, email: true, image: true } },
} as const;

/**
 * Legal status transitions for the admin console. RESOLVED and CLOSED tickets
 * can be reopened into IN_PROGRESS when the customer reports the fix failed.
 */
const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED', 'OPEN'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['IN_PROGRESS'],
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'open',
  IN_PROGRESS: 'in progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === 'P2002'
  );
}

/** "ZYL-M8XK3F-9A2B1C" — readable for customers, unique in practice. */
function generateTicketNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `ZYL-${stamp}-${rand}`;
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── customer ─────────────────────────────────────────────────────────────

  async createTicket(userId: string, dto: CreateTicketDto) {
    if (dto.simId) {
      const sim = await this.prisma.sim.findFirst({
        where: { id: dto.simId, userId },
        select: { id: true },
      });
      if (!sim) {
        throw new ApiException(
          400,
          'INVALID_SIM',
          'The selected SIM does not belong to your account',
        );
      }
    }

    if (dto.setTopBoxConnectionId) {
      const conn = await this.prisma.setTopBoxConnection.findFirst({
        where: { id: dto.setTopBoxConnectionId, userId },
        select: { id: true },
      });
      if (!conn) {
        throw new ApiException(
          400,
          'INVALID_CONNECTION',
          'The selected TV connection does not belong to your account',
        );
      }
    }

    // Retry a few times on the (astronomically unlikely) ticketNumber collision.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.supportTicket.create({
          data: {
            ticketNumber: generateTicketNumber(),
            userId,
            simId: dto.simId,
            setTopBoxConnectionId: dto.setTopBoxConnectionId,
            subject: dto.subject,
            description: dto.description,
            category: dto.category ?? 'OTHER',
          },
          include: TICKET_INCLUDE,
        });
      } catch (err) {
        if (isUniqueViolation(err) && attempt < 4) continue;
        throw err;
      }
    }

    throw new ApiException(
      500,
      'TICKET_NUMBER_FAILED',
      'Could not allocate a ticket number — please retry',
    );
  }

  async listMyTickets(userId: string, query: ListTicketsQueryDto) {
    const where = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
    };

    const { skip, take } = pageParams(query);
    const [total, tickets] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        include: TICKET_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    return { data: tickets, meta: listMeta(total, query.page, query.limit) };
  }

  async getMyTicket(userId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, userId },
      include: TICKET_INCLUDE,
    });
    if (!ticket) {
      throw new ApiException(404, 'TICKET_NOT_FOUND', 'Ticket not found');
    }
    return ticket;
  }

  // ── admin ────────────────────────────────────────────────────────────────

  async adminListTickets(query: AdminListTicketsQueryDto) {
    const { status, category, priority, search } = query;

    const where = {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(priority ? { priority } : {}),
      ...(search
        ? {
            OR: [
              {
                ticketNumber: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              { subject: { contains: search, mode: 'insensitive' as const } },
              {
                user: {
                  name: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                user: {
                  email: { contains: search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const { skip, take } = pageParams(query);
    const [total, tickets] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        include: ADMIN_TICKET_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    return { data: tickets, meta: listMeta(total, query.page, query.limit) };
  }

  async adminGetTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: ADMIN_TICKET_INCLUDE,
    });
    if (!ticket) {
      throw new ApiException(404, 'TICKET_NOT_FOUND', 'Ticket not found');
    }
    return ticket;
  }

  /**
   * Apply an admin update — status transition, priority change, and/or a
   * reply — then notify the customer about whatever changed.
   */
  async adminUpdateTicket(id: string, dto: AdminUpdateTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });
    if (!ticket) {
      throw new ApiException(404, 'TICKET_NOT_FOUND', 'Ticket not found');
    }

    const statusChanged =
      dto.status !== undefined && dto.status !== ticket.status;
    if (statusChanged) {
      const allowed = ALLOWED_TRANSITIONS[ticket.status] ?? [];
      if (!allowed.includes(dto.status!)) {
        throw new ApiException(
          400,
          'INVALID_STATUS_TRANSITION',
          `Cannot move a ticket from ${STATUS_LABEL[ticket.status]} to ${STATUS_LABEL[dto.status!]}`,
        );
      }
    }

    const replyChanged =
      dto.adminReply !== undefined && dto.adminReply !== ticket.adminReply;

    if (!statusChanged && !replyChanged && dto.priority === undefined) {
      return this.adminGetTicket(id);
    }

    const data: {
      status?: TicketStatus;
      priority?: AdminUpdateTicketDto['priority'];
      adminReply?: string;
      resolvedAt?: Date | null;
    } = {
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(replyChanged ? { adminReply: dto.adminReply } : {}),
    };

    if (statusChanged) {
      data.status = dto.status;
      if (dto.status === 'RESOLVED') {
        data.resolvedAt = new Date();
      } else if (ticket.resolvedAt) {
        // Reopening a previously resolved ticket clears the resolution stamp.
        data.resolvedAt = null;
      }
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data,
      include: ADMIN_TICKET_INCLUDE,
    });

    if (replyChanged || statusChanged) {
      await this.prisma.notification.create({
        data: {
          userId: ticket.userId,
          title: replyChanged
            ? 'Support replied to your ticket'
            : 'Ticket status updated',
          message: replyChanged
            ? `New reply on ticket ${ticket.ticketNumber} — open Support to read it.`
            : `Ticket ${ticket.ticketNumber} is now ${STATUS_LABEL[updated.status]}.`,
        },
      });
    }

    return updated;
  }
}
