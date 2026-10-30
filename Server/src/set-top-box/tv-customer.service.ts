import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { UserModel } from '../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import type { CreateTvTicketDto, ListTvPlansQueryDto, PauseDto, RescheduleDto } from './dto.js';
import { tvConfig } from './tv.config.js';
import {
  addDays,
  daysLeft,
  maskCardNumber,
  pauseDaysRemaining,
  pauseDaysUsedInWindow,
  startOfDay,
} from './tv-rules.js';
import { notify, rentPaidUntilFrom, resumeConnection, uniqueRef } from './tv-lifecycle.js';

const CONNECTION_INCLUDE = {
  model: { select: { id: true, name: true, sku: true, resolution: true, isSmart: true, hasRecording: true, storageGb: true, rentalPerMonth: true } },
  unit: { select: { serialNumber: true, smartCardNumber: true, status: true } },
  subscriptions: { include: { tvPlan: true }, orderBy: { createdAt: 'desc' } },
  installations: { orderBy: { createdAt: 'desc' } },
  // The box order (for the tracker) plus rent orders and any unpaid pack orders.
  orders: {
    where: { OR: [{ type: 'SET_TOP_BOX_ORDER' }, { status: 'PENDING', type: 'TV_PACK_PURCHASE' }] },
    select: { id: true, type: true, status: true, amount: true, createdAt: true, setTopBoxModelId: true, tvPlan: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.SetTopBoxConnectionInclude;

type ConnectionRow = Prisma.SetTopBoxConnectionGetPayload<{ include: typeof CONNECTION_INCLUDE }>;

/** Customer-safe shape: smart card is masked to the last 4 digits; MAC is never exposed. */
export function presentConnection(c: ConnectionRow, now = new Date()) {
  const { unit, ...rest } = c;
  const activeBase = c.subscriptions
    .filter((s) => s.status === 'ACTIVE' && s.tvPlan.type === 'BASE')
    .sort((a, b) => (b.endDate?.getTime() ?? 0) - (a.endDate?.getTime() ?? 0))[0];
  const paidRentMonths = (c.orders ?? []).filter(
    (o) => o.type === 'SET_TOP_BOX_ORDER' && o.status === 'COMPLETED',
  ).length;
  return {
    ...rest,
    unit: unit
      ? { serialNumber: unit.serialNumber, smartCardMasked: maskCardNumber(unit.smartCardNumber), status: unit.status }
      : null,
    currentPack: activeBase?.tvPlan ?? null,
    daysLeft: daysLeft(c.planExpiredAt, now),
    pauseDaysRemaining: pauseDaysRemaining(tvConfig.maxPauseDaysPerYear, c.pauseDaysUsed, c.pauseWindowStartedAt, now),
    // Derived rent coverage: box order = month 1, every further paid order +1.
    rentPaidUntil:
      c.ownership === 'RENTAL' && c.activatedAt && paidRentMonths > 0
        ? rentPaidUntilFrom(c.activatedAt, paidRentMonths)
        : null,
    rentOverdue:
      c.ownership === 'RENTAL' && c.activatedAt && paidRentMonths > 0
        ? rentPaidUntilFrom(c.activatedAt, paidRentMonths).getTime() <= now.getTime()
        : false,
  };
}

@Injectable()
export class TvCustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async listBoxes() {
    const models = await this.prisma.setTopBoxModel.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { purchasePrice: 'asc' }],
    });
    const stock = await this.prisma.setTopBoxUnit.groupBy({
      by: ['modelId'],
      where: { status: 'IN_STOCK' },
      _count: { _all: true },
    });
    const reserved = await this.prisma.setTopBoxConnection.groupBy({
      by: ['modelId'],
      where: { unitId: null, status: 'PENDING_INSTALLATION' },
      _count: { _all: true },
    });
    return models.map((m) => {
      const available =
        (stock.find((s) => s.modelId === m.id)?._count._all ?? 0) -
        (reserved.find((r) => r.modelId === m.id)?._count._all ?? 0);
      return { ...m, inStock: available > 0 };
    });
  }

  listPlans(query: ListTvPlansQueryDto) {
    return this.prisma.tvPlan.findMany({
      where: { isActive: true, ...(query.type ? { type: query.type } : {}) },
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
    });
  }

  async listConnections(user: UserModel) {
    const rows = await this.prisma.setTopBoxConnection.findMany({
      where: { userId: user.id },
      include: CONNECTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    return rows.map((r) => presentConnection(r, now));
  }

  async getConnection(user: UserModel, id: string) {
    const row = await this.prisma.setTopBoxConnection.findFirst({
      where: { id, userId: user.id },
      include: CONNECTION_INCLUDE,
    });
    if (!row) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'TV connection not found');
    return presentConnection(row);
  }

  // ----------------------------------------------------------- pause / resume

  async pause(user: UserModel, id: string, dto: PauseDto, now = new Date()) {
    await this.prisma.$transaction(async (tx) => {
      const conn = await tx.setTopBoxConnection.findFirst({ where: { id, userId: user.id } });
      if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'TV connection not found');
      if (conn.status !== 'ACTIVE') {
        throw new ApiException(409, 'PAUSE_NOT_ALLOWED', 'Only an active connection can be paused');
      }
      const remaining = pauseDaysRemaining(tvConfig.maxPauseDaysPerYear, conn.pauseDaysUsed, conn.pauseWindowStartedAt, now);
      if (dto.days > remaining) {
        throw new ApiException(409, 'PAUSE_LIMIT_EXCEEDED', `Only ${remaining} pause day(s) left this year`);
      }
      const usedBefore = pauseDaysUsedInWindow(conn.pauseDaysUsed, conn.pauseWindowStartedAt, now);
      const claimed = await tx.setTopBoxConnection.updateMany({
        where: { id, userId: user.id, status: 'ACTIVE' },
        data: {
          status: 'PAUSED',
          pausedAt: now,
          pauseEndsAt: addDays(now, dto.days),
          pauseDaysUsed: usedBefore + dto.days,
          pauseWindowStartedAt: usedBefore === 0 ? now : conn.pauseWindowStartedAt,
        },
      });
      if (claimed.count === 0) throw new ApiException(409, 'PAUSE_NOT_ALLOWED', 'Connection is no longer active');
      await tx.tvSubscription.updateMany({
        where: { connectionId: id, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });
      await notify(tx, user.id, 'Zylo TV paused', `${conn.connectionNumber} is paused for ${dto.days} day(s). Your pack will be extended.`);
    });
    return this.getConnection(user, id);
  }

  async resume(user: UserModel, id: string, now = new Date()) {
    const owned = await this.prisma.setTopBoxConnection.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!owned) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'TV connection not found');
    const resumed = await this.prisma.$transaction((tx) => resumeConnection(tx, id, now));
    if (!resumed) throw new ApiException(409, 'RESUME_NOT_ALLOWED', 'Connection is not paused');
    return this.getConnection(user, id);
  }

  // ------------------------------------------------------------ installations

  private async ownedInstallation(tx: Prisma.TransactionClient, user: UserModel, id: string) {
    const inst = await tx.installationRequest.findFirst({
      where: { id, connection: { userId: user.id } },
      include: { connection: true },
    });
    if (!inst) throw new ApiException(404, 'INSTALLATION_NOT_FOUND', 'Installation not found');
    return inst;
  }

  async reschedule(user: UserModel, id: string, dto: RescheduleDto) {
    const date = new Date(dto.preferredDate);
    const now = new Date();
    if (date < startOfDay(now) || date > addDays(now, 60)) {
      throw new ApiException(400, 'INVALID_INSTALL_DATE', 'Preferred installation date must be within the next 60 days');
    }
    return this.prisma.$transaction(async (tx) => {
      const inst = await this.ownedInstallation(tx, user, id);
      if (!['REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'FAILED'].includes(inst.status)) {
        throw new ApiException(409, 'RESCHEDULE_NOT_ALLOWED', `A ${inst.status.toLowerCase()} installation cannot be rescheduled`);
      }
      const r = await tx.installationRequest.updateMany({
        where: { id, status: { in: ['REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'FAILED'] } },
        data: {
          status: 'RESCHEDULED',
          preferredDate: date,
          preferredSlot: dto.preferredSlot,
          scheduledAt: null,
          failureReason: null,
        },
      });
      if (r.count === 0) throw new ApiException(409, 'RESCHEDULE_NOT_ALLOWED', 'Installation changed, please retry');
      return tx.installationRequest.findUnique({ where: { id } });
    });
  }

  async cancelInstallation(user: UserModel, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const inst = await this.ownedInstallation(tx, user, id);
      const r = await tx.installationRequest.updateMany({
        where: { id, status: { in: ['REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'FAILED'] } },
        data: { status: 'CANCELLED' },
      });
      if (r.count === 0) throw new ApiException(409, 'CANCEL_NOT_ALLOWED', `A ${inst.status.toLowerCase()} installation cannot be cancelled`);

      const conn = inst.connection;
      if (conn.status === 'PENDING_INSTALLATION') {
        if (conn.unitId) {
          await tx.setTopBoxUnit.updateMany({ where: { id: conn.unitId, status: 'ASSIGNED' }, data: { status: 'IN_STOCK' } });
        }
        await tx.setTopBoxConnection.update({
          where: { id: conn.id },
          data: { status: 'CANCELLED', unitId: null },
        });
        await tx.tvSubscription.updateMany({
          where: { connectionId: conn.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        await notify(tx, user.id, 'Zylo TV order cancelled', `${conn.connectionNumber} was cancelled. Our team will process your refund.`);
      }
      return tx.installationRequest.findUnique({ where: { id } });
    });
  }

  // ------------------------------------------------------------------ support

  async createTicket(user: UserModel, connectionId: string, dto: CreateTvTicketDto) {
    const conn = await this.prisma.setTopBoxConnection.findFirst({
      where: { id: connectionId, userId: user.id },
      select: { id: true, connectionNumber: true },
    });
    if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'TV connection not found');
    const ticketNumber = await uniqueRef('TKT', async (ref) =>
      !!(await this.prisma.supportTicket.findUnique({ where: { ticketNumber: ref }, select: { id: true } })),
    );
    return this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: user.id,
        category: 'SET_TOP_BOX',
        setTopBoxConnectionId: conn.id,
        subject: dto.subject,
        description: dto.description,
      },
    });
  }
}
