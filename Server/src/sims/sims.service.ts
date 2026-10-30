import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/** Unified admin row — a purchased Sim or a travel eSIM order. */
export interface AdminSimRow {
  id: string;
  user: { id: string; name: string; email: string; image: string | null };
  phoneNumber: {
    id: string;
    number: string;
    prefix: string | null;
    type: 'STANDARD' | 'PREMIUM';
  } | null;
  category: 'PERSONAL' | 'BUSINESS';
  technology: 'PHYSICAL' | 'ESIM';
  status:
    | 'PENDING_ACTIVATION'
    | 'READY_TO_INSTALL'
    | 'ACTIVE'
    | 'GRACE_PERIOD'
    | 'PARKED'
    | 'SUSPENDED'
    | 'DEACTIVATED'
    | 'CANCELLED';
  activatedAt: Date | null;
  planExpiredAt: Date | null;
  destinationCountry: string | null;
  reference: string | null;
  activePlan: {
    id: string;
    name: string;
    type: string;
    price: string;
    validityDays: number;
    dataAllowanceGb: string | null;
  } | null;
  organization: { id: string; name: string } | null;
  createdAt: Date;
}

const USER_SELECT = {
  select: { id: true, name: true, email: true, image: true },
} as const;

const ESIM_STATUS_MAP: Record<string, AdminSimRow['status']> = {
  PAID: 'PENDING_ACTIVATION',
  PROCESSING: 'PENDING_ACTIVATION',
  READY_TO_ACTIVATE: 'READY_TO_INSTALL',
  ACTIVATED: 'ACTIVE',
  COMPLETED: 'DEACTIVATED',
  CANCELLED: 'CANCELLED',
  FAILED: 'CANCELLED',
  REFUNDED: 'CANCELLED',
};

@Injectable()
export class SimsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Real SIM fleet for the admin console — physical/eSIM purchases from
   * `Sim` plus paid travel eSIM orders from `TravelEsimOrder`.
   */
  async listSims(): Promise<AdminSimRow[]> {
    const now = new Date();

    // Lazy activation — travel eSIMs due for activation flip to ACTIVATED.
    await this.prisma.travelEsimOrder.updateMany({
      where: { status: 'READY_TO_ACTIVATE', departureDate: { lte: now } },
      data: { status: 'ACTIVATED', activatedAt: now },
    });

    const [sims, travelOrders] = await Promise.all([
      this.prisma.sim.findMany({
        include: {
          user: USER_SELECT,
          phoneNumber: {
            select: { id: true, number: true, prefix: true, type: true },
          },
          organization: { select: { id: true, name: true } },
          numberParkings: {
            where: { status: 'ACTIVE' },
            select: { id: true },
            take: 1,
          },
          planSubscriptions: {
            where: { status: 'ACTIVE' },
            include: {
              plan: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  price: true,
                  validityDays: true,
                  dataAllowanceGb: true,
                },
              },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.travelEsimOrder.findMany({
        where: { status: { notIn: ['PENDING_PAYMENT'] } },
        include: {
          user: USER_SELECT,
          internationalPlan: {
            select: {
              id: true,
              name: true,
              validityDays: true,
              dataAllowanceMb: true,
            },
          },
          phoneNumber: {
            select: { id: true, number: true, prefix: true, type: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const simRows: AdminSimRow[] = sims.map((sim) => {
      const sub = sim.planSubscriptions[0];
      return {
        id: sim.id,
        user: sim.user,
        phoneNumber: sim.phoneNumber,
        category: sim.category,
        technology: sim.technology,
        // An ACTIVE parking holds the number — it must never look like an
        // ordinary lapsed SIM that ops could deactivate or recycle.
        status:
          sim.numberParkings.length > 0
            ? 'PARKED'
            : sim.status === 'LOST'
              ? 'DEACTIVATED'
              : sim.status,
        activatedAt: sim.activatedAt,
        planExpiredAt: sim.planExpiredAt,
        destinationCountry: null,
        reference: null,
        activePlan: sub
          ? {
              id: sub.plan.id,
              name: sub.plan.name,
              type: sub.plan.type,
              price: String(sub.plan.price),
              validityDays: sub.plan.validityDays,
              dataAllowanceGb:
                sub.plan.dataAllowanceGb != null
                  ? String(sub.plan.dataAllowanceGb)
                  : null,
            }
          : null,
        organization: sim.organization,
        createdAt: sim.createdAt,
      };
    });

    const esimRows: AdminSimRow[] = travelOrders.map((o) => ({
      id: o.id,
      user: o.user,
      phoneNumber: o.phoneNumber,
      category: 'PERSONAL',
      technology: 'ESIM',
      status: ESIM_STATUS_MAP[o.status] ?? 'PENDING_ACTIVATION',
      activatedAt: o.activatedAt,
      planExpiredAt: new Date(
        o.departureDate.getTime() +
          o.internationalPlan.validityDays * 24 * 60 * 60 * 1000,
      ),
      destinationCountry: o.destinationCountry,
      reference: o.reference,
      activePlan: {
        id: o.internationalPlan.id,
        name: o.internationalPlan.name,
        type: 'PREPAID',
        price: String(o.amountPaise / 100),
        validityDays: o.internationalPlan.validityDays,
        dataAllowanceGb: String(o.internationalPlan.dataAllowanceMb / 1024),
      },
      organization: null,
      createdAt: o.createdAt,
    }));

    return [...simRows, ...esimRows].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
}
