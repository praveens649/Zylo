import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { decryptSecret, encryptSecret } from './crypto.js';
import type { UserModel } from '../generated/prisma/models.js';
import type {
  AdminListNumbersQueryDto,
  CreateInternationalPlanDto,
  GenerateEsimNumbersDto,
  ListEsimNumbersQueryDto,
  ListTravelPlansQueryDto,
  TravelEsimCheckoutDto,
  UpdateInternationalPlanDto,
} from './dto.js';

const NUMBER_HOLD_MINUTES = 15;

/** Local dialling prefixes used when generating demo numbers per country. */
const COUNTRY_PREFIX: Record<string, { prefix: string; dial: string }> = {
  SG: { prefix: '+65', dial: '8' },
  AE: { prefix: '+971', dial: '5' },
  TH: { prefix: '+66', dial: '6' },
  US: { prefix: '+1', dial: '415 555' },
  GB: { prefix: '+44', dial: '7' },
  JP: { prefix: '+81', dial: '90' },
  IN: { prefix: '+91', dial: '9' },
};

const SESSION_TYPE = 'travel_esim';

@Injectable()
export class TravelEsimService {
  private readonly logger = new Logger(TravelEsimService.name);
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
  // Catalog
  // -----------------------------------------------------------------------

  /** Countries that have at least one active travel plan. */
  async listDestinations() {
    const grouped = await this.prisma.internationalPlan.groupBy({
      by: ['destinationCountry'],
      where: { isActive: true },
      _count: { id: true },
      _min: { pricePaise: true },
      orderBy: { destinationCountry: 'asc' },
    });

    return {
      destinations: grouped.map((g) => ({
        country: g.destinationCountry,
        planCount: g._count.id,
        fromPricePaise: g._min.pricePaise,
      })),
    };
  }

  async listPlans(query: ListTravelPlansQueryDto, isAdmin = false) {
    const plans = await this.prisma.internationalPlan.findMany({
      where: {
        ...(isAdmin ? {} : { isActive: true }),
        ...(query.destinationCountry
          ? { destinationCountry: query.destinationCountry }
          : {}),
      },
      orderBy: [{ destinationCountry: 'asc' }, { pricePaise: 'asc' }],
      include: isAdmin ? { _count: { select: { orders: true } } } : undefined,
    });
    return { plans };
  }

  // -----------------------------------------------------------------------
  // Destination numbers — click-to-hold (10 min), attached at checkout
  // -----------------------------------------------------------------------

  private async releaseExpiredHolds() {
    await this.prisma.phoneNumber.updateMany({
      where: {
        status: 'RESERVED',
        reservedUntil: { lt: new Date() },
      },
      data: { status: 'AVAILABLE', reservedUntil: null, reservedByUserId: null },
    });
  }

  /** Numbers available in a destination country (plus the caller's own holds). */
  async listCountryNumbers(userId: string, query: ListEsimNumbersQueryDto) {
    await this.releaseExpiredHolds();
    const numbers = await this.prisma.phoneNumber.findMany({
      where: {
        countryCode: query.country,
        organizationId: null,
        OR: [
          { status: 'AVAILABLE' },
          { status: 'RESERVED', reservedByUserId: userId },
        ],
      },
      orderBy: [{ type: 'desc' }, { number: 'asc' }],
      take: 30,
      select: {
        id: true,
        number: true,
        prefix: true,
        type: true,
        status: true,
        reservedUntil: true,
        reservedByUserId: true,
      },
    });
    return { numbers };
  }

