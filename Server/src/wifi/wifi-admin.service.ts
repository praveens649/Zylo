import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { listMeta, pageParams } from '../common/pagination.js';
import type {
  AssignUnitDto,
  BulkImportUnitsDto,
  CreateUnitDto,
  FailInstallationDto,
  ListInstallationsQueryDto,
  ListUnitsQueryDto,
  ListWifiConnectionsQueryDto,
  ListWifiOrdersQueryDto,
  ReplaceUnitDto,
  ScheduleInstallationDto,
  UpdateUnitDto,
  UpdateWifiDeviceDto,
  UpdateWifiPlanDto,
  UpsertWifiDeviceDto,
  UpsertWifiPlanDto,
} from './dto.js';
import { wifiConfig } from './wifi.config.js';
import { addDays, maskMacAddress, startOfDay } from './wifi-rules.js';
import { activatePendingSubscriptions, notify, runLifecycleTick, WIFI_ORDER_TYPES } from './wifi-lifecycle.js';

const dec = (v: number | null | undefined) => (v === null || v === undefined ? null : new Prisma.Decimal(v));

const plain = <T extends object>(o: T): T => Object.assign({}, o);

function uniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}

@Injectable()
export class WifiAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------ devices

  listDevices() {
    return this.prisma.wifiDevice.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { units: true, connections: true } } },
    });
  }

  async createDevice(dto: UpsertWifiDeviceDto) {
    try {
      return await this.prisma.wifiDevice.create({
        data: {
          ...plain(dto),
          purchasePrice: dec(dto.purchasePrice),
          rentalPerMonth: dec(dto.rentalPerMonth),
          securityDeposit: dec(dto.securityDeposit),
        },
      });
    } catch (e) {
      if (uniqueViolation(e)) throw new ApiException(409, 'DEVICE_EXISTS', 'A router with this name or SKU already exists');
      throw e;
    }
  }

  async updateDevice(id: string, dto: UpdateWifiDeviceDto) {
    const data = plain(dto) as Prisma.WifiDeviceUpdateInput;
    if ('purchasePrice' in dto) data.purchasePrice = dec(dto.purchasePrice);
    if ('rentalPerMonth' in dto) data.rentalPerMonth = dec(dto.rentalPerMonth);
    if ('securityDeposit' in dto) data.securityDeposit = dec(dto.securityDeposit);
    try {
      return await this.prisma.wifiDevice.update({ where: { id }, data });
    } catch (e) {
      if (uniqueViolation(e)) throw new ApiException(409, 'DEVICE_EXISTS', 'A router with this name or SKU already exists');
      if ((e as { code?: string }).code === 'P2025') throw new ApiException(404, 'DEVICE_NOT_FOUND', 'Router model not found');
      throw e;
    }
  }

  /** Hard-deletes unused models; models with history are only disabled. */
  async deleteDevice(id: string) {
    const d = await this.prisma.wifiDevice.findUnique({
      where: { id },
      include: { _count: { select: { units: true, connections: true, orders: true } } },
    });
    if (!d) throw new ApiException(404, 'DEVICE_NOT_FOUND', 'Router model not found');
    if (d._count.units + d._count.connections + d._count.orders > 0) {
      await this.prisma.wifiDevice.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.wifiDevice.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  // -------------------------------------------------------------- wifi plans

  listPlans() {
    return this.prisma.wifiPlan.findMany({
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
      include: { _count: { select: { subscriptions: true } } },
    });
  }

  async createPlan(dto: UpsertWifiPlanDto) {
    try {
      return await this.prisma.wifiPlan.create({ data: { ...plain(dto), price: new Prisma.Decimal(dto.price) } });
    } catch (e) {
      if (uniqueViolation(e)) throw new ApiException(409, 'PLAN_NAME_EXISTS', 'A WiFi plan with this name already exists');
      throw e;
    }
  }

  async updatePlan(id: string, dto: UpdateWifiPlanDto) {
    const data = plain(dto) as Prisma.WifiPlanUpdateInput;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    try {
      return await this.prisma.wifiPlan.update({ where: { id }, data });
    } catch (e) {
      if (uniqueViolation(e)) throw new ApiException(409, 'PLAN_NAME_EXISTS', 'A WiFi plan with this name already exists');
      if ((e as { code?: string }).code === 'P2025') throw new ApiException(404, 'PLAN_NOT_FOUND', 'WiFi plan not found');
      throw e;
    }
  }

  async deletePlan(id: string) {
    const p = await this.prisma.wifiPlan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true, orders: true } } },
    });
    if (!p) throw new ApiException(404, 'PLAN_NOT_FOUND', 'WiFi plan not found');
    if (p._count.subscriptions + p._count.orders > 0) {
      await this.prisma.wifiPlan.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.wifiPlan.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  // ----------------------------------------------------------------- units

  async listUnits(q: ListUnitsQueryDto) {
    const where: Prisma.WifiDeviceUnitWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.deviceId ? { deviceId: q.deviceId } : {}),
      ...(q.search
        ? {
            OR: [
              { serialNumber: { contains: q.search, mode: 'insensitive' } },
              { macAddress: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { skip, take, page, limit } = pageParams(q);
    const [total, rows] = await Promise.all([
      this.prisma.wifiDeviceUnit.count({ where }),
      this.prisma.wifiDeviceUnit.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          device: { select: { id: true, name: true } },
          connection: { select: { id: true, connectionNumber: true, user: { select: { name: true } } } },
        },
      }),
    ]);
    // Admin inventory view still shows only the masked MAC address.
    const data = rows.map(({ macAddress, ...u }) => ({ ...u, macMasked: maskMacAddress(macAddress) }));
    return { data, meta: listMeta(total, page, limit) };
  }

  async createUnit(dto: CreateUnitDto) {
    await this.requireDevice(dto.deviceId);
    try {
      return await this.prisma.wifiDeviceUnit.create({
        data: {
          deviceId: dto.deviceId,
          serialNumber: dto.serialNumber,
          macAddress: dto.macAddress.toUpperCase(),
          warrantyEndsAt: dto.warrantyEndsAt ? new Date(dto.warrantyEndsAt) : null,
          notes: dto.notes,
        },
      });
    } catch (e) {
      if (uniqueViolation(e)) throw new ApiException(409, 'UNIT_EXISTS', 'Serial or MAC address already exists');
      throw e;
    }
  }

  private async requireDevice(id: string) {
    const d = await this.prisma.wifiDevice.findUnique({ where: { id }, select: { id: true } });
    if (!d) throw new ApiException(404, 'DEVICE_NOT_FOUND', 'Router model not found');
  }

  async updateUnit(id: string, dto: UpdateUnitDto) {
    try {
      return await this.prisma.wifiDeviceUnit.update({
        where: { id },
        data: {
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.warrantyEndsAt ? { warrantyEndsAt: new Date(dto.warrantyEndsAt) } : {}),
        },
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new ApiException(404, 'UNIT_NOT_FOUND', 'Unit not found');
      throw e;
    }
  }

  async deleteUnit(id: string) {
    const u = await this.prisma.wifiDeviceUnit.findUnique({ where: { id }, include: { connection: true } });
    if (!u) throw new ApiException(404, 'UNIT_NOT_FOUND', 'Unit not found');
    if (u.connection || !['IN_STOCK', 'RETIRED', 'RETURNED', 'FAULTY'].includes(u.status)) {
      throw new ApiException(409, 'UNIT_IN_USE', 'Only unassigned units can be deleted');
    }
    await this.prisma.wifiDeviceUnit.delete({ where: { id } });
    return { deleted: true };
  }

  /** CSV: serialNumber,macAddress[,warrantyEndsAt,notes]. Valid rows import; the rest are reported. */
  async bulkImport(dto: BulkImportUnitsDto) {
    await this.requireDevice(dto.deviceId);
    const lines = dto.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new ApiException(400, 'CSV_EMPTY', 'CSV needs a header row and at least one data row');
    const header = lines[0].split(',').map((h) => h.trim());
    const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    const cols = { serial: idx('serialNumber'), mac: idx('macAddress'), warranty: idx('warrantyEndsAt'), notes: idx('notes') };
    if (cols.serial < 0 || cols.mac < 0) {
      throw new ApiException(400, 'CSV_HEADER_INVALID', 'Header must include serialNumber, macAddress');
    }

    const imported: string[] = [];
    const errors: { row: number; serialNumber?: string; error: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c) => c.trim());
      const serialNumber = cells[cols.serial];
      const macAddress = cells[cols.mac]?.toUpperCase();
      if (!serialNumber || !macAddress) {
        errors.push({ row: i + 1, serialNumber, error: 'Missing serial or MAC address' });
        continue;
      }
      const warranty = cols.warranty >= 0 && cells[cols.warranty] ? new Date(cells[cols.warranty]) : null;
      if (warranty && Number.isNaN(warranty.getTime())) {
        errors.push({ row: i + 1, serialNumber, error: 'Invalid warrantyEndsAt date' });
        continue;
      }
      try {
        await this.prisma.wifiDeviceUnit.create({
          data: {
            deviceId: dto.deviceId,
            serialNumber,
            macAddress,
            warrantyEndsAt: warranty,
            notes: cols.notes >= 0 ? cells[cols.notes] || null : null,
          },
        });
        imported.push(serialNumber);
      } catch (e) {
        errors.push({ row: i + 1, serialNumber, error: uniqueViolation(e) ? 'Duplicate serial or MAC address' : 'Could not import row' });
      }
    }
    return { importedCount: imported.length, errorCount: errors.length, errors };
  }

  async markFaulty(id: string) {
    const r = await this.prisma.wifiDeviceUnit.updateMany({
      where: { id, status: { notIn: ['FAULTY', 'RETIRED'] } },
      data: { status: 'FAULTY' },
    });
    if (r.count === 0) {
      const u = await this.prisma.wifiDeviceUnit.findUnique({ where: { id }, select: { status: true } });
      if (!u) throw new ApiException(404, 'UNIT_NOT_FOUND', 'Unit not found');
      throw new ApiException(409, 'UNIT_STATE_INVALID', `Unit is already ${u.status.toLowerCase()}`);
    }
    return { status: 'FAULTY' };
  }

  /** Swaps a faulty unit on a connection for another in-stock unit of the same model. */
  async replaceUnit(oldUnitId: string, dto: ReplaceUnitDto) {
    return this.prisma.$transaction(async (tx) => {
      const old = await tx.wifiDeviceUnit.findUnique({ where: { id: oldUnitId }, include: { connection: true } });
      if (!old) throw new ApiException(404, 'UNIT_NOT_FOUND', 'Unit not found');
      if (!old.connection) throw new ApiException(409, 'UNIT_NOT_ASSIGNED', 'This unit is not attached to a connection');
      if (old.status !== 'FAULTY') throw new ApiException(409, 'UNIT_NOT_FAULTY', 'Mark the unit faulty before replacing it');

      const candidate = dto.newUnitId
        ? await tx.wifiDeviceUnit.findFirst({ where: { id: dto.newUnitId, deviceId: old.deviceId, status: 'IN_STOCK' } })
        : await tx.wifiDeviceUnit.findFirst({ where: { deviceId: old.deviceId, status: 'IN_STOCK' }, orderBy: { createdAt: 'asc' } });
      if (!candidate) throw new ApiException(409, 'NO_UNIT_AVAILABLE', 'No in-stock unit of the same model is available');

      const nextStatus = old.connection.status === 'PENDING_INSTALLATION' ? 'ASSIGNED' : 'INSTALLED';
      const claimed = await tx.wifiDeviceUnit.updateMany({
        where: { id: candidate.id, status: 'IN_STOCK' },
        data: { status: nextStatus },
      });
      if (claimed.count === 0) throw new ApiException(409, 'UNIT_UNAVAILABLE', 'That unit was just taken, please retry');

      await tx.wifiConnection.update({ where: { id: old.connection.id }, data: { unitId: candidate.id } });
      await notify(tx, old.connection.userId, 'Zylo WiFi router replaced', `A replacement router was assigned to ${old.connection.connectionNumber}.`);
      return { oldUnitId, newUnitId: candidate.id };
    });
  }

  // ---------------------------------------------------- orders / connections

  async listOrders(q: ListWifiOrdersQueryDto) {
    const where: Prisma.OrderWhereInput = {
      type: { in: [...WIFI_ORDER_TYPES] },
      ...(q.status ? { status: q.status as Prisma.OrderWhereInput['status'] } : {}),
    };
    const { skip, take, page, limit } = pageParams(q);
    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          wifiDevice: { select: { id: true, name: true } },
          wifiPlan: { select: { id: true, name: true } },
          wifiConnection: { select: { id: true, connectionNumber: true, status: true, unitId: true } },
          payment: { select: { id: true, status: true } },
        },
      }),
    ]);
    return { data, meta: listMeta(total, page, limit) };
  }

  async listConnections(q: ListWifiConnectionsQueryDto) {
    const where: Prisma.WifiConnectionWhereInput = {
      ...(q.status ? { status: q.status as Prisma.WifiConnectionWhereInput['status'] } : {}),
      ...(q.search
        ? {
            OR: [
              { connectionNumber: { contains: q.search, mode: 'insensitive' } },
              { user: { name: { contains: q.search, mode: 'insensitive' } } },
              { user: { email: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const { skip, take, page, limit } = pageParams(q);
    const [total, rows] = await Promise.all([
      this.prisma.wifiConnection.count({ where }),
      this.prisma.wifiConnection.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          device: { select: { id: true, name: true, band: true } },
          unit: { select: { id: true, serialNumber: true, macAddress: true, status: true } },
          installations: { orderBy: { createdAt: 'desc' }, take: 1 },
          subscriptions: { where: { status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } }, include: { wifiPlan: { select: { name: true, type: true } } } },
        },
      }),
    ]);
    const data = rows.map(({ unit, ...c }) => ({
      ...c,
      unit: unit ? { id: unit.id, serialNumber: unit.serialNumber, macMasked: maskMacAddress(unit.macAddress), status: unit.status } : null,
    }));
    return { data, meta: listMeta(total, page, limit) };
  }

  async listInstallations(q: ListInstallationsQueryDto) {
    const where: Prisma.WifiInstallationWhereInput = q.status
      ? { status: q.status as Prisma.WifiInstallationWhereInput['status'] }
      : {};
    const { skip, take, page, limit } = pageParams(q);
    const [total, data] = await Promise.all([
      this.prisma.wifiInstallation.count({ where }),
      this.prisma.wifiInstallation.findMany({
        where,
        skip,
        take,
        orderBy: [{ preferredDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          connection: {
            select: {
              id: true, connectionNumber: true, status: true, unitId: true, addressLine: true, city: true, state: true, postalCode: true, contactPhone: true,
              user: { select: { name: true, email: true } },
              device: { select: { name: true } },
            },
          },
        },
      }),
    ]);
    return { data, meta: listMeta(total, page, limit) };
  }

  // ----------------------------------------------------------- fulfilment

  /** Assigns a real unit. The unit is claimed atomically (IN_STOCK -> ASSIGNED) so it can never be handed out twice. */
  async assignUnit(connectionId: string, dto: AssignUnitDto) {
    return this.prisma.$transaction(async (tx) => {
      const conn = await tx.wifiConnection.findUnique({ where: { id: connectionId } });
      if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'WiFi connection not found');
      if (conn.status !== 'PENDING_INSTALLATION' || conn.unitId) {
        throw new ApiException(409, 'ASSIGN_NOT_ALLOWED', 'Connection must be pending installation with no unit assigned');
      }
      const paid = await tx.order.findFirst({
        where: { wifiConnectionId: connectionId, type: 'WIFI_ORDER', status: 'COMPLETED' },
        select: { id: true },
      });
      if (!paid) throw new ApiException(409, 'PAYMENT_NOT_CONFIRMED', 'Payment has not been confirmed for this order');

      const unit = dto.unitId
        ? await tx.wifiDeviceUnit.findFirst({ where: { id: dto.unitId, deviceId: conn.deviceId } })
        : await tx.wifiDeviceUnit.findFirst({ where: { deviceId: conn.deviceId, status: 'IN_STOCK' }, orderBy: { createdAt: 'asc' } });
      if (!unit) throw new ApiException(409, 'NO_UNIT_AVAILABLE', 'No matching in-stock unit is available');

      const claimed = await tx.wifiDeviceUnit.updateMany({
        where: { id: unit.id, status: 'IN_STOCK' },
        data: { status: 'ASSIGNED' },
      });
      if (claimed.count === 0) throw new ApiException(409, 'UNIT_UNAVAILABLE', 'That unit is not in stock');

      const linked = await tx.wifiConnection.updateMany({
        where: { id: connectionId, unitId: null, status: 'PENDING_INSTALLATION' },
        data: { unitId: unit.id },
      });
      if (linked.count === 0) throw new ApiException(409, 'ASSIGN_NOT_ALLOWED', 'Connection already has a unit');
      return { connectionId, unitId: unit.id };
    });
  }

  async scheduleInstallation(id: string, dto: ScheduleInstallationDto) {
    return this.prisma.$transaction(async (tx) => {
      const inst = await tx.wifiInstallation.findUnique({ where: { id }, include: { connection: true } });
      if (!inst) throw new ApiException(404, 'INSTALLATION_NOT_FOUND', 'Installation not found');
      const r = await tx.wifiInstallation.updateMany({
        where: { id, status: { in: ['REQUESTED', 'SCHEDULED', 'RESCHEDULED'] } },
        data: {
          status: 'SCHEDULED',
          scheduledAt: new Date(dto.scheduledAt),
          technicianName: dto.technicianName,
          technicianPhone: dto.technicianPhone,
        },
      });
      if (r.count === 0) throw new ApiException(409, 'SCHEDULE_NOT_ALLOWED', `A ${inst.status.toLowerCase()} installation cannot be scheduled`);
      await notify(tx, inst.connection.userId, 'Installation scheduled', `Technician ${dto.technicianName} will visit on ${new Date(dto.scheduledAt).toLocaleString()}.`);
      return tx.wifiInstallation.findUnique({ where: { id } });
    });
  }

  /** Completing the visit is what activates the connection and its plans. */
  async completeInstallation(id: string, now: Date = new Date()) {
    return this.prisma.$transaction(async (tx) => {
      const inst = await tx.wifiInstallation.findUnique({ where: { id }, include: { connection: true } });
      if (!inst) throw new ApiException(404, 'INSTALLATION_NOT_FOUND', 'Installation not found');
      const conn = inst.connection;
      if (conn.status !== 'PENDING_INSTALLATION') {
        throw new ApiException(409, 'CONNECTION_NOT_PENDING', 'Connection is not waiting for installation');
      }
      if (!conn.unitId) throw new ApiException(409, 'UNIT_NOT_ASSIGNED', 'Assign a router unit before completing the installation');
      const paid = await tx.order.findFirst({
        where: { wifiConnectionId: conn.id, type: 'WIFI_ORDER', status: 'COMPLETED' },
        select: { id: true },
      });
      if (!paid) throw new ApiException(409, 'PAYMENT_NOT_CONFIRMED', 'Payment has not been confirmed for this order');

      const claimed = await tx.wifiInstallation.updateMany({
        where: { id, status: { in: ['REQUESTED', 'SCHEDULED', 'RESCHEDULED'] } },
        data: { status: 'COMPLETED', completedAt: now },
      });
      if (claimed.count === 0) throw new ApiException(409, 'INSTALLATION_NOT_OPEN', `A ${inst.status.toLowerCase()} installation cannot be completed`);

      await tx.wifiDeviceUnit.update({ where: { id: conn.unitId }, data: { status: 'INSTALLED' } });
      const baseEnd = await activatePendingSubscriptions(tx, conn.id, now);
      await tx.wifiConnection.update({
        where: { id: conn.id },
        data: { status: 'ACTIVE', activatedAt: now, planExpiredAt: baseEnd },
      });
      await notify(tx, conn.userId, 'Zylo WiFi is live', `${conn.connectionNumber} is active${baseEnd ? ` until ${baseEnd.toDateString()}` : ''}. Enjoy!`);
      return { connectionId: conn.id, status: 'ACTIVE', planExpiredAt: baseEnd };
    });
  }

  async failInstallation(id: string, dto: FailInstallationDto) {
    return this.prisma.$transaction(async (tx) => {
      const inst = await tx.wifiInstallation.findUnique({ where: { id }, include: { connection: true } });
      if (!inst) throw new ApiException(404, 'INSTALLATION_NOT_FOUND', 'Installation not found');
      const r = await tx.wifiInstallation.updateMany({
        where: { id, status: { in: ['REQUESTED', 'SCHEDULED', 'RESCHEDULED'] } },
        data: { status: 'FAILED', failureReason: dto.reason },
      });
      if (r.count === 0) throw new ApiException(409, 'INSTALLATION_NOT_OPEN', `A ${inst.status.toLowerCase()} installation cannot be marked failed`);
      await notify(tx, inst.connection.userId, 'Installation could not be completed', `${dto.reason}. Please reschedule from My WiFi.`);
      return tx.wifiInstallation.findUnique({ where: { id } });
    });
  }

  // ------------------------------------------------- disconnect / returns

  async disconnect(connectionId: string, now: Date = new Date()) {
    return this.prisma.$transaction(async (tx) => {
      const conn = await tx.wifiConnection.findUnique({ where: { id: connectionId } });
      if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'WiFi connection not found');
      const r = await tx.wifiConnection.updateMany({
        where: { id: connectionId, status: { in: ['ACTIVE', 'PAUSED', 'GRACE_PERIOD', 'SUSPENDED'] } },
        data: {
          status: 'DISCONNECTED',
          disconnectedAt: now,
          pausedAt: null,
          pauseEndsAt: null,
          returnDueAt: conn.ownership === 'RENTAL' ? addDays(now, wifiConfig.returnDueDays) : null,
        },
      });
      if (r.count === 0) throw new ApiException(409, 'DISCONNECT_NOT_ALLOWED', 'Connection cannot be disconnected from its current state');
      await tx.wifiSubscription.updateMany({
        where: { connectionId, status: { in: ['ACTIVE', 'PAUSED', 'PENDING'] } },
        data: { status: 'CANCELLED' },
      });
      await notify(
        tx,
        conn.userId,
        'Zylo WiFi disconnected',
        conn.ownership === 'RENTAL'
          ? `${conn.connectionNumber} was disconnected. Please return the rented router within ${wifiConfig.returnDueDays} days.`
          : `${conn.connectionNumber} was disconnected.`,
      );
      return { status: 'DISCONNECTED' };
    });
  }

  async confirmReturn(connectionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const conn = await tx.wifiConnection.findUnique({ where: { id: connectionId } });
      if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'WiFi connection not found');
      if (conn.status !== 'DISCONNECTED' || conn.ownership !== 'RENTAL' || !conn.unitId) {
        throw new ApiException(409, 'RETURN_NOT_EXPECTED', 'No rented router is awaiting return on this connection');
      }
      await tx.wifiDeviceUnit.update({ where: { id: conn.unitId }, data: { status: 'RETURNED' } });
      await tx.wifiConnection.update({ where: { id: connectionId }, data: { returnDueAt: null } });
      return { unitId: conn.unitId, status: 'RETURNED' };
    });
  }

  // ------------------------------------------------------------- dashboard

  async dashboard(now: Date = new Date()) {
    const dayStart = startOfDay(now);
    const [activeConnections, unitsInStock, installsToday, expiringThisWeek] = await Promise.all([
      this.prisma.wifiConnection.count({ where: { status: 'ACTIVE' } }),
      this.prisma.wifiDeviceUnit.count({ where: { status: 'IN_STOCK' } }),
      this.prisma.wifiInstallation.count({
        where: { status: { in: ['SCHEDULED', 'RESCHEDULED'] }, scheduledAt: { gte: dayStart, lt: addDays(dayStart, 1) } },
      }),
      this.prisma.wifiConnection.count({
        where: { status: 'ACTIVE', planExpiredAt: { gte: now, lte: addDays(now, 7) } },
      }),
    ]);
    return { activeConnections, unitsInStock, installsToday, expiringThisWeek };
  }

  runJobs() {
    return runLifecycleTick(this.prisma);
  }
}
