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
  ListTvConnectionsQueryDto,
  ListTvOrdersQueryDto,
  ListUnitsQueryDto,
  ReplaceUnitDto,
  ScheduleInstallationDto,
  UpdateBoxModelDto,
  UpdateTvPlanDto,
  UpdateUnitDto,
  UpsertBoxModelDto,
  UpsertTvPlanDto,
} from './dto.js';
import { tvConfig } from './tv.config.js';
import { addDays, maskCardNumber, startOfDay } from './tv-rules.js';
import { activatePendingSubscriptions, notify, runLifecycleTick, TV_ORDER_TYPES } from './tv-lifecycle.js';

const dec = (v: number | null | undefined) => (v === null || v === undefined ? null : new Prisma.Decimal(v));

const plain = <T extends object>(o: T): T => Object.assign({}, o);

function uniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}

@Injectable()
export class TvAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------ box models

  listModels() {
    return this.prisma.setTopBoxModel.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { units: true, connections: true } } },
    });
  }

  async createModel(dto: UpsertBoxModelDto) {
    try {
      return await this.prisma.setTopBoxModel.create({
        data: {
          ...plain(dto),
          purchasePrice: dec(dto.purchasePrice),
          rentalPerMonth: dec(dto.rentalPerMonth),
          securityDeposit: dec(dto.securityDeposit),
        },
      });
    } catch (e) {
      if (uniqueViolation(e)) throw new ApiException(409, 'MODEL_EXISTS', 'A box with this name or SKU already exists');
      throw e;
    }
  }

  async updateModel(id: string, dto: UpdateBoxModelDto) {
    const data = plain(dto) as Prisma.SetTopBoxModelUpdateInput;
    if ('purchasePrice' in dto) data.purchasePrice = dec(dto.purchasePrice);
    if ('rentalPerMonth' in dto) data.rentalPerMonth = dec(dto.rentalPerMonth);
    if ('securityDeposit' in dto) data.securityDeposit = dec(dto.securityDeposit);
    try {
      return await this.prisma.setTopBoxModel.update({ where: { id }, data });
    } catch (e) {
      if (uniqueViolation(e)) throw new ApiException(409, 'MODEL_EXISTS', 'A box with this name or SKU already exists');
      if ((e as { code?: string }).code === 'P2025') throw new ApiException(404, 'BOX_NOT_FOUND', 'Box model not found');
      throw e;
    }
  }

  /** Hard-deletes unused models; models with history are only disabled. */
  async deleteModel(id: string) {
    const m = await this.prisma.setTopBoxModel.findUnique({
      where: { id },
      include: { _count: { select: { units: true, connections: true, orders: true } } },
    });
    if (!m) throw new ApiException(404, 'BOX_NOT_FOUND', 'Box model not found');
    if (m._count.units + m._count.connections + m._count.orders > 0) {
      await this.prisma.setTopBoxModel.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.setTopBoxModel.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  // -------------------------------------------------------------- tv plans

  listPlans() {
    return this.prisma.tvPlan.findMany({
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
      include: { _count: { select: { subscriptions: true } } },
    });
  }

  async createPlan(dto: UpsertTvPlanDto) {
    try {
      return await this.prisma.tvPlan.create({ data: { ...plain(dto), price: new Prisma.Decimal(dto.price) } });
    } catch (e) {
      if (uniqueViolation(e)) throw new ApiException(409, 'PLAN_NAME_EXISTS', 'A TV pack with this name already exists');
      throw e;
    }
  }

  async updatePlan(id: string, dto: UpdateTvPlanDto) {
    const data = plain(dto) as Prisma.TvPlanUpdateInput;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    try {
      return await this.prisma.tvPlan.update({ where: { id }, data });
    } catch (e) {
      if (uniqueViolation(e)) throw new ApiException(409, 'PLAN_NAME_EXISTS', 'A TV pack with this name already exists');
      if ((e as { code?: string }).code === 'P2025') throw new ApiException(404, 'PLAN_NOT_FOUND', 'TV pack not found');
      throw e;
    }
  }

  async deletePlan(id: string) {
    const p = await this.prisma.tvPlan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true, orders: true } } },
    });
    if (!p) throw new ApiException(404, 'PLAN_NOT_FOUND', 'TV pack not found');
    if (p._count.subscriptions + p._count.orders > 0) {
      await this.prisma.tvPlan.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.tvPlan.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  // ----------------------------------------------------------------- units

  async listUnits(q: ListUnitsQueryDto) {
    const where: Prisma.SetTopBoxUnitWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.modelId ? { modelId: q.modelId } : {}),
      ...(q.search
        ? {
            OR: [
              { serialNumber: { contains: q.search, mode: 'insensitive' } },
              { macAddress: { contains: q.search, mode: 'insensitive' } },
              { smartCardNumber: { contains: q.search } },
            ],
          }
        : {}),
    };
    const { skip, take, page, limit } = pageParams(q);
    const [total, rows] = await Promise.all([
      this.prisma.setTopBoxUnit.count({ where }),
      this.prisma.setTopBoxUnit.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          model: { select: { id: true, name: true } },
          connection: { select: { id: true, connectionNumber: true, user: { select: { name: true } } } },
        },
      }),
    ]);
    // Admin inventory view still shows only the masked card number.
    const data = rows.map(({ smartCardNumber, ...u }) => ({ ...u, smartCardMasked: maskCardNumber(smartCardNumber) }));
    return { data, meta: listMeta(total, page, limit) };
  }

  async createUnit(dto: CreateUnitDto) {
    await this.requireModel(dto.modelId);
    try {
      return await this.prisma.setTopBoxUnit.create({
        data: {
          modelId: dto.modelId,
          serialNumber: dto.serialNumber,
          macAddress: dto.macAddress.toUpperCase(),
          smartCardNumber: dto.smartCardNumber,
          warrantyEndsAt: dto.warrantyEndsAt ? new Date(dto.warrantyEndsAt) : null,
          notes: dto.notes,
        },
      });
    } catch (e) {
      if (uniqueViolation(e)) throw new ApiException(409, 'UNIT_EXISTS', 'Serial, MAC or smart card number already exists');
      throw e;
    }
  }

  private async requireModel(id: string) {
    const m = await this.prisma.setTopBoxModel.findUnique({ where: { id }, select: { id: true } });
    if (!m) throw new ApiException(404, 'BOX_NOT_FOUND', 'Box model not found');
  }

  async updateUnit(id: string, dto: UpdateUnitDto) {
    try {
      return await this.prisma.setTopBoxUnit.update({
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
    const u = await this.prisma.setTopBoxUnit.findUnique({ where: { id }, include: { connection: true } });
    if (!u) throw new ApiException(404, 'UNIT_NOT_FOUND', 'Unit not found');
    if (u.connection || !['IN_STOCK', 'RETIRED', 'RETURNED', 'FAULTY'].includes(u.status)) {
      throw new ApiException(409, 'UNIT_IN_USE', 'Only unassigned units can be deleted');
    }
    await this.prisma.setTopBoxUnit.delete({ where: { id } });
    return { deleted: true };
  }

  /** CSV: serialNumber,macAddress,smartCardNumber[,warrantyEndsAt,notes]. Valid rows import; the rest are reported. */
  async bulkImport(dto: BulkImportUnitsDto) {
    await this.requireModel(dto.modelId);
    const lines = dto.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new ApiException(400, 'CSV_EMPTY', 'CSV needs a header row and at least one data row');
    const header = lines[0].split(',').map((h) => h.trim());
    const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    const cols = { serial: idx('serialNumber'), mac: idx('macAddress'), card: idx('smartCardNumber'), warranty: idx('warrantyEndsAt'), notes: idx('notes') };
    if (cols.serial < 0 || cols.mac < 0 || cols.card < 0) {
      throw new ApiException(400, 'CSV_HEADER_INVALID', 'Header must include serialNumber, macAddress, smartCardNumber');
    }

    const imported: string[] = [];
    const errors: { row: number; serialNumber?: string; error: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c) => c.trim());
      const serialNumber = cells[cols.serial];
      const macAddress = cells[cols.mac]?.toUpperCase();
      const smartCardNumber = cells[cols.card];
      if (!serialNumber || !macAddress || !smartCardNumber) {
        errors.push({ row: i + 1, serialNumber, error: 'Missing serial, MAC or smart card number' });
        continue;
      }
      const warranty = cols.warranty >= 0 && cells[cols.warranty] ? new Date(cells[cols.warranty]) : null;
      if (warranty && Number.isNaN(warranty.getTime())) {
        errors.push({ row: i + 1, serialNumber, error: 'Invalid warrantyEndsAt date' });
        continue;
      }
      try {
        await this.prisma.setTopBoxUnit.create({
          data: {
            modelId: dto.modelId,
            serialNumber,
            macAddress,
            smartCardNumber,
            warrantyEndsAt: warranty,
            notes: cols.notes >= 0 ? cells[cols.notes] || null : null,
          },
        });
        imported.push(serialNumber);
      } catch (e) {
        errors.push({ row: i + 1, serialNumber, error: uniqueViolation(e) ? 'Duplicate serial, MAC or smart card' : 'Could not import row' });
      }
    }
    return { importedCount: imported.length, errorCount: errors.length, errors };
  }

  async markFaulty(id: string) {
    const r = await this.prisma.setTopBoxUnit.updateMany({
      where: { id, status: { notIn: ['FAULTY', 'RETIRED'] } },
      data: { status: 'FAULTY' },
    });
    if (r.count === 0) {
      const u = await this.prisma.setTopBoxUnit.findUnique({ where: { id }, select: { status: true } });
      if (!u) throw new ApiException(404, 'UNIT_NOT_FOUND', 'Unit not found');
      throw new ApiException(409, 'UNIT_STATE_INVALID', `Unit is already ${u.status.toLowerCase()}`);
    }
    return { status: 'FAULTY' };
  }

  /** Swaps a faulty unit on a connection for another in-stock unit of the same model. */
  async replaceUnit(oldUnitId: string, dto: ReplaceUnitDto) {
    return this.prisma.$transaction(async (tx) => {
      const old = await tx.setTopBoxUnit.findUnique({ where: { id: oldUnitId }, include: { connection: true } });
      if (!old) throw new ApiException(404, 'UNIT_NOT_FOUND', 'Unit not found');
      if (!old.connection) throw new ApiException(409, 'UNIT_NOT_ASSIGNED', 'This unit is not attached to a connection');
      if (old.status !== 'FAULTY') throw new ApiException(409, 'UNIT_NOT_FAULTY', 'Mark the unit faulty before replacing it');

      const candidate = dto.newUnitId
        ? await tx.setTopBoxUnit.findFirst({ where: { id: dto.newUnitId, modelId: old.modelId, status: 'IN_STOCK' } })
        : await tx.setTopBoxUnit.findFirst({ where: { modelId: old.modelId, status: 'IN_STOCK' }, orderBy: { createdAt: 'asc' } });
      if (!candidate) throw new ApiException(409, 'NO_UNIT_AVAILABLE', 'No in-stock unit of the same model is available');

      const nextStatus = old.connection.status === 'PENDING_INSTALLATION' ? 'ASSIGNED' : 'INSTALLED';
      const claimed = await tx.setTopBoxUnit.updateMany({
        where: { id: candidate.id, status: 'IN_STOCK' },
        data: { status: nextStatus },
      });
      if (claimed.count === 0) throw new ApiException(409, 'UNIT_UNAVAILABLE', 'That unit was just taken, please retry');

      await tx.setTopBoxConnection.update({ where: { id: old.connection.id }, data: { unitId: candidate.id } });
      await notify(tx, old.connection.userId, 'Zylo TV box replaced', `A replacement box was assigned to ${old.connection.connectionNumber}.`);
      return { oldUnitId, newUnitId: candidate.id };
    });
  }

  // ---------------------------------------------------- orders / connections

  async listOrders(q: ListTvOrdersQueryDto) {
    const where: Prisma.OrderWhereInput = {
      type: { in: [...TV_ORDER_TYPES] },
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
          setTopBoxModel: { select: { id: true, name: true } },
          tvPlan: { select: { id: true, name: true } },
          setTopBoxConnection: { select: { id: true, connectionNumber: true, status: true, unitId: true } },
          payment: { select: { id: true, status: true } },
        },
      }),
    ]);
    return { data, meta: listMeta(total, page, limit) };
  }

  async listConnections(q: ListTvConnectionsQueryDto) {
    const where: Prisma.SetTopBoxConnectionWhereInput = {
      ...(q.status ? { status: q.status as Prisma.SetTopBoxConnectionWhereInput['status'] } : {}),
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
      this.prisma.setTopBoxConnection.count({ where }),
      this.prisma.setTopBoxConnection.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          model: { select: { id: true, name: true, resolution: true } },
          unit: { select: { id: true, serialNumber: true, smartCardNumber: true, status: true } },
          installations: { orderBy: { createdAt: 'desc' }, take: 1 },
          subscriptions: { where: { status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } }, include: { tvPlan: { select: { name: true, type: true } } } },
        },
      }),
    ]);
    const data = rows.map(({ unit, ...c }) => ({
      ...c,
      unit: unit ? { id: unit.id, serialNumber: unit.serialNumber, smartCardMasked: maskCardNumber(unit.smartCardNumber), status: unit.status } : null,
    }));
    return { data, meta: listMeta(total, page, limit) };
  }

  async listInstallations(q: ListInstallationsQueryDto) {
    const where: Prisma.InstallationRequestWhereInput = q.status
      ? { status: q.status as Prisma.InstallationRequestWhereInput['status'] }
      : {};
    const { skip, take, page, limit } = pageParams(q);
    const [total, data] = await Promise.all([
      this.prisma.installationRequest.count({ where }),
      this.prisma.installationRequest.findMany({
        where,
        skip,
        take,
        orderBy: [{ preferredDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          connection: {
            select: {
              id: true, connectionNumber: true, status: true, unitId: true, addressLine: true, city: true, state: true, postalCode: true, contactPhone: true,
              user: { select: { name: true, email: true } },
              model: { select: { name: true } },
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
      const conn = await tx.setTopBoxConnection.findUnique({ where: { id: connectionId } });
      if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'TV connection not found');
      if (conn.status !== 'PENDING_INSTALLATION' || conn.unitId) {
        throw new ApiException(409, 'ASSIGN_NOT_ALLOWED', 'Connection must be pending installation with no unit assigned');
      }
      const paid = await tx.order.findFirst({
        where: { setTopBoxConnectionId: connectionId, type: 'SET_TOP_BOX_ORDER', status: 'COMPLETED' },
        select: { id: true },
      });
      if (!paid) throw new ApiException(409, 'PAYMENT_NOT_CONFIRMED', 'Payment has not been confirmed for this order');

      const unit = dto.unitId
        ? await tx.setTopBoxUnit.findFirst({ where: { id: dto.unitId, modelId: conn.modelId } })
        : await tx.setTopBoxUnit.findFirst({ where: { modelId: conn.modelId, status: 'IN_STOCK' }, orderBy: { createdAt: 'asc' } });
      if (!unit) throw new ApiException(409, 'NO_UNIT_AVAILABLE', 'No matching in-stock unit is available');

      const claimed = await tx.setTopBoxUnit.updateMany({
        where: { id: unit.id, status: 'IN_STOCK' },
        data: { status: 'ASSIGNED' },
      });
      if (claimed.count === 0) throw new ApiException(409, 'UNIT_UNAVAILABLE', 'That unit is not in stock');

      const linked = await tx.setTopBoxConnection.updateMany({
        where: { id: connectionId, unitId: null, status: 'PENDING_INSTALLATION' },
        data: { unitId: unit.id },
      });
      if (linked.count === 0) throw new ApiException(409, 'ASSIGN_NOT_ALLOWED', 'Connection already has a unit');
      return { connectionId, unitId: unit.id };
    });
  }

  async scheduleInstallation(id: string, dto: ScheduleInstallationDto) {
    return this.prisma.$transaction(async (tx) => {
      const inst = await tx.installationRequest.findUnique({ where: { id }, include: { connection: true } });
      if (!inst) throw new ApiException(404, 'INSTALLATION_NOT_FOUND', 'Installation not found');
      const r = await tx.installationRequest.updateMany({
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
      return tx.installationRequest.findUnique({ where: { id } });
    });
  }

  /** Completing the visit is what activates the connection and its packs. */
  async completeInstallation(id: string, now: Date = new Date()) {
    return this.prisma.$transaction(async (tx) => {
      const inst = await tx.installationRequest.findUnique({ where: { id }, include: { connection: true } });
      if (!inst) throw new ApiException(404, 'INSTALLATION_NOT_FOUND', 'Installation not found');
      const conn = inst.connection;
      if (conn.status !== 'PENDING_INSTALLATION') {
        throw new ApiException(409, 'CONNECTION_NOT_PENDING', 'Connection is not waiting for installation');
      }
      if (!conn.unitId) throw new ApiException(409, 'UNIT_NOT_ASSIGNED', 'Assign a box unit before completing the installation');
      const paid = await tx.order.findFirst({
        where: { setTopBoxConnectionId: conn.id, type: 'SET_TOP_BOX_ORDER', status: 'COMPLETED' },
        select: { id: true },
      });
      if (!paid) throw new ApiException(409, 'PAYMENT_NOT_CONFIRMED', 'Payment has not been confirmed for this order');

      const claimed = await tx.installationRequest.updateMany({
        where: { id, status: { in: ['REQUESTED', 'SCHEDULED', 'RESCHEDULED'] } },
        data: { status: 'COMPLETED', completedAt: now },
      });
      if (claimed.count === 0) throw new ApiException(409, 'INSTALLATION_NOT_OPEN', `A ${inst.status.toLowerCase()} installation cannot be completed`);

      await tx.setTopBoxUnit.update({ where: { id: conn.unitId }, data: { status: 'INSTALLED' } });
      const baseEnd = await activatePendingSubscriptions(tx, conn.id, now);
      await tx.setTopBoxConnection.update({
        where: { id: conn.id },
        data: { status: 'ACTIVE', activatedAt: now, planExpiredAt: baseEnd },
      });
      await notify(tx, conn.userId, 'Zylo TV is live', `${conn.connectionNumber} is active${baseEnd ? ` until ${baseEnd.toDateString()}` : ''}. Enjoy!`);
      return { connectionId: conn.id, status: 'ACTIVE', planExpiredAt: baseEnd };
    });
  }

  async failInstallation(id: string, dto: FailInstallationDto) {
    return this.prisma.$transaction(async (tx) => {
      const inst = await tx.installationRequest.findUnique({ where: { id }, include: { connection: true } });
      if (!inst) throw new ApiException(404, 'INSTALLATION_NOT_FOUND', 'Installation not found');
      const r = await tx.installationRequest.updateMany({
        where: { id, status: { in: ['REQUESTED', 'SCHEDULED', 'RESCHEDULED'] } },
        data: { status: 'FAILED', failureReason: dto.reason },
      });
      if (r.count === 0) throw new ApiException(409, 'INSTALLATION_NOT_OPEN', `A ${inst.status.toLowerCase()} installation cannot be marked failed`);
      await notify(tx, inst.connection.userId, 'Installation could not be completed', `${dto.reason}. Please reschedule from My TV.`);
      return tx.installationRequest.findUnique({ where: { id } });
    });
  }

  // ------------------------------------------------- disconnect / returns

  async disconnect(connectionId: string, now: Date = new Date()) {
    return this.prisma.$transaction(async (tx) => {
      const conn = await tx.setTopBoxConnection.findUnique({ where: { id: connectionId } });
      if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'TV connection not found');
      const r = await tx.setTopBoxConnection.updateMany({
        where: { id: connectionId, status: { in: ['ACTIVE', 'PAUSED', 'GRACE_PERIOD', 'SUSPENDED'] } },
        data: {
          status: 'DISCONNECTED',
          disconnectedAt: now,
          pausedAt: null,
          pauseEndsAt: null,
          returnDueAt: conn.ownership === 'RENTAL' ? addDays(now, tvConfig.returnDueDays) : null,
        },
      });
      if (r.count === 0) throw new ApiException(409, 'DISCONNECT_NOT_ALLOWED', 'Connection cannot be disconnected from its current state');
      await tx.tvSubscription.updateMany({
        where: { connectionId, status: { in: ['ACTIVE', 'PAUSED', 'PENDING'] } },
        data: { status: 'CANCELLED' },
      });
      await notify(
        tx,
        conn.userId,
        'Zylo TV disconnected',
        conn.ownership === 'RENTAL'
          ? `${conn.connectionNumber} was disconnected. Please return the rented box within ${tvConfig.returnDueDays} days.`
          : `${conn.connectionNumber} was disconnected.`,
      );
      return { status: 'DISCONNECTED' };
    });
  }

  async confirmReturn(connectionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const conn = await tx.setTopBoxConnection.findUnique({ where: { id: connectionId } });
      if (!conn) throw new ApiException(404, 'CONNECTION_NOT_FOUND', 'TV connection not found');
      if (conn.status !== 'DISCONNECTED' || conn.ownership !== 'RENTAL' || !conn.unitId) {
        throw new ApiException(409, 'RETURN_NOT_EXPECTED', 'No rented box is awaiting return on this connection');
      }
      await tx.setTopBoxUnit.update({ where: { id: conn.unitId }, data: { status: 'RETURNED' } });
      await tx.setTopBoxConnection.update({ where: { id: connectionId }, data: { returnDueAt: null } });
      return { unitId: conn.unitId, status: 'RETURNED' };
    });
  }

  // ------------------------------------------------------------- dashboard

  async dashboard(now: Date = new Date()) {
    const dayStart = startOfDay(now);
    const [activeConnections, unitsInStock, installsToday, expiringThisWeek] = await Promise.all([
      this.prisma.setTopBoxConnection.count({ where: { status: 'ACTIVE' } }),
      this.prisma.setTopBoxUnit.count({ where: { status: 'IN_STOCK' } }),
      this.prisma.installationRequest.count({
        where: { status: { in: ['SCHEDULED', 'RESCHEDULED'] }, scheduledAt: { gte: dayStart, lt: addDays(dayStart, 1) } },
      }),
      this.prisma.setTopBoxConnection.count({
        where: { status: 'ACTIVE', planExpiredAt: { gte: now, lte: addDays(now, 7) } },
      }),
    ]);
    return { activeConnections, unitsInStock, installsToday, expiringThisWeek };
  }

  runJobs() {
    return runLifecycleTick(this.prisma);
  }
}