  /**
   * Hold a number for the caller — expires automatically after 15 minutes.
   * The update is atomic (WHERE status = AVAILABLE or reserved-by-me), so if
   * two customers click the same number at once only the first wins.
   */
  async holdNumber(user: UserModel, numberId: string) {
    await this.releaseExpiredHolds();
    const num = await this.prisma.phoneNumber.findUnique({
      where: { id: numberId },
      select: { id: true, number: true },
    });
    if (!num) {
      throw new ApiException(
        404,
        'PHONE_NUMBER_NOT_FOUND',
        'Phone number not found',
      );
    }

    const now = new Date();
    const reservedUntil = new Date(
      now.getTime() + NUMBER_HOLD_MINUTES * 60 * 1000,
    );
    const { count } = await this.prisma.phoneNumber.updateMany({
      where: {
        id: numberId,
        OR: [
          { status: 'AVAILABLE' },
          {
            status: 'RESERVED',
            reservedByUserId: user.id,
            reservedUntil: { gt: now },
          },
        ],
      },
      data: {
        status: 'RESERVED',
        reservedUntil,
        reservedByUserId: user.id,
      },
    });
    if (count === 0) {
      throw new ApiException(
        409,
        'NUMBER_NOT_AVAILABLE',
        'Someone else grabbed this number — pick another one',
      );
    }

    return {
      number: num.number,
      numberId: num.id,
      holdMinutes: NUMBER_HOLD_MINUTES,
      reservedUntil,
    };
  }

  /** Release the caller's own hold back to the pool. */
  async releaseHold(user: UserModel, numberId: string) {
    const num = await this.prisma.phoneNumber.findUnique({
      where: { id: numberId },
    });
    if (!num) {
      throw new ApiException(
        404,
        'PHONE_NUMBER_NOT_FOUND',
        'Phone number not found',
      );
    }
    if (num.status === 'RESERVED' && num.reservedByUserId === user.id) {
      await this.prisma.phoneNumber.update({
        where: { id: num.id },
        data: {
          status: 'AVAILABLE',
          reservedUntil: null,
          reservedByUserId: null,
        },
      });
    }
    return { released: true };
  }

  private async releaseHeldNumber(numberId: string | null | undefined) {
    if (!numberId) return;
    await this.prisma.phoneNumber
      .updateMany({
        where: { id: numberId, status: 'RESERVED' },
        data: {
          status: 'AVAILABLE',
          reservedUntil: null,
          reservedByUserId: null,
        },
      })
      .catch(() => {});
  }

  // -----------------------------------------------------------------------
  // Checkout
  // -----------------------------------------------------------------------

  async createCheckout(user: UserModel, dto: TravelEsimCheckoutDto) {
    const plan = await this.prisma.internationalPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || !plan.isActive) {
      throw new ApiException(
        404,
        'PLAN_NOT_FOUND',
        'This travel eSIM plan is not available',
      );
    }

    const departure = new Date(dto.departureDate);
    const returnDate = new Date(dto.returnDate);
    const passportExpiry = new Date(dto.passportExpiryDate);
    if (Number.isNaN(departure.getTime()) || Number.isNaN(returnDate.getTime())) {
      throw new ApiException(400, 'INVALID_DATES', 'Invalid travel dates');
    }
    if (returnDate <= departure) {
      throw new ApiException(
        400,
        'INVALID_DATES',
        'Return date must be after the departure date',
      );
    }
    if (passportExpiry <= new Date()) {
      throw new ApiException(
        400,
        'PASSPORT_EXPIRED',
        'Passport expiry date must be in the future',
      );
    }

    // A selected destination number must be an active hold owned by the
    // caller and must match the plan's country.
    let phoneNumberId: string | undefined;
    if (dto.phoneNumberId) {
      const num = await this.prisma.phoneNumber.findUnique({
        where: { id: dto.phoneNumberId },
      });
      const heldByMe =
        num?.status === 'RESERVED' &&
        num.reservedByUserId === user.id &&
        num.reservedUntil &&
        num.reservedUntil > new Date();
      if (!num || !heldByMe) {
        throw new ApiException(
          409,
          'NUMBER_NOT_HELD',
          'This number is not held for you — pick a number first',
        );
      }
      if (num.countryCode !== plan.destinationCountry) {
        throw new ApiException(
          400,
          'NUMBER_COUNTRY_MISMATCH',
          'Choose a number from your destination country',
        );
      }
      phoneNumberId = num.id;
    }

