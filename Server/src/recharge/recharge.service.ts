import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import type { UserModel } from '../generated/prisma/models.js';
import type { CreateRechargeCheckoutDto } from './dto.js';

/** SIM states that can receive a recharge. */
const RECHARGEABLE_SIM_STATUSES = new Set([
  'PENDING_ACTIVATION',
  'ACTIVE',
  'GRACE_PERIOD',
  'SUSPENDED',
]);

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class RechargeService {
  private readonly logger = new Logger(RechargeService.name);
  private _stripe?: Stripe;

  private get stripe(): Stripe {
    if (!this._stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new ApiException(
          500,
          'STRIPE_NOT_CONFIGURED',
          'Stripe is not configured on the server',
        );
      }
      this._stripe = new Stripe(key);
    }
    return this._stripe;
  }

  private get frontendUrl(): string {
    const raw =
      process.env.FRONTEND_URL ??
      process.env.CLIENT_URL ??
      'http://localhost:3000';
    return raw.split(',')[0].trim().replace(/\/+$/, '');
  }

  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // Customer overview — their SIMs with current + queued plan subscriptions
  // -----------------------------------------------------------------------

  async getOverview(userId: string) {
    const sims = await this.prisma.sim.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        phoneNumber: {
          select: { number: true, type: true },
        },
        planSubscriptions: {
          where: { status: { in: ['ACTIVE', 'PENDING'] } },
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                type: true,
                price: true,
                currency: true,
                validityDays: true,
                dataAllowanceGb: true,
                callingBenefit: true,
                smsCount: true,
              },
            },
          },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    const now = new Date();

    // Date-driven lazy transitions — a sub's real state is decided by its
    // start/end dates, so wrong stored statuses are healed on every read:
    //   • end date passed          → EXPIRED
    //   • start date in the future → PENDING (queued)
    //   • window contains now      → ACTIVE
    const expireIds: string[] = [];
    const queueIds: string[] = [];
    const activateIds: string[] = [];
    for (const sim of sims) {
      for (const sub of sim.planSubscriptions) {
        const endsInPast = !!sub.endDate && sub.endDate <= now;
        const startsInFuture = !!sub.startDate && sub.startDate > now;

        if (endsInPast) {
          expireIds.push(sub.id);
          sub.status = 'EXPIRED';
        } else if (startsInFuture && sub.status !== 'PENDING') {
          queueIds.push(sub.id);
          sub.status = 'PENDING';
        } else if (
          !startsInFuture &&
          sub.startDate &&
          sub.status === 'PENDING'
        ) {
          activateIds.push(sub.id);
          sub.status = 'ACTIVE';
        }
      }
    }

    if (expireIds.length || queueIds.length || activateIds.length) {
      await this.prisma.$transaction([
        this.prisma.planSubscription.updateMany({
          where: { id: { in: expireIds } },
          data: { status: 'EXPIRED' },
        }),
        this.prisma.planSubscription.updateMany({
          where: { id: { in: queueIds } },
          data: { status: 'PENDING' },
        }),
        this.prisma.planSubscription.updateMany({
          where: { id: { in: activateIds } },
          data: { status: 'ACTIVE' },
        }),
      ]);
    }

    return {
      sims: sims.map((sim) => {
        const live = sim.planSubscriptions.filter(
          (s) => s.status === 'ACTIVE' || s.status === 'PENDING',
        );
        const currentPlan =
          live.find(
            (s) =>
              s.status === 'ACTIVE' &&
              (!s.startDate || s.startDate <= now) &&
              (!s.endDate || s.endDate > now),
          ) ?? null;
        // Everything live that isn't the current plan waits in the queue —
        // future-start subs are queued even if stored with the wrong status.
        const upcomingPlans = live
          .filter((s) => s.id !== currentPlan?.id)
          .sort(
            (a, b) =>
              (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0),
          );

        return {
          id: sim.id,
          number: sim.phoneNumber.number,
          category: sim.category,
          technology: sim.technology,
          status: sim.status,
          currentPlan,
          upcomingPlans,
        };
      }),
    };
  }

  /**
   * Gift recharge — look up the Zylo customer who owns a full number.
   * Only an exact match is returned so numbers can't be enumerated.
   */
  async lookupRecipient(user: UserModel, number: string) {
    const normalized = number.trim();
    const phone = await this.prisma.phoneNumber.findFirst({
      where: { number: normalized },
      include: {
        sim: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!phone?.sim) {
      throw new ApiException(
        404,
        'NUMBER_NOT_FOUND',
        'No Zylo customer found for that number',
      );
    }
    const sim = phone.sim;
    if (sim.userId === user.id) {
      throw new ApiException(
        400,
        'SELF_RECHARGE',
        "That's your own number — use the normal recharge",
      );
    }
    if (!RECHARGEABLE_SIM_STATUSES.has(sim.status)) {
      throw new ApiException(
        400,
        'SIM_NOT_RECHARGEABLE',
        `That number (${sim.status.toLowerCase().replace(/_/g, ' ')}) can't be recharged right now`,
      );
    }

    return {
      recipient: {
        simId: sim.id,
        name: sim.user.name,
        number: phone.number,
        category: sim.category,
      },
    };
  }

  // -----------------------------------------------------------------------
  // Checkout — order + payment + Stripe session
  // -----------------------------------------------------------------------

  async createCheckout(user: UserModel, dto: CreateRechargeCheckoutDto) {
    let sim:
      | (Prisma.SimGetPayload<{
          include: {
            phoneNumber: { select: { number: true } };
            user: { select: { id: true; name: true } };
          };
        }>)
      | null = null;
    let giftFor: { userId: string; name: string } | null = null;

    if (dto.targetNumber) {
      // Gift recharge — the target SIM is resolved by phone number, not
      // by ownership, and must be rechargeable.
      const phone = await this.prisma.phoneNumber.findFirst({
        where: { number: dto.targetNumber.trim() },
        include: {
          sim: {
            include: {
              phoneNumber: { select: { number: true } },
              user: { select: { id: true, name: true } },
            },
          },
        },
      });
      sim = phone?.sim ?? null;
      if (!sim) {
        throw new ApiException(
          404,
          'NUMBER_NOT_FOUND',
          'No Zylo customer found for that number',
        );
      }
      if (sim.userId === user.id) {
        throw new ApiException(
          400,
          'SELF_RECHARGE',
          "That's your own number — use the normal recharge",
        );
      }
      if (!RECHARGEABLE_SIM_STATUSES.has(sim.status)) {
        throw new ApiException(
          400,
          'SIM_NOT_RECHARGEABLE',
          `That number (${sim.status.toLowerCase().replace(/_/g, ' ')}) can't be recharged right now`,
        );
      }
      giftFor = { userId: sim.user.id, name: sim.user.name };
    } else if (dto.simId) {
      sim = await this.prisma.sim.findFirst({
        where: { id: dto.simId, userId: user.id },
        include: {
          phoneNumber: { select: { number: true } },
          user: { select: { id: true, name: true } },
        },
      });
      if (!sim) {
        throw new ApiException(404, 'SIM_NOT_FOUND', 'SIM not found');
      }
      if (!RECHARGEABLE_SIM_STATUSES.has(sim.status)) {
        throw new ApiException(
          400,
          'SIM_NOT_RECHARGEABLE',
          `This SIM (${sim.status.toLowerCase().replace(/_/g, ' ')}) cannot be recharged`,
        );
      }
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || !plan.isActive) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'Recharge plan not found');
    }
    if (plan.businessOnly && sim?.category !== 'BUSINESS') {
      throw new ApiException(
        400,
        'PLAN_NOT_ELIGIBLE',
        'This plan is restricted to business SIMs',
      );
    }

    const order = await this.prisma.order.create({
      data: {
        userId: user.id,
        type: 'RECHARGE',
        status: 'PENDING',
        amount: plan.price,
        currency: plan.currency,
        simId: sim?.id ?? null,
        planId: plan.id,
        phoneNumberId: sim?.phoneNumberId ?? null,
        rechargedForUserId: giftFor?.userId ?? null,
      },
    });

    const currency = plan.currency.toLowerCase();
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: Math.round(Number(plan.price) * 100),
            product_data: {
              name: giftFor
                ? `Recharge for ${giftFor.name} — ${plan.name}`
                : `Recharge — ${plan.name}`,
              description: sim
                ? `${plan.validityDays} days validity for Zylo number ${sim.phoneNumber.number}`
                : `${plan.validityDays} days validity — new Zylo number assigned on activation`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'recharge',
        orderId: order.id,
        userId: user.id,
        simId: sim?.id ?? '',
        planId: plan.id,
        ...(giftFor ? { rechargedForUserId: giftFor.userId } : {}),
      },
      success_url: `${this.frontendUrl}/recharge?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/recharge?cancelled=true`,
    });

    await this.prisma.payment.create({
      data: {
        userId: user.id,
        orderId: order.id,
        type: 'ONE_TIME',
        status: 'PENDING',
        amount: plan.price,
        currency,
        description: giftFor
          ? `Recharge for ${giftFor.name} (${sim!.phoneNumber.number}) — ${plan.name}`
          : sim
            ? `Recharge — ${plan.name} (${sim.phoneNumber.number})`
            : `Recharge — ${plan.name} (new Zylo number)`,
        stripeCheckoutSessionId: session.id,
      },
    });

    return { sessionId: session.id, url: session.url, orderId: order.id };
  }

  // -----------------------------------------------------------------------
  // Fulfillment — called once Stripe confirms payment (webhook / verify).
  // Stacks the new plan after the SIM's current (or last queued) plan.
  // -----------------------------------------------------------------------

  async fulfillFromCheckoutSession(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      this.logger.warn(
        `Recharge session ${session.id} had no orderId metadata — skipped`,
      );
      return;
    }
    await this.fulfillOrder(orderId);
  }

  async fulfillOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { plan: true, planSubscription: { select: { id: true } } },
    });

    if (!order || order.type !== 'RECHARGE' || !order.planId) {
      this.logger.warn(`Recharge order ${orderId} is missing or invalid`);
      return;
    }

    // Idempotent — a subscription already exists for this order.
    if (order.planSubscription) return;

    const plan = order.plan;
    if (!plan) {
      this.logger.warn(`Recharge order ${orderId} has no plan record`);
      return;
    }

    const now = new Date();
    const validityMs = plan.validityDays * DAY_MS;

    try {
      await this.prisma.$transaction(async (tx) => {
        let simId = order.simId;
        let phoneNumberId: string | null = null;

        // No SIM on the order — this is the customer's first recharge, so
        // provision a Zylo number + SIM and activate it with this plan.
        if (!simId) {
          const number = await this.claimPhoneNumber(tx);
          if (!number) {
            throw new ApiException(
              409,
              'NO_NUMBERS_AVAILABLE',
              'No phone numbers are available to provision a SIM',
            );
          }
          phoneNumberId = number.id;
          const sim = await tx.sim.create({
            data: {
              userId: order.userId,
              phoneNumberId: number.id,
              status: 'ACTIVE',
              activatedAt: now,
            },
          });
          simId = sim.id;
        }

        // Queue the new plan behind whatever is already active/queued on
        // the SIM: it starts at the latest existing end date (or right now
        // when nothing is live anymore).
        const tail = await tx.planSubscription.aggregate({
          where: {
            simId,
            status: { in: ['ACTIVE', 'PENDING'] },
          },
          _max: { endDate: true },
        });

        const startDate =
          tail._max.endDate && tail._max.endDate > now
            ? tail._max.endDate
            : now;
        const endDate = new Date(startDate.getTime() + validityMs);

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'COMPLETED',
            simId,
            ...(phoneNumberId ? { phoneNumberId } : {}),
          },
        });
        await tx.planSubscription.create({
          data: {
            simId,
            planId: plan.id,
            orderId: order.id,
            status: startDate <= now ? 'ACTIVE' : 'PENDING',
            startDate,
            endDate,
          },
        });
        await tx.sim.update({
          where: { id: simId },
          data: { planExpiredAt: endDate },
        });

        // Gift recharge — notify both sides: the recipient (someone paid
        // for you) and the payer (you recharged them).
        if (order.rechargedForUserId) {
          const [payer, recipient, sim] = await Promise.all([
            tx.user.findUnique({
              where: { id: order.userId },
              select: { name: true },
            }),
            tx.user.findUnique({
              where: { id: order.rechargedForUserId },
              select: { name: true },
            }),
            tx.sim.findUnique({
              where: { id: simId },
              select: { phoneNumber: { select: { number: true } } },
            }),
          ]);
          const number = sim?.phoneNumber.number ?? '';
          const starts =
            startDate <= now
              ? 'active now'
              : `starts ${startDate.toDateString()}`;
          await tx.notification.createMany({
            data: [
              {
                userId: order.rechargedForUserId,
                title: 'Recharge received',
                message: `${payer?.name ?? 'Someone'} recharged your Zylo number ${number} with ${plan.name} (₹${Number(plan.price)} · ${plan.validityDays} days) — ${starts}.`,
              },
              {
                userId: order.userId,
                title: 'Gift recharge sent',
                message: `You recharged ${recipient?.name ?? 'a customer'}'s Zylo number ${number} with ${plan.name} (₹${Number(plan.price)} · ${plan.validityDays} days) — ${starts}.`,
              },
            ],
          });
        }
      });
    } catch (err) {
      // Unique constraint on planSubscription.orderId — already fulfilled
      // by a concurrent webhook/verify call.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return;
      }
      throw err;
    }
  }

  /**
   * Atomically claim one inventory phone number — prefers STANDARD numbers
   * and falls back to PREMIUM when nothing else is available.
   */
  private async claimPhoneNumber(tx: Prisma.TransactionClient) {
    for (const type of ['STANDARD', 'PREMIUM'] as const) {
      const candidates = await tx.phoneNumber.findMany({
        where: {
          status: 'AVAILABLE',
          type,
          // Domestic pool only — never claim a travel eSIM destination
          // number or a corporate-prefixed business number for a SIM.
          countryCode: 'IN',
          organizationId: null,
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
        select: { id: true },
      });
      for (const candidate of candidates) {
        const claimed = await tx.phoneNumber.updateMany({
          where: { id: candidate.id, status: 'AVAILABLE' },
          data: { status: 'ASSIGNED' },
        });
        if (claimed.count === 1) return candidate;
      }
    }
    return null;
  }
}
