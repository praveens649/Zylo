import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import type { CreateMusicPlanDto, UpdateMusicPlanDto } from './dto.js';

/** SUPER_ADMIN — music plan catalog + subscription visibility. */
@Injectable()
export class MusicAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** All plans, including disabled ones. */
  async listPlans() {
    return this.prisma.musicPlan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createPlan(dto: CreateMusicPlanDto) {
    return this.prisma.musicPlan.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price,
        currency: dto.currency ?? 'inr',
        validityDays: dto.validityDays ?? 30,
        audioQuality: dto.audioQuality ?? 'standard',
        maxDevices: dto.maxDevices ?? 1,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updatePlan(id: string, dto: UpdateMusicPlanDto) {
    const plan = await this.prisma.musicPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'Music plan not found');
    }
    return this.prisma.musicPlan.update({ where: { id }, data: dto });
  }

  /**
   * Delete only when nothing references the plan; otherwise deactivate so
   * historical subscriptions stay readable (same rule as WiFi plans).
   */
  async deletePlan(id: string) {
    const plan = await this.prisma.musicPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'Music plan not found');
    }
    const used = await this.prisma.musicSubscription.count({ where: { planId: id } });
    if (used > 0) {
      await this.prisma.musicPlan.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.musicPlan.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  async listSubscriptions() {
    const rows = await this.prisma.musicSubscription.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { id: true, name: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((s) => ({
      id: s.id,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      createdAt: s.createdAt,
      user: s.user,
      plan: s.plan,
    }));
  }
}
