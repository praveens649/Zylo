import { Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { getStripeClient } from '../stripe/stripe-client.js';
import { returnBase } from '../set-top-box/tv-checkout.service.js';
import { validateIndianMobileNumber } from '../numbers/numbers-generator.engine.js';
import { SYSTEM_ROLE } from '../common/constants.js';
import { ParkingCarrierClient } from './parking-carrier.js';
import { parkingConfig, periodForDays } from './parking.config.js';
import type { UserModel } from '../generated/prisma/models.js';
import type {
  CreateParkingCheckoutDto,
  ExtendParkingDto,
} from './dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** SIM states from which a number may be parked. */
const PARKABLE_SIM_STATUSES = new Set(['ACTIVE', 'GRACE_PERIOD']);

const PARKING_ORDER_TYPES = new Set([
  'NUMBER_PARKING',
  'NUMBER_PARKING_EXTENSION',
]);

const parkingInclude = {
  phoneNumber: { select: { number: true } },
  sim: {
    select: {
      id: true,
      userId: true,
      category: true,
      status: true,
      organizationId: true,
    },
  },
  organization: { select: { id: true, name: true, numberPrefix: true } },
} satisfies Prisma.NumberParkingInclude;

type ParkingWithRefs = Prisma.NumberParkingGetPayload<{
  include: typeof parkingInclude;
}>;

type Tx = Prisma.TransactionClient;

/** Normalize a user-typed Indian mobile number to E.164 (+91XXXXXXXXXX). */
export function normalizeIndianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91'))
    return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0'))
    return `+91${digits.slice(1)}`;
  return null;
}

async function notify(tx: Tx, userId: string, title: string, message: string) {
  await tx.notification.create({ data: { userId, title, message } });
}

@Injectable()
export class ParkingService {
  private readonly logger = new Logger(ParkingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly carrier: ParkingCarrierClient,
  ) {}

  // ---------------------------------------------------------------------
  // Config exposed to the client — never trust client-supplied prices.
  // ---------------------------------------------------------------------

  getPublicConfig() {
    return {
      periods: parkingConfig.periods,
      processingFeeInr: parkingConfig.processingFeeInr,
      maxExtensions: parkingConfig.maxExtensions,
      currency: parkingConfig.currency,
      carrierIntegrated: this.carrier.isConfigured,
    };
  }

  // ---------------------------------------------------------------------
  // Ownership / permission resolution
  // ---------------------------------------------------------------------