    const order = await this.prisma.travelEsimOrder.create({
      data: {
        userId: user.id,
        internationalPlanId: plan.id,
        destinationCountry: plan.destinationCountry,
        departureDate: departure,
        returnDate,
        travellerName: dto.travellerName,
        passportCountry: dto.passportCountry,
        passportNumberEncrypted: encryptSecret(dto.passportNumber),
        passportExpiryDate: passportExpiry,
        status: 'PENDING_PAYMENT',
        amountPaise: plan.pricePaise,
        currency: plan.currency,
        phoneNumberId,
      },
    });

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        client_reference_id: user.id,
        line_items: [
          {
            price_data: {
              currency: plan.currency.toLowerCase(),
              unit_amount: plan.pricePaise,
              product_data: {
                name: `Travel eSIM — ${plan.name}`,
                description: `${plan.dataAllowanceMb >= 1024 ? `${plan.dataAllowanceMb / 1024} GB` : `${plan.dataAllowanceMb} MB`} • ${plan.validityDays} days • ${plan.destinationCountry}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          type: SESSION_TYPE,
          orderId: order.id,
          userId: user.id,
          planId: plan.id,
        },
        payment_intent_data: {
          metadata: {
            type: SESSION_TYPE,
            orderId: order.id,
            userId: user.id,
            planId: plan.id,
          },
        },
        success_url: `${this.frontendUrl}/esim?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.frontendUrl}/esim?cancelled=true`,
      });

      await this.prisma.travelEsimOrder.update({
        where: { id: order.id },
        data: { stripeCheckoutSessionId: session.id },
      });

      return { sessionId: session.id, url: session.url, orderId: order.id };
    } catch (err) {
      await this.prisma.travelEsimOrder
        .update({
          where: { id: order.id },
          data: { status: 'FAILED', failureReason: 'checkout_session_failed' },
        })
        .catch(() => {});
      await this.releaseHeldNumber(order.phoneNumberId);
      throw err;
    }
  }

  // -----------------------------------------------------------------------
  // Verification + fulfillment
  // -----------------------------------------------------------------------

  /**
   * Verify a Stripe checkout session after the customer is redirected back —
   * the client redirect alone is never trusted as proof of payment.
   */
  async verifyCheckout(user: UserModel, sessionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    const sessionUserId =
      session.client_reference_id ?? session.metadata?.userId;
    if (sessionUserId && sessionUserId !== user.id && user.role !== 'SUPER_ADMIN') {
      throw new ApiException(
        403,
        'FORBIDDEN',
        'This checkout session belongs to another user',
      );
    }
    if (session.metadata?.type !== SESSION_TYPE) {
      throw new ApiException(
        400,
        'INVALID_SESSION',
        'This checkout session is not a travel eSIM payment',
      );
    }

    const paid =
      session.status === 'complete' || session.payment_status === 'paid';
    if (!paid) {
      if (session.status === 'expired') {
        const stale = await this.prisma.travelEsimOrder.findFirst({
          where: {
            stripeCheckoutSessionId: sessionId,
            status: 'PENDING_PAYMENT',
          },
          select: { id: true, phoneNumberId: true },
        });
        if (stale) {
          await this.prisma.travelEsimOrder
            .update({
              where: { id: stale.id },
              data: { status: 'CANCELLED' },
            })
            .catch(() => {});
          await this.releaseHeldNumber(stale.phoneNumberId);
        }
      }
      return { verified: false };
    }

    await this.fulfillOrder(session.metadata.orderId!, session);

    const order = await this.getOrderByReference(
      session.metadata.orderId!,
      user,
    );
    return { verified: true, order };
  }

  /** Called from the Stripe webhook on checkout.session.completed. */
  async fulfillFromCheckoutSession(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      this.logger.warn(
        `Travel eSIM session ${session.id} had no orderId metadata — skipped`,
      );
      return;
    }
    await this.fulfillOrder(orderId, session);
  }

  /**
   * Mark the order paid and issue the demo eSIM credentials. Idempotent —
   * safe to call from both the webhook and the session-verify fallback.
   */
  async fulfillOrder(orderId: string, session?: Stripe.Checkout.Session) {
    const order = await this.prisma.travelEsimOrder.findUnique({
      where: { id: orderId },
      include: { internationalPlan: true },
    });
    if (!order || order.status !== 'PENDING_PAYMENT') return;

    const activationCode = `LPA:1$esim.zylo.example.com$${order.reference
      .replace(/-/g, '')
      .slice(0, 16)
      .toUpperCase()}`;

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.travelEsimOrder.updateMany({
        where: { id: order.id, status: 'PENDING_PAYMENT' },
        data: {
          status: 'READY_TO_ACTIVATE',
          activationCodeEncrypted: encryptSecret(activationCode),
          qrCodeDataEncrypted: encryptSecret(activationCode),
          activationExpiresAt: order.returnDate,
          providerOrderId: `zylo-esim-${order.reference.slice(0, 8)}`,
          stripePaymentIntentId: session
            ? typeof session.payment_intent === 'string'
              ? session.payment_intent
              : (session.payment_intent?.id ?? null)
            : null,
        },
      });
      if (updated.count === 0) return;

      // Record in Payment history too (idempotent via unique session id).
      if (session) {
        await tx.payment.upsert({
          where: { stripeCheckoutSessionId: session.id },
          update: {
            status: 'SUCCEEDED',
            paidAt: new Date(),
            stripePaymentIntentId:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : (session.payment_intent?.id ?? null),
          },
          create: {
            userId: order.userId,
            type: 'ONE_TIME',
            status: 'SUCCEEDED',
            amount: order.amountPaise / 100,
            currency: order.currency.toLowerCase(),
            description: `Travel eSIM — ${order.internationalPlan.name} (${order.destinationCountry})`,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : (session.payment_intent?.id ?? null),
            paidAt: new Date(),
            metadata: {
              kind: SESSION_TYPE,
              travelEsimOrderId: order.id,
              reference: order.reference,
            },
          },
        });
      }

      // The held destination number becomes permanently assigned.
      if (order.phoneNumberId) {
        await tx.phoneNumber.update({
          where: { id: order.phoneNumberId },
          data: {
            status: 'ASSIGNED',
            reservedUntil: null,
            reservedByUserId: null,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: order.userId,
          title: 'Your travel eSIM is ready',
          message: `Your ${order.internationalPlan.name} eSIM for ${order.destinationCountry} is ready to install. Activate it before you travel.`,
        },
      });
    });
  }

  // -----------------------------------------------------------------------
  // Customer orders
  // -----------------------------------------------------------------------

  async listOrders(userId: string) {
    await this.activateDueOrders(userId);

    const orders = await this.prisma.travelEsimOrder.findMany({
      where: { userId },
      include: {
        internationalPlan: {
          select: {
            id: true,
            name: true,
            destinationCountry: true,
            dataAllowanceMb: true,
            validityDays: true,
            callMinutes: true,
            smsCount: true,
            pricePaise: true,
            currency: true,
          },
        },
        phoneNumber: { select: { number: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      orders: orders.map((o) => this.toPublicOrder(o, false)),
    };
  }

  /**
   * Lazy auto-activation — a READY eSIM switches to ACTIVATED once the
   * trip's departure date arrives (the profile connects to a local network).
   * Customers can still install early via the manual activate endpoint.
   */
  private async activateDueOrders(userId: string) {
    const now = new Date();
    await this.prisma.travelEsimOrder.updateMany({
      where: {
        userId,
        status: 'READY_TO_ACTIVATE',
        departureDate: { lte: now },
      },
      data: { status: 'ACTIVATED', activatedAt: now },
    });
  }

  /** Fetch a single order with eSIM credentials decrypted (owner only). */
  async getOrderByReference(idOrReference: string, user: UserModel) {
    let order = await this.prisma.travelEsimOrder.findFirst({
      where: {
        OR: [{ id: idOrReference }, { reference: idOrReference }],
      },
      include: {
        internationalPlan: true,
        phoneNumber: { select: { number: true } },
      },
    });
    if (!order) {
      throw new ApiException(404, 'ORDER_NOT_FOUND', 'eSIM order not found');
    }
    if (order.userId !== user.id && user.role !== 'SUPER_ADMIN') {
      throw new ApiException(
        403,
        'FORBIDDEN',
        'You can only view your own eSIM orders',
      );
    }

    // Auto-activate when the departure date has arrived.
    if (
      order.status === 'READY_TO_ACTIVATE' &&
      order.departureDate <= new Date()
    ) {
      order = await this.prisma.travelEsimOrder.update({
        where: { id: order.id },
        data: { status: 'ACTIVATED', activatedAt: new Date() },
        include: {
          internationalPlan: true,
          phoneNumber: { select: { number: true } },
        },
      });
    }

    return this.toPublicOrder(order, true);
  }

  /** Simulated activation — the customer "installs" the eSIM profile. */
  async markActivated(idOrReference: string, user: UserModel) {
    const order = await this.prisma.travelEsimOrder.findFirst({
      where: {
        OR: [{ id: idOrReference }, { reference: idOrReference }],
      },
    });
    if (!order) {
      throw new ApiException(404, 'ORDER_NOT_FOUND', 'eSIM order not found');
    }
    if (order.userId !== user.id) {
      throw new ApiException(
        403,
        'FORBIDDEN',
        'You can only activate your own eSIM',
      );
    }
    if (order.status !== 'READY_TO_ACTIVATE') {
      throw new ApiException(
        400,
        'NOT_READY',
        'This eSIM is not ready to activate',
      );
    }

    await this.prisma.travelEsimOrder.update({
      where: { id: order.id },
      data: { status: 'ACTIVATED', activatedAt: new Date() },
    });

    return this.getOrderByReference(order.id, user);
  }

  private toPublicOrder(
    order: {
      id: string;
      reference: string;
      status: string;
      destinationCountry: string;
      departureDate: Date;
      returnDate: Date;
      travellerName: string;
      passportCountry: string;
      amountPaise: number;
      currency: string;
      activationCodeEncrypted: string | null;
      qrCodeDataEncrypted: string | null;
      activationExpiresAt: Date | null;
      activatedAt: Date | null;
      providerOrderId: string | null;
      failureReason: string | null;
      createdAt: Date;
      phoneNumber?: { number: string } | null;
      internationalPlan: {
        name: string;
        dataAllowanceMb: number;
        validityDays: number;
        callMinutes?: number | null;
        smsCount?: number | null;
        providerName?: string | null;
      };
    },
    includeCredentials: boolean,
  ) {
    const ready = ['READY_TO_ACTIVATE', 'ACTIVATED', 'COMPLETED'].includes(
      order.status,
    );
    return {
      id: order.id,
      reference: order.reference,
      status: order.status,
      destinationCountry: order.destinationCountry,
      departureDate: order.departureDate,
      returnDate: order.returnDate,
      travellerName: order.travellerName,
      passportCountry: order.passportCountry,
      amountPaise: order.amountPaise,
      currency: order.currency,
      activatedAt: order.activatedAt,
      activationExpiresAt: order.activationExpiresAt,
      failureReason: order.failureReason,
      createdAt: order.createdAt,
      number: order.phoneNumber?.number ?? null,
      plan: order.internationalPlan,
      esim:
        ready && includeCredentials
          ? {
              activationCode: order.activationCodeEncrypted
                ? decryptSecret(order.activationCodeEncrypted)
                : null,
              qrCodeData: order.qrCodeDataEncrypted
                ? decryptSecret(order.qrCodeDataEncrypted)
                : null,
            }
          : null,
    };
  }

  // -----------------------------------------------------------------------
  // Admin number inventory — per-country stock, held and used numbers
  // -----------------------------------------------------------------------

  async adminListNumbers(query: AdminListNumbersQueryDto) {
    const where = query.country ? { countryCode: query.country } : {};
    const numbers = await this.prisma.phoneNumber.findMany({
      where,
      orderBy: [
        { countryCode: 'asc' },
        { status: 'asc' },
        { number: 'asc' },
      ],
      take: 500,
      select: {
        id: true,
        number: true,
        prefix: true,
        type: true,
        status: true,
        countryCode: true,
        reservedUntil: true,
        reservedByUserId: true,
      },
    });

    const byCountry: Record<
      string,
      { total: number; inStock: number; held: number; used: number }
    > = {};
    for (const n of numbers) {
      const c = (byCountry[n.countryCode] ??= {
        total: 0,
        inStock: 0,
        held: 0,
        used: 0,
      });
      c.total += 1;
      if (n.status === 'AVAILABLE') c.inStock += 1;
      else if (n.status === 'RESERVED') c.held += 1;
      else c.used += 1;
    }

    return { numbers, summary: byCountry };
  }

  /** Generate dummy inventory numbers for a destination country. */
  async adminGenerateNumbers(dto: GenerateEsimNumbersDto) {
    const style = COUNTRY_PREFIX[dto.country] ?? {
      prefix: `+${dto.country.charCodeAt(0) % 90}${dto.country.charCodeAt(1) % 9} `,
      dial: '5',
    };
    const target = dto.count ?? 10;
    const created: string[] = [];
    let attempts = 0;

    while (created.length < target && attempts < target * 20) {
      attempts += 1;
      const digits = String(Math.floor(1000 + Math.random() * 9000));
      const digits2 = String(Math.floor(1000 + Math.random() * 9000));
      const number =
        style.prefix === '+1'
          ? `${style.prefix} ${style.dial} 0${digits.slice(0, 3)}`
          : `${style.prefix} ${style.dial}${digits.slice(0, 2)} ${digits2.slice(0, 2)} ${digits2.slice(2)}`;
      const exists = await this.prisma.phoneNumber.findUnique({
        where: { number },
        select: { id: true },
      });
      if (exists) continue;
      await this.prisma.phoneNumber.create({
        data: {
          number,
          prefix: style.prefix,
          countryCode: dto.country,
        },
      });
      created.push(number);
    }

    return { created, count: created.length, country: dto.country };
  }

  // -----------------------------------------------------------------------
  // Admin plan management
  // -----------------------------------------------------------------------

  async createPlan(dto: CreateInternationalPlanDto) {
    return this.prisma.internationalPlan.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        destinationCountry: dto.destinationCountry,
        dataAllowanceMb: dto.dataAllowanceMb,
        validityDays: dto.validityDays,
        callMinutes: dto.callMinutes ?? null,
        smsCount: dto.smsCount ?? null,
        pricePaise: dto.pricePaise,
        currency: dto.currency ?? 'INR',
        providerName: dto.providerName ?? null,
        providerPlanCode: dto.providerPlanCode ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updatePlan(id: string, dto: UpdateInternationalPlanDto) {
    const existing = await this.prisma.internationalPlan.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'eSIM plan not found');
    }
    return this.prisma.internationalPlan.update({ where: { id }, data: dto });
  }

  async togglePlan(id: string) {
    const existing = await this.prisma.internationalPlan.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!existing) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'eSIM plan not found');
    }
    return this.prisma.internationalPlan.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
  }

  async deletePlan(id: string) {
    const existing = await this.prisma.internationalPlan.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'eSIM plan not found');
    }

    // Orders reference the plan — deactivate instead of deleting to keep
    // purchase history intact (same rule as recharge plans).
    if (existing._count.orders > 0) {
      const deactivated = await this.prisma.internationalPlan.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        deleted: false,
        deactivated: true,
        message: `Plan "${existing.name}" has purchases — it was deactivated instead of deleted.`,
        plan: deactivated,
      };
    }

    await this.prisma.internationalPlan.delete({ where: { id } });
    return {
      deleted: true,
      deactivated: false,
      message: `Plan "${existing.name}" was permanently deleted.`,
    };
  }
}
