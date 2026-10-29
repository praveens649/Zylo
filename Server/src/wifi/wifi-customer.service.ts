import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { UserModel } from '../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import type { CreateWifiTicketDto, ListWifiPlansQueryDto, PauseDto, RescheduleDto } from './dto.js';
import { wifiConfig } from './wifi.config.js';
import {
  addDays,
  daysLeft,
  maskMacAddress,
  pauseDaysRemaining,
  pauseDaysUsedInWindow,
  startOfDay,
} from './wifi-rules.js';
import { notify, resumeConnection, uniqueRef } from './wifi-lifecycle.js';

const CONNECTION_INCLUDE = {
  device: { select: { id: true, name: true, sku: true, band: true, wifiStandard: true, maxDevices: true, ethernetPorts: true, isMesh: true } },
  unit: { select: { serialNumber: true, macAddress: true, status: true } },
  subscriptions: { include: { wifiPlan: true }, orderBy: { createdAt: 'desc' } },
  installations: { orderBy: { createdAt: 'desc' } },
  // The router order (for the tracker) plus any unpaid orders (for "Pay now").
  orders: {
    where: { OR: [{ type: 'WIFI_ORDER' }, { status: 'PENDING', type: 'WIFI_PLAN_PURCHASE' }] },
    select: { id: true, type: true, status: true, amount: true, createdAt: true, wifiPlan: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.WifiConnectionInclude;

type ConnectionRow = Prisma.WifiConnectionGetPayload<{ include: typeof CONNECTION_INCLUDE }>;

/** Customer-safe shape: the router MAC is masked; nothing sensitive is exposed. */
export function presentConnection(c: ConnectionRow, now = new Date()) {
  const { unit, ...rest } = c;
  const activeBase = c.subscriptions
    .filter((s) => s.status === 'ACTIVE' && s.wifiPlan.type === 'BASE')
    .sort((a, b) => (b.endDate?.getTime() ?? 0) - (a.endDate?.getTime() ?? 0))[0];
  return {
    ...rest,
    unit: unit
      ? { serialNumber: unit.serialNumber, macMasked: maskMacAddress(unit.macAddress), status: unit.status }
      : null,
    currentPlan: activeBase?.wifiPlan ?? null,
    daysLeft: daysLeft(c.planExpiredAt, now),
    pauseDaysRemaining: pauseDaysRemaining(wifiConfig.maxPauseDaysPerYear, c.pauseDaysUsed, c.pauseWindowStartedAt, now),
  };
}

@Injectable()
export class WifiCustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async listDevices() {
    const devices = await this.prisma.wifiDevice.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { purchasePrice: 'asc' }],
    });
    const stock = await this.prisma.wifiDeviceUnit.groupBy({
      by: ['deviceId'],
      where: { status: 'IN_STOCK' },
      _count: { _all: true },
    });
    const reserved = await this.prisma.wifiConnection.groupBy({
      by: ['deviceId'],
      where: { unitId: null, status: 'PENDING_INSTALLATION' },
      _count: { _all: true },
    });
    return devices.map((d) => {
      const available =
        (stock.find((s) => s.deviceId === d.id)?._count._all ?? 0) -
        (reserved.find((r) => r.deviceId === d.id)?._count._all ?? 0);
      return { ...d, inStock: available > 0 };
    });
  }

  listPlans(query: ListWifiPlansQueryDto) {
    return this.prisma.wifiPlan.findMany({
      where: { isActive: true, ...(query.type ? { type: query.type } : {}) },
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
    });
  }

  async listConnections(user: UserModel) {
    const rows = await this.prisma.wifiConnection.findMany({
      where: { userId: user.id },
      include: CONNECTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    return rows.map((r) => presentConnection(r, now));
  }

  async getConnection(user: UserModel, id: string) {
    const row = await this.prisma.wifiConnection.findFirst({
      where: { id, userId: user.id },
      include: CONNECTION_INCLUDE,
    });
    if (!row) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'WiFi connection not found');
    return presentConnection(row);
  }

  // ----------------------------------------------------------- pause / resume

  async pause(user: UserModel, id: string, dto: PauseDto, now = new Date()) {
    await this.prisma.$transaction(async (tx) => {
      const conn = await tx.wifiConnection.findFirst({ where: { id, userId: user.id } });
      if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'WiFi connection not found');
      if (conn.status !== 'ACTIVE') {
        throw new ApiException(409, 'PAUSE_NOT_ALLOWED', 'Only an active connection can be paused');
      }
      const remaining = pauseDaysRemaining(wifiConfig.maxPauseDaysPerYear, conn.pauseDaysUsed, conn.pauseWindowStartedAt, now);
      if (dto.days > remaining) {
        throw new ApiException(409, 'PAUSE_LIMIT_EXCEEDED', `Only ${remaining} pause day(s) left this year`);
      }
      const usedBefore = pauseDaysUsedInWindow(conn.pauseDaysUsed, conn.pauseWindowStartedAt, now);
      const claimed = await tx.wifiConnection.updateMany({
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
      await tx.wifiSubscription.updateMany({
        where: { connectionId: id, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });
      await notify(tx, user.id, 'Zylo WiFi paused', `${conn.connectionNumber} is paused for ${dto.days} day(s). Your plan will be extended.`);
    });
    return this.getConnection(user, id);
  }

  async resume(user: UserModel, id: string, now = new Date()) {
    const owned = await this.prisma.wifiConnection.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!owned) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'WiFi connection not found');
    const resumed = await this.prisma.$transaction((tx) => resumeConnection(tx, id, now));
    if (!resumed) throw new ApiException(409, 'RESUME_NOT_ALLOWED', 'Connection is not paused');
    return this.getConnection(user, id);
  }

  // ------------------------------------------------------------ installations

  private async ownedInstallation(tx: Prisma.TransactionClient, user: UserModel, id: string) {
    const inst = await tx.wifiInstallation.findFirst({
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
      const r = await tx.wifiInstallation.updateMany({
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
      return tx.wifiInstallation.findUnique({ where: { id } });
    });
  }

  async cancelInstallation(user: UserModel, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const inst = await this.ownedInstallation(tx, user, id);
      const r = await tx.wifiInstallation.updateMany({
        where: { id, status: { in: ['REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'FAILED'] } },
        data: { status: 'CANCELLED' },
      });
      if (r.count === 0) throw new ApiException(409, 'CANCEL_NOT_ALLOWED', `A ${inst.status.toLowerCase()} installation cannot be cancelled`);

      const conn = inst.connection;
      if (conn.status === 'PENDING_INSTALLATION') {
        if (conn.unitId) {
          await tx.wifiDeviceUnit.updateMany({ where: { id: conn.unitId, status: 'ASSIGNED' }, data: { status: 'IN_STOCK' } });
        }
        await tx.wifiConnection.update({
          where: { id: conn.id },
          data: { status: 'CANCELLED', unitId: null },
        });
        await tx.wifiSubscription.updateMany({
          where: { connectionId: conn.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        await notify(tx, user.id, 'Zylo WiFi order cancelled', `${conn.connectionNumber} was cancelled. Our team will process your refund.`);
      }
      return tx.wifiInstallation.findUnique({ where: { id } });
    });
  }

  // ------------------------------------------------------------------ support

  async createTicket(user: UserModel, connectionId: string, dto: CreateWifiTicketDto) {
    const conn = await this.prisma.wifiConnection.findFirst({
      where: { id: connectionId, userId: user.id },
      select: { id: true, connectionNumber: true },
    });
    if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'WiFi connection not found');
    const ticketNumber = await uniqueRef('TKT', async (ref) =>
      !!(await this.prisma.supportTicket.findUnique({ where: { ticketNumber: ref }, select: { id: true } })),
    );
    return this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: user.id,
        category: 'WIFI',
        wifiConnectionId: conn.id,
        subject: dto.subject,
        description: dto.description,
      },
    });
  }
}