  /**
   * Personal numbers: only the SIM's owning user manages them.
   * Business numbers: the SIM owner, plus ACTIVE org members with the
   * OWNER or ADMIN role. Membership is resolved server-side — never from
   * client-supplied claims.
   */
  private async manageableOrganizationIds(
    userId: string,
  ): Promise<Set<string>> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'ADMIN'] },
      },
      select: { organizationId: true },
    });
    return new Set(memberships.map((m) => m.organizationId));
  }

  private async canManageSim(
    user: UserModel,
    sim: {
      userId: string;
      organizationId: string | null;
    },
  ): Promise<boolean> {
    if (user.role === SYSTEM_ROLE) return true;
    if (sim.userId === user.id) return true;
    if (!sim.organizationId) return false;
    const orgIds = await this.manageableOrganizationIds(user.id);
    return orgIds.has(sim.organizationId);
  }

  // ---------------------------------------------------------------------
  // Step 1 — number validation / eligibility
  // ---------------------------------------------------------------------

  async validateNumber(user: UserModel, rawNumber: string) {
    const fail = (
      code: string,
      reason: string,
      checks: { label: string; passed: boolean }[] = [],
    ) => ({
      eligible: false as const,
      code,
      reason,
      number: normalizeIndianMobile(rawNumber),
      checks,
      simulated: !this.carrier.isConfigured,
    });

    const number = normalizeIndianMobile(rawNumber);
    if (!number || !/^\+91\d{10}$/.test(number)) {
      return fail(
        'INVALID_NUMBER_FORMAT',
        'Enter a valid 10-digit Indian mobile number (e.g. +91 98765 43210)',
      );
    }

    const phoneNumber = await this.prisma.phoneNumber.findUnique({
      where: { number },
      include: {
        sim: {
          select: {
            id: true,
            userId: true,
            category: true,
            status: true,
            organizationId: true,
            planSubscriptions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                status: true,
                startDate: true,
                endDate: true,
                plan: { select: { name: true } },
              },
            },
          },
        },
        organization: {
          select: { id: true, name: true, numberPrefix: true },
        },
      },
    });

    if (!phoneNumber?.sim) {
      return fail(
        'NOT_A_ZYLO_NUMBER',
        'This number is not an active Zylo number. You can only park numbers on your Zylo SIMs.',
      );
    }

    if (phoneNumber.countryCode !== 'IN') {
      return fail(
        'NOT_PARKABLE_NUMBER',
        'Only Indian mobile numbers can be parked.',
      );
    }

    const sim = phoneNumber.sim;
    const isBusiness = sim.category === 'BUSINESS';

    const formatCheck = validateIndianMobileNumber(
      number,
      isBusiness,
      phoneNumber.organization?.numberPrefix ?? undefined,
    );
    if (!formatCheck.isValid) {
      return fail(
        'INVALID_NUMBER_FORMAT',
        formatCheck.error ?? 'Invalid mobile number',
      );
    }

    if (!(await this.canManageSim(user, sim))) {
      return fail(
        'NOT_YOUR_NUMBER',
        'This number is not linked to your account. You can only park your own numbers.',
      );
    }

    const checks = [
      { label: 'Valid number', passed: true },
      { label: 'Eligible for parking', passed: true },
      {
        label: `Can be parked for ${parkingConfig.periods
          .map((p) => p.days)
          .join(' or ')} days`,
        passed: true,
      },
    ];

    if (!PARKABLE_SIM_STATUSES.has(sim.status)) {
      return fail(
        'NUMBER_NOT_ELIGIBLE',
        `This number cannot be parked right now — the SIM is ${sim.status
          .toLowerCase()
          .replace(/_/g, ' ')}.`,
        checks.map((c) => ({ ...c, passed: false })),
      );
    }

    const existing = await this.prisma.numberParking.findFirst({
      where: {
        simId: sim.id,
        status: { in: ['PENDING_PAYMENT', 'ACTIVE'] },
      },
      select: { status: true },
    });
    if (existing?.status === 'ACTIVE') {
      return fail(
        'ALREADY_PARKED',
        'This number is already parked. Manage it from your Number Vault.',
      );
    }
    if (existing) {
      return fail(
        'PARKING_IN_PROGRESS',
        'A parking request for this number is awaiting payment. Complete or cancel it from the Number Vault.',
      );
    }

    // Parking is for numbers that are not in use — a live or queued plan
    // means the number still has paid validity, so it cannot be parked yet.
    const now = new Date();
    const latestSub = sim.planSubscriptions?.[0];
    const planEndsAt = latestSub?.endDate ?? null;
    const hasLivePlan =
      !!latestSub &&
      (latestSub.status === 'PENDING' ||
        (latestSub.status === 'ACTIVE' &&
          (!planEndsAt || planEndsAt > now)));
    const planStatus = !latestSub
      ? 'NONE'
      : hasLivePlan
        ? 'ACTIVE'
        : 'EXPIRED';

    if (hasLivePlan) {
      return fail(
        'PLAN_STILL_ACTIVE',
        `${latestSub?.plan?.name ?? 'Your plan'} is still active${
          planEndsAt ? ` until ${planEndsAt.toDateString()}` : ''
        }. You can park this number once its validity ends.`,
        checks,
      );
    }

    const carrier = await this.carrier.checkParkable(number);
    if (!carrier.eligible) {
      return fail(
        'CARRIER_REJECTED',
        carrier.reason ?? 'This number is not eligible for parking.',
        checks.map((c) => ({ ...c, passed: false })),
      );
    }

    return {
      eligible: true as const,
      number,
      category: sim.category,
      organizationName: phoneNumber.organization?.name ?? null,
      simStatus: sim.status,
      plan: {
        status: planStatus,
        name: planStatus === 'NONE' ? null : (latestSub?.plan.name ?? null),
        endsAt: planEndsAt,
      },
      checks,
      simulated: carrier.simulated,
    };
  }

  // ---------------------------------------------------------------------
  // Step 2 — checkout: parking record + order + Stripe session
  // ---------------------------------------------------------------------

  async createCheckout(
    user: UserModel,
    dto: CreateParkingCheckoutDto,
    origin?: string,
  ) {
    const eligibility = await this.validateNumber(user, dto.number);
    if (!eligibility.eligible) {
      throw new ApiException(
        400,
        eligibility.code ?? 'NUMBER_NOT_ELIGIBLE',
        eligibility.reason ?? 'This number cannot be parked',
      );
    }

    const period = periodForDays(dto.durationDays);
    if (!period) {
      throw new ApiException(
        400,
        'INVALID_PARKING_PERIOD',
        `Parking period must be one of: ${parkingConfig.periods
          .map((p) => `${p.days} days`)
          .join(', ')}`,
      );
    }

    const phoneNumber = await this.prisma.phoneNumber.findUniqueOrThrow({
      where: { number: eligibility.number },
      select: { id: true, sim: { select: { id: true, organizationId: true } } },
    });
    const sim = phoneNumber.sim!;

    const amount = period.priceInr + parkingConfig.processingFeeInr;

    const created = await this.prisma.$transaction(async (tx) => {
      // A retry replaces any abandoned unpaid parking for the same SIM.
      await this.cancelStaleParking(tx, sim.id);

      const parking = await tx.numberParking.create({
        data: {
          userId: user.id,
          simId: sim.id,
          phoneNumberId: phoneNumber.id,
          organizationId: sim.organizationId,
          durationDays: period.days,
        },
      });

      const order = await tx.order.create({
        data: {
          userId: user.id,
          type: 'NUMBER_PARKING',
          status: 'PENDING',
          amount,
          currency: parkingConfig.currency,
          simId: sim.id,
          phoneNumberId: phoneNumber.id,
          organizationId: sim.organizationId,
          numberParkingId: parking.id,
        },
      });

      return { parking, order };
    });

    try {
      const session = await this.openSession(
        user,
        {
          kind: 'initial',
          orderId: created.order.id,
          parkingId: created.parking.id,
        },
        amount,
        `Number Parking — ${period.days} days`,
        `Park ${eligibility.number} for ${period.days} days`,
        origin,
      );
      await this.prisma.payment.create({
        data: {
          userId: user.id,
          orderId: created.order.id,
          type: 'ONE_TIME',
          status: 'PENDING',
          amount,
          currency: parkingConfig.currency,
          description: `Number Parking — ${eligibility.number} (${period.days} days)`,
          stripeCheckoutSessionId: session.id,
        },
      });
      return {
        sessionId: session.id,
        url: session.url,
        orderId: created.order.id,
        parkingId: created.parking.id,
      };
    } catch (err) {
      await this.cancelUnpaid(created.order.id, created.parking.id);
      throw err;
    }
  }

  // ---------------------------------------------------------------------
  // Extension checkout
  // ---------------------------------------------------------------------

  async createExtensionCheckout(
    user: UserModel,
    parkingId: string,
    dto: ExtendParkingDto,
    origin?: string,
  ) {
    const parking = await this.ownedParking(user, parkingId);
    await this.expireIfDue([parking]);

    const now = new Date();
    if (parking.status !== 'ACTIVE' || !parking.expiresAt) {
      throw new ApiException(
        409,
        'PARKING_NOT_ACTIVE',
        'Only an active parking can be extended',
      );
    }
    if (parking.expiresAt <= now) {
      throw new ApiException(
        409,
        'PARKING_EXPIRED',
        'This parking has expired — it can no longer be extended',
      );
    }
    if (parking.extensionsUsed >= parkingConfig.maxExtensions) {
      throw new ApiException(
        409,
        'EXTENSION_LIMIT_REACHED',
        `This number has already used all ${parkingConfig.maxExtensions} extensions`,
      );
    }

    const period = periodForDays(dto.durationDays);
    if (!period) {
      throw new ApiException(
        400,
        'INVALID_PARKING_PERIOD',
        `Extension period must be one of: ${parkingConfig.periods
          .map((p) => `${p.days} days`)
          .join(', ')}`,
      );
    }

    const amount = period.priceInr + parkingConfig.processingFeeInr;

    const created = await this.prisma.$transaction(async (tx) => {
      // Replace abandoned unpaid extension checkouts.
      const stale = await tx.order.findMany({
        where: {
          numberParkingId: parking.id,
          type: 'NUMBER_PARKING_EXTENSION',
          status: 'PENDING',
        },
        select: { id: true },
      });
      if (stale.length) {
        const staleIds = stale.map((o) => o.id);
        await tx.order.updateMany({
          where: { id: { in: staleIds } },
          data: { status: 'CANCELLED' },
        });
        await tx.payment.updateMany({
          where: { orderId: { in: staleIds }, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        await tx.numberParkingExtension.deleteMany({
          where: { orderId: { in: staleIds } },
        });
      }

      const order = await tx.order.create({
        data: {
          userId: user.id,
          type: 'NUMBER_PARKING_EXTENSION',
          status: 'PENDING',
          amount,
          currency: parkingConfig.currency,
          simId: parking.simId,
          phoneNumberId: parking.phoneNumberId,
          organizationId: parking.organizationId,
          numberParkingId: parking.id,
        },
      });
      await tx.numberParkingExtension.create({
        data: {
          parkingId: parking.id,
          orderId: order.id,
          durationDays: period.days,
          previousExpiresAt: parking.expiresAt!,
          newExpiresAt: new Date(
            parking.expiresAt!.getTime() + period.days * DAY_MS,
          ),
        },
      });
      return { order };
    });

    try {
      const session = await this.openSession(
        user,
        {
          kind: 'extension',
          orderId: created.order.id,
          parkingId: parking.id,
        },
        amount,
        `Number Parking Extension — ${period.days} days`,
        `Extend parking for ${parking.phoneNumber.number} by ${period.days} days`,
        origin,
      );
      await this.prisma.payment.create({
        data: {
          userId: user.id,
          orderId: created.order.id,
          type: 'ONE_TIME',
          status: 'PENDING',
          amount,
          currency: parkingConfig.currency,
          description: `Parking extension — ${parking.phoneNumber.number} (+${period.days} days)`,
          stripeCheckoutSessionId: session.id,
        },
      });
      return {
        sessionId: session.id,
        url: session.url,
        orderId: created.order.id,
        parkingId: parking.id,
      };
    } catch (err) {
      await this.prisma.$transaction(async (tx) => {
        await tx.numberParkingExtension.deleteMany({
          where: { orderId: created.order.id },
        });
        await tx.order.updateMany({
          where: { id: created.order.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
      });
      throw err;
    }
  }

  // ---------------------------------------------------------------------
  // Fulfillment — runs only after Stripe confirms payment.
  // Idempotent: safe for duplicate webhooks and the verify fallback.
  // ---------------------------------------------------------------------

  async fulfillFromCheckoutSession(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      this.logger.warn(
        `Parking session ${session.id} had no orderId metadata — skipped`,
      );
      return;
    }
    await this.fulfillOrder(orderId);
  }

  async fulfillOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        numberParking: {
          include: { phoneNumber: { select: { number: true } } },
        },
      },
    });

    if (
      !order ||
      !PARKING_ORDER_TYPES.has(order.type) ||
      !order.numberParking
    ) {
      this.logger.warn(`Parking order ${orderId} is missing or invalid`);
      return;
    }

    const now = new Date();
    const parking = order.numberParking;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Atomic claim — a second webhook/verify call finds the order
        // already COMPLETED and exits without touching the parking.
        const claimed = await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING' },
          data: { status: 'COMPLETED' },
        });
        if (claimed.count === 0) return;

        if (order.type === 'NUMBER_PARKING') {
          const activated = await tx.numberParking.updateMany({
            where: { id: parking.id, status: 'PENDING_PAYMENT' },
            data: {
              status: 'ACTIVE',
              parkedAt: now,
              expiresAt: new Date(now.getTime() + parking.durationDays * DAY_MS),
            },
          });
          if (activated.count === 0) {
            throw new ApiException(
              409,
              'PARKING_STATE_CONFLICT',
              `Parking ${parking.id} is not awaiting payment`,
            );
          }
          await notify(
            tx,
            order.userId,
            'Number parked successfully',
            `${parking.phoneNumber.number} is parked for ${parking.durationDays} days until ${new Date(
              now.getTime() + parking.durationDays * DAY_MS,
            ).toDateString()}.`,
          );
        } else {
          const extension = await tx.numberParkingExtension.findUnique({
            where: { orderId: order.id },
          });
          if (!extension) {
            throw new ApiException(
              500,
              'PARKING_STATE_CONFLICT',
              `Extension record missing for order ${order.id}`,
            );
          }
          const fresh = await tx.numberParking.findUniqueOrThrow({
            where: { id: parking.id },
          });
          const base =
            fresh.expiresAt && fresh.expiresAt > now ? fresh.expiresAt : now;
          const newExpiry = new Date(
            base.getTime() + extension.durationDays * DAY_MS,
          );
          await tx.numberParking.update({
            where: { id: parking.id },
            data: {
              status: 'ACTIVE',
              expiresAt: newExpiry,
              extensionsUsed: { increment: 1 },
            },
          });
          await tx.numberParkingExtension.update({
            where: { id: extension.id },
            data: { previousExpiresAt: base, newExpiresAt: newExpiry },
          });
          await notify(
            tx,
            order.userId,
            'Parking extended',
            `${parking.phoneNumber.number} parking extended by ${extension.durationDays} days until ${newExpiry.toDateString()}.`,
          );
        }
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return;
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------
  // Number Vault
  // ---------------------------------------------------------------------

  async getVault(user: UserModel) {
    const orgIds = await this.manageableOrganizationIds(user.id);
    const admin = user.role === SYSTEM_ROLE;

    const parkings = await this.prisma.numberParking.findMany({
      where: admin
        ? {}
        : {
            OR: [
              { userId: user.id },
              { organizationId: { in: [...orgIds] } },
            ],
          },
      orderBy: { createdAt: 'desc' },
      include: {
        ...parkingInclude,
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            payment: {
              select: {
                status: true,
                paidAt: true,
                stripeCheckoutSessionId: true,
              },
            },
          },
        },
        extensions: { orderBy: { createdAt: 'asc' } },
      },
    });

    await this.expireIfDue(parkings);

    return {
      config: this.getPublicConfig(),
      parkings: parkings.map((p) => this.toVaultItem(p)),
    };
  }

  async getParking(user: UserModel, parkingId: string) {
    const parking = await this.ownedParking(user, parkingId);
    await this.expireIfDue([parking]);
    const fresh = await this.prisma.numberParking.findUniqueOrThrow({
      where: { id: parking.id },
      include: {
        ...parkingInclude,
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            payment: {
              select: {
                status: true,
                paidAt: true,
                stripeCheckoutSessionId: true,
              },
            },
          },
        },
        extensions: { orderBy: { createdAt: 'asc' } },
      },
    });
    return this.toVaultItem(fresh);
  }

  // ---------------------------------------------------------------------
  // Reactivation
  // ---------------------------------------------------------------------

  async reactivate(user: UserModel, parkingId: string) {
    const parking = await this.ownedParking(user, parkingId);
    await this.expireIfDue([parking]);

    if (parking.status !== 'ACTIVE') {
      throw new ApiException(
        409,
        'PARKING_NOT_ACTIVE',
        `This parking is ${parking.status
          .toLowerCase()
          .replace(/_/g, ' ')} and cannot be reactivated`,
      );
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.numberParking.updateMany({
        where: { id: parking.id, status: 'ACTIVE' },
        data: { status: 'REACTIVATED', reactivatedAt: now },
      });
      if (updated.count === 0) {
        throw new ApiException(
          409,
          'PARKING_STATE_CONFLICT',
          'This parking was already reactivated or expired',
        );
      }
      await notify(
        tx,
        user.id,
        'Number reactivated',
        `${parking.phoneNumber.number} was reactivated from parking.`,
      );
    });

    return { status: 'REACTIVATED', reactivatedAt: now };
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  private async ownedParking(user: UserModel, parkingId: string) {
    const parking = await this.prisma.numberParking.findUnique({
      where: { id: parkingId },
      include: parkingInclude,
    });
    if (!parking) {
      throw new ApiException(404, 'PARKING_NOT_FOUND', 'Parking not found');
    }
    const allowed =
      user.role === SYSTEM_ROLE ||
      (await this.canManageSim(user, {
        userId: parking.userId,
        organizationId: parking.organizationId,
      })) ||
      parking.sim.userId === user.id;
    if (!allowed) {
      throw new ApiException(
        403,
        'FORBIDDEN',
        'You can only manage your own parked numbers',
      );
    }
    return parking;
  }

  /** Flip ACTIVE parkings whose expiry has passed to EXPIRED. */
  private async expireIfDue(
    parkings: { id: string; status: string; expiresAt: Date | null }[],
  ) {
    const now = new Date();
    const due = parkings
      .filter(
        (p) => p.status === 'ACTIVE' && p.expiresAt && p.expiresAt <= now,
      )
      .map((p) => p.id);
    if (!due.length) return;
    await this.prisma.numberParking.updateMany({
      where: { id: { in: due }, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });
    for (const p of parkings) {
      if (due.includes(p.id)) p.status = 'EXPIRED';
    }
  }

  /** Cancel abandoned PENDING_PAYMENT parkings for a SIM (+ their orders). */
  private async cancelStaleParking(tx: Tx, simId: string) {
    const stale = await tx.numberParking.findMany({
      where: { simId, status: 'PENDING_PAYMENT' },
      select: { id: true },
    });
    if (!stale.length) return;
    const staleIds = stale.map((p) => p.id);
    const staleOrders = await tx.order.findMany({
      where: { numberParkingId: { in: staleIds }, status: 'PENDING' },
      select: { id: true },
    });
    if (staleOrders.length) {
      await tx.payment.updateMany({
        where: {
          orderId: { in: staleOrders.map((o) => o.id) },
          status: 'PENDING',
        },
        data: { status: 'CANCELLED' },
      });
      await tx.order.updateMany({
        where: { id: { in: staleOrders.map((o) => o.id) } },
        data: { status: 'CANCELLED' },
      });
    }
    await tx.numberParking.updateMany({
      where: { id: { in: staleIds } },
      data: { status: 'CANCELLED' },
    });
  }

  /** Roll back a freshly created parking checkout when Stripe session fails. */
  private async cancelUnpaid(orderId: string, parkingId: string) {
    await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (cancelled.count === 0) return;
      await tx.numberParking.updateMany({
        where: { id: parkingId, status: 'PENDING_PAYMENT' },
        data: { status: 'CANCELLED' },
      });
    });
  }

  private stripeOrThrow() {
    const stripe = getStripeClient();
    if (!stripe) {
      throw new ApiException(
        503,
        'STRIPE_NOT_CONFIGURED',
        'Payments are not configured on this server',
      );
    }
    return stripe;
  }

  private async openSession(
    user: UserModel,
    meta: { kind: 'initial' | 'extension'; orderId: string; parkingId: string },
    amountInr: number,
    name: string,
    description: string,
    origin?: string,
  ) {
    const stripe = this.stripeOrThrow();
    const base = returnBase(origin);
    const unitAmount = Math.round(amountInr * 100);
    if (unitAmount <= 0) {
      throw new ApiException(
        400,
        'INVALID_AMOUNT',
        'Amount must be greater than zero',
      );
    }

    const metadata = {
      type: 'number_parking',
      kind: meta.kind,
      orderId: meta.orderId,
      parkingId: meta.parkingId,
      userId: user.id,
    };

    try {
      return await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        client_reference_id: user.id,
        line_items: [
          {
            price_data: {
              currency: parkingConfig.currency,
              unit_amount: unitAmount,
              product_data: { name, description },
            },
            quantity: 1,
          },
        ],
        metadata,
        payment_intent_data: { metadata },
        success_url: `${base}/number-vault?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/parking?cancelled=true`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ApiException(
        502,
        'STRIPE_API_FAILED',
        `Stripe operation failed: ${msg}`,
      );
    }
  }

  private toVaultItem(
    p: ParkingWithRefs & {
      orders?: {
        id: string;
        type: string;
        status: string;
        amount: Prisma.Decimal;
        currency: string;
        createdAt: Date;
        payment: {
          status: string;
          paidAt: Date | null;
          stripeCheckoutSessionId: string | null;
        } | null;
      }[];
      extensions?: {
        id: string;
        durationDays: number;
        previousExpiresAt: Date;
        newExpiresAt: Date;
        createdAt: Date;
      }[];
    },
  ) {
    const now = new Date();
    const remainingDays =
      p.status === 'ACTIVE' && p.expiresAt && p.expiresAt > now
        ? Math.ceil((p.expiresAt.getTime() - now.getTime()) / DAY_MS)
        : 0;

    return {
      id: p.id,
      reference: p.reference,
      number: p.phoneNumber.number,
      category: p.sim.category,
      organizationName: p.organization?.name ?? null,
      status: p.status,
      durationDays: p.durationDays,
      parkedAt: p.parkedAt,
      expiresAt: p.expiresAt,
      remainingDays,
      extensionsUsed: p.extensionsUsed,
      maxExtensions: parkingConfig.maxExtensions,
      canExtend:
        p.status === 'ACTIVE' &&
        p.extensionsUsed < parkingConfig.maxExtensions,
      canReactivate: p.status === 'ACTIVE',
      reactivatedAt: p.reactivatedAt,
      extensions: (p.extensions ?? []).map((e) => ({
        id: e.id,
        durationDays: e.durationDays,
        previousExpiresAt: e.previousExpiresAt,
        newExpiresAt: e.newExpiresAt,
        createdAt: e.createdAt,
      })),
      orders: (p.orders ?? []).map((o) => ({
        id: o.id,
        type: o.type,
        status: o.status,
        amount: o.amount.toString(),
        currency: o.currency,
        paymentStatus: o.payment?.status ?? null,
        paidAt: o.payment?.paidAt ?? null,
        createdAt: o.createdAt,
      })),
      createdAt: p.createdAt,
    };
  }
}
