import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PlanType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { listMeta, pageParams } from '../common/pagination.js';
import type {
  CreatePlanDto,
  ListPlansQueryDto,
  UpdatePlanDto,
} from './dto.js';

/**
 * Derive the daily data simulation allowance from the plan's marketed data
 * allowance. Non-POSTPAID plans advertise dataAllowanceGb as a per-day amount
 * ("1.5 GB/day"), while POSTPAID is a pooled monthly quota and validity-only
 * packs carry no daily allowance — those stay null.
 */
function deriveDailyAllowanceMb(
  dataAllowanceGb: number | Prisma.Decimal | null | undefined,
  type: PlanType,
  isValidityOnly: boolean,
): number | null {
  if (type === 'POSTPAID' || isValidityOnly) return null;
  const gb = dataAllowanceGb == null ? null : Number(dataAllowanceGb);
  if (gb == null || gb <= 0) return null;
  return Math.round(gb * 1024);
}

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans(query: ListPlansQueryDto, isAdmin: boolean = false) {
    const { skip, take, page, limit } = pageParams(query);

    const where: Prisma.PlanWhereInput = {};

    // For non-admin, always only show active plans unless explicitly specified
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    } else if (!isAdmin) {
      where.isActive = true;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { callingBenefit: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.businessOnly !== undefined) {
      where.businessOnly = query.businessOnly;
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    if (query.dataBankEnabled !== undefined) {
      where.dataBankEnabled = query.dataBankEnabled;
    }

    // Determine sort
    const sortField = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const orderBy: Prisma.PlanOrderByWithRelationInput = {
      [sortField]: sortDirection,
    };

    const [total, data] = await Promise.all([
      this.prisma.plan.count({ where }),
      this.prisma.plan.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: {
            select: {
              orders: true,
              planSubscriptions: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: listMeta(total, page, limit),
    };
  }

  async getPlanById(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            planSubscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'Recharge plan not found');
    }

    return plan;
  }

  async createPlan(dto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { name: dto.name },
      select: { id: true },
    });

    if (existing) {
      throw new ApiException(
        409,
        'PLAN_NAME_EXISTS',
        `A recharge plan with the name "${dto.name}" already exists`,
      );
    }

    const plan = await this.prisma.plan.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        type: dto.type ?? 'PREPAID',
        price: new Prisma.Decimal(dto.price),
        currency: dto.currency ?? 'inr',
        validityDays: dto.validityDays,
        dataAllowanceGb:
          dto.dataAllowanceGb !== undefined && dto.dataAllowanceGb !== null
            ? new Prisma.Decimal(dto.dataAllowanceGb)
            : null,
        callingBenefit: dto.callingBenefit ?? 'Unlimited',
        smsCount: dto.smsCount ?? null,
        businessOnly: dto.businessOnly ?? false,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        isValidityOnly: dto.isValidityOnly ?? false,
        dailyDataAllowanceMb:
          dto.dailyDataAllowanceMb ??
          deriveDailyAllowanceMb(
            dto.dataAllowanceGb,
            dto.type ?? 'PREPAID',
            dto.isValidityOnly ?? false,
          ),
        dataBankEnabled: dto.dataBankEnabled ?? false,
        rolloverLimitMb: dto.rolloverLimitMb ?? null,
        rolloverExpiryDays: dto.rolloverExpiryDays ?? null,
        dataTransferEnabled: dto.dataTransferEnabled ?? false,
        transferLimitMb: dto.transferLimitMb ?? null,
      },
      include: {
        _count: {
          select: {
            orders: true,
            planSubscriptions: true,
          },
        },
      },
    });

    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'Recharge plan not found');
    }

    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.prisma.plan.findUnique({
        where: { name: dto.name },
        select: { id: true },
      });
      if (duplicate) {
        throw new ApiException(
          409,
          'PLAN_NAME_EXISTS',
          `A recharge plan with the name "${dto.name}" already exists`,
        );
      }
    }

    const data: Prisma.PlanUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.validityDays !== undefined) data.validityDays = dto.validityDays;
    if (dto.dataAllowanceGb !== undefined) {
      data.dataAllowanceGb =
        dto.dataAllowanceGb !== null ? new Prisma.Decimal(dto.dataAllowanceGb) : null;
    }
    if (dto.dailyDataAllowanceMb !== undefined) {
      data.dailyDataAllowanceMb = dto.dailyDataAllowanceMb;
    } else if (
      dto.dataAllowanceGb !== undefined ||
      dto.type !== undefined ||
      dto.isValidityOnly !== undefined
    ) {
      // The inputs to the derivation changed — recompute using merged values.
      data.dailyDataAllowanceMb = deriveDailyAllowanceMb(
        dto.dataAllowanceGb !== undefined
          ? dto.dataAllowanceGb
          : existing.dataAllowanceGb,
        dto.type ?? existing.type,
        dto.isValidityOnly ?? existing.isValidityOnly,
      );
    }
    if (dto.callingBenefit !== undefined) data.callingBenefit = dto.callingBenefit;
    if (dto.smsCount !== undefined) data.smsCount = dto.smsCount;
    if (dto.businessOnly !== undefined) data.businessOnly = dto.businessOnly;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.isValidityOnly !== undefined) data.isValidityOnly = dto.isValidityOnly;
    if (dto.dataBankEnabled !== undefined) data.dataBankEnabled = dto.dataBankEnabled;
    if (dto.rolloverLimitMb !== undefined) data.rolloverLimitMb = dto.rolloverLimitMb;
    if (dto.rolloverExpiryDays !== undefined) data.rolloverExpiryDays = dto.rolloverExpiryDays;
    if (dto.dataTransferEnabled !== undefined) data.dataTransferEnabled = dto.dataTransferEnabled;
    if (dto.transferLimitMb !== undefined) data.transferLimitMb = dto.transferLimitMb;

    const updated = await this.prisma.plan.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            orders: true,
            planSubscriptions: true,
          },
        },
      },
    });

    return updated;
  }

  async togglePlanStatus(id: string) {
    const existing = await this.prisma.plan.findUnique({
      where: { id },
      select: { id: true, isActive: true, name: true },
    });

    if (!existing) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'Recharge plan not found');
    }

    const updated = await this.prisma.plan.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return updated;
  }

  async deletePlan(id: string) {
    const existing = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            planSubscriptions: true,
          },
        },
      },
    });

    if (!existing) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'Recharge plan not found');
    }

    const hasReferences =
      existing._count.orders > 0 || existing._count.planSubscriptions > 0;

    if (hasReferences) {
      // Deactivate instead of hard delete to preserve referential integrity
      const deactivated = await this.prisma.plan.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        success: true,
        deleted: false,
        deactivated: true,
        message: `Plan "${existing.name}" is attached to existing orders or subscriptions. It has been deactivated instead of permanently deleted to preserve audit integrity.`,
        plan: deactivated,
      };
    }

    await this.prisma.plan.delete({
      where: { id },
    });

    return {
      success: true,
      deleted: true,
      deactivated: false,
      message: `Plan "${existing.name}" has been permanently deleted.`,
    };
  }

  async getPlanStats() {
    const [
      total,
      active,
      featured,
      business,
      dataBank,
      dataTransfer,
      prepaid,
      postpaid,
      validityOnly,
    ] = await Promise.all([
      this.prisma.plan.count(),
      this.prisma.plan.count({ where: { isActive: true } }),
      this.prisma.plan.count({ where: { isFeatured: true } }),
      this.prisma.plan.count({ where: { businessOnly: true } }),
      this.prisma.plan.count({ where: { dataBankEnabled: true } }),
      this.prisma.plan.count({ where: { dataTransferEnabled: true } }),
      this.prisma.plan.count({ where: { type: 'PREPAID' } }),
      this.prisma.plan.count({ where: { type: 'POSTPAID' } }),
      this.prisma.plan.count({ where: { type: 'VALIDITY_ONLY' } }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      featured,
      business,
      dataBank,
      dataTransfer,
      prepaid,
      postpaid,
      validityOnly,
    };
  }
}
