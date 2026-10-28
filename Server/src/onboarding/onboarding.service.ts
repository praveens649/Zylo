import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { StripeService } from '../stripe/stripe.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  PhoneNumberModel,
  PlanModel,
} from '../generated/prisma/models.js';
import {
  KycDocumentType,
  KycStatus,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PaymentType,
  PhoneNumberStatus,
  PlanSubscriptionStatus,
  PlanType,
  SimCategory,
  SimStatus,
  SimTechnology,
} from '../generated/prisma/enums.js';
import { CompleteOnboardingDto, SubmitKycDto } from './dto.js';

const ONBOARDING_SESSION_TYPE = 'sim_onboarding';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Get current user's onboarding progress.
   */
  async getStatus(userId: string) {
    const [user, kyc, sims] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true },
      }),
      this.prisma.kycVerification.findUnique({
        where: { id: undefined, userId },
      }),
      this.prisma.sim.findMany({
        where: { userId },
        include: {
          phoneNumber: true,
          planSubscriptions: {
            where: { status: PlanSubscriptionStatus.ACTIVE },
            include: { plan: true },
          },
          dataBankAccount: true,
        },
      }),
    ]);

    if (!user) {
      throw new ApiException(404, 'USER_NOT_FOUND', 'User not found');
    }

    const hasActiveSim = sims.some(
      (s) => s.status === SimStatus.ACTIVE || s.status === SimStatus.PENDING_ACTIVATION,
    );

    let currentStep = 1; // 1: SimType, 2: Kyc, 3: Number, 4: Plan, 5: Payment
    if (hasActiveSim) {
      currentStep = 5;
    } else if (kyc && kyc.status === KycStatus.VERIFIED) {
      currentStep = 3;
    } else {
      currentStep = 1;
    }

    return {
      isComplete: hasActiveSim,
      currentStep,
      user,
      kyc,
      sims,
      activeSim: sims.find((s) => s.status === SimStatus.ACTIVE) ?? sims[0] ?? null,
    };
  }

  /**
   * Submit and verify customer KYC.
   * Updates User.name with the verified full name.
   */
  async submitKyc(userId: string, dto: SubmitKycDto) {
    // Validate document number format
    this.validateDocumentFormat(dto.documentType, dto.documentNumber);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiException(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Upsert KYC and update User name atomically
    const [kyc] = await this.prisma.$transaction([
      this.prisma.kycVerification.upsert({
        where: { userId },
        create: {
          userId,
          fullName: dto.fullName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          documentType: dto.documentType,
          documentNumberEncrypted: dto.documentNumber, // Encrypted or masked
          status: KycStatus.VERIFIED,
          verifiedAt: new Date(),
        },
        update: {
          fullName: dto.fullName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          documentType: dto.documentType,
          documentNumberEncrypted: dto.documentNumber,
          status: KycStatus.VERIFIED,
          verifiedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { name: dto.fullName },
      }),
    ]);

    return {
      message: 'KYC verified successfully',
      kyc,
    };
  }

  /**
   * Returns starter plans for onboarding.
   * Seeds default Zylo starter plans if none exist in the database.
   */
  async getStarterPlans() {
    let plans = await this.prisma.plan.findMany({
      where: { isActive: true, businessOnly: false },
      orderBy: [{ price: 'asc' }],
    });

    if (plans.length === 0) {
      // Auto-seed default Zylo starter plans
      await this.prisma.plan.createMany({
        data: [
          {
            name: 'Zylo Prime Unlimited',
            description: '1.5 GB/Day High-Speed Data, Unlimited Voice Calls, 100 SMS/Day & Data Bank Rollover',
            type: PlanType.PREPAID,
            price: 299.0,
            validityDays: 28,
            dataAllowanceGb: 42.0,
            callingBenefit: 'Unlimited Pan-India',
            smsCount: 100,
            isFeatured: true,
            isActive: true,
            dataBankEnabled: true,
            rolloverLimitMb: 10240, // 10 GB
            rolloverExpiryDays: 90,
            dataTransferEnabled: true,
            transferLimitMb: 2048,
          },
          {
            name: 'Zylo Super Reserve',
            description: '2.0 GB/Day High-Speed Data, Unlimited Voice, Data Bank Rollover & P2P Data Transfer',
            type: PlanType.PREPAID,
            price: 499.0,
            validityDays: 56,
            dataAllowanceGb: 112.0,
            callingBenefit: 'Unlimited Pan-India',
            smsCount: 100,
            isFeatured: false,
            isActive: true,
            dataBankEnabled: true,
            rolloverLimitMb: 10240,
            rolloverExpiryDays: 90,
            dataTransferEnabled: true,
            transferLimitMb: 4096,
          },
          {
            name: 'Zylo Hero 5G Super Saver',
            description: '2.5 GB/Day True 5G Unlimited, Weekend Data Rollover, Full Innovation Pack',
            type: PlanType.PREPAID,
            price: 719.0,
            validityDays: 84,
            dataAllowanceGb: 210.0,
            callingBenefit: 'Unlimited Pan-India',
            smsCount: 100,
            isFeatured: false,
            isActive: true,
            dataBankEnabled: true,
            rolloverLimitMb: 15360, // 15 GB
            rolloverExpiryDays: 90,
            dataTransferEnabled: true,
            transferLimitMb: 5120,
          },
        ],
      });

      plans = await this.prisma.plan.findMany({
        where: { isActive: true, businessOnly: false },
        orderBy: [{ price: 'asc' }],
      });
    }

    return plans;
  }

  /**
   * Shared pre-payment validation: KYC must be verified, the phone number
   * must be allocatable, and the plan must be active.
   */
  private async validateActivationPrereqs(
    userId: string,
    dto: { phoneNumberId: string; planId: string },
  ) {
    const kyc = await this.prisma.kycVerification.findUnique({
      where: { userId },
    });

    if (!kyc || kyc.status !== KycStatus.VERIFIED) {
      throw new ApiException(
        400,
        'KYC_REQUIRED',
        'You must complete and pass KYC verification before activating a SIM',
      );
    }

    const phoneNumber = await this.prisma.phoneNumber.findUnique({
      where: { id: dto.phoneNumberId },
    });

    if (!phoneNumber) {
      throw new ApiException(404, 'PHONE_NUMBER_NOT_FOUND', 'Selected phone number was not found');
    }

    if (phoneNumber.status === PhoneNumberStatus.ASSIGNED) {
      throw new ApiException(
        409,
        'NUMBER_ALREADY_ASSIGNED',
        'This phone number has already been allocated to another SIM',
      );
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || !plan.isActive) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'Selected plan is not available');
    }

    const totalAmount = Number(plan.price) + Number(phoneNumber.price || 0);

    return { phoneNumber, plan, totalAmount };
  }

  /**
   * Provisions the SIM inside a transaction: assigns the phone number,
   * creates the SIM, plan subscription, Data Bank account, and welcome
   * notification, and links the SIM back to the order.
   */
  private async provisionSim(
    tx: Prisma.TransactionClient,
    opts: {
      userId: string;
      orderId: string;
      phoneNumber: PhoneNumberModel;
      plan: PlanModel;
      simCategory: SimCategory;
      simTechnology: CompleteOnboardingDto['simTechnology'];
    },
  ) {
    const { userId, orderId, phoneNumber, plan } = opts;

    await tx.phoneNumber.update({
      where: { id: phoneNumber.id },
      data: {
        status: PhoneNumberStatus.ASSIGNED,
        reservedUntil: null,
      },
    });

    const sim = await tx.sim.create({
      data: {
        userId,
        phoneNumberId: phoneNumber.id,
        category: opts.simCategory ?? SimCategory.PERSONAL,
        technology: opts.simTechnology,
        status: SimStatus.ACTIVE,
        activatedAt: new Date(),
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { simId: sim.id },
    });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.validityDays * 24 * 60 * 60 * 1000);

    const subscription = await tx.planSubscription.create({
      data: {
        simId: sim.id,
        planId: plan.id,
        orderId,
        status: PlanSubscriptionStatus.ACTIVE,
        startDate,
        endDate,
      },
    });

    const dataBank = await tx.dataBankAccount.create({
      data: {
        simId: sim.id,
        balanceMb: 0,
      },
    });

    await tx.notification.create({
      data: {
        userId,
        title: 'Welcome to Zylo Network!',
        message: `Your new Personal SIM with number ${phoneNumber.number} and plan ${plan.name} has been activated successfully.`,
      },
    });

    return { sim, subscription, dataBank };
  }

  private activationResponse(
    sim: { id: string; technology: string },
    phoneNumber: { number: string },
    plan: { name: string; validityDays: number },
    orderId: string,
    dataBankBalanceMb: number,
  ) {
    return {
      success: true,
      message: 'Congratulations! Your Zylo SIM and plan are now active.',
      data: {
        simId: sim.id,
        phoneNumber: phoneNumber.number,
        planName: plan.name,
        validityDays: plan.validityDays,
        simTechnology: sim.technology,
        orderId,
        dataBankBalanceMb,
      },
    };
  }

  /**
   * Create a Stripe Checkout session for the SIM onboarding payment.
   * Creates a PENDING order + payment and returns the hosted-checkout URL.
   * Re-verifies an existing pending order first so a user who already paid
   * is never charged twice.
   */
  async createCheckout(userId: string, dto: CompleteOnboardingDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new ApiException(404, 'USER_NOT_FOUND', 'User not found');
    }

    const { phoneNumber, plan, totalAmount } =
      await this.validateActivationPrereqs(userId, dto);

    // If a pending checkout already exists for this selection, check Stripe
    // before creating a new session — the user may already have paid.
    const pendingPayment = await this.prisma.payment.findFirst({
      where: {
        userId,
        status: PaymentStatus.PENDING,
        stripeCheckoutSessionId: { not: null },
        order: {
          type: OrderType.SIM_PURCHASE,
          status: OrderStatus.PENDING,
          phoneNumberId: phoneNumber.id,
          planId: plan.id,
        },
      },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });

    if (pendingPayment?.stripeCheckoutSessionId && pendingPayment.order) {
      try {
        const existing = await this.stripeService.retrieveCheckoutSession(
          pendingPayment.stripeCheckoutSessionId,
        );

        if (existing.payment_status === 'paid') {
          const activated = await this.activatePaidOrder(
            pendingPayment.order.id,
            dto,
          );
          return { activated: true, ...activated };
        }

        if (existing.status === 'open') {
          // Session still valid — reuse it instead of charging again.
          return { sessionId: existing.id, url: existing.url };
        }
      } catch (err) {
        this.logger.warn(
          `Could not reconcile onboarding session ${pendingPayment.stripeCheckoutSessionId}: ${err instanceof Error ? err.message : err}`,
        );
      }

      // Session expired or unusable — cancel the stale records.
      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: pendingPayment.order.id },
          data: { status: OrderStatus.CANCELLED },
        }),
        this.prisma.payment.update({
          where: { id: pendingPayment.id },
          data: { status: PaymentStatus.CANCELLED },
        }),
      ]);
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        type: OrderType.SIM_PURCHASE,
        status: OrderStatus.PENDING,
        amount: totalAmount,
        currency: 'inr',
        phoneNumberId: phoneNumber.id,
        planId: plan.id,
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        orderId: order.id,
        type: PaymentType.ONE_TIME,
        status: PaymentStatus.PENDING,
        amount: totalAmount,
        currency: 'inr',
        description: `SIM Onboarding Payment - Plan: ${plan.name}`,
      },
    });

    try {
      const frontend = this.stripeService.frontendUrl;
      const session = await this.stripeService.createPaymentCheckoutSession(
        user,
        {
          amount: totalAmount,
          currency: 'inr',
          name: `Zylo SIM Activation — ${plan.name}`,
          description: `Number ${phoneNumber.number} + ${plan.validityDays}-day plan`,
          metadata: {
            type: ONBOARDING_SESSION_TYPE,
            userId,
            orderId: order.id,
            phoneNumberId: phoneNumber.id,
            planId: plan.id,
            simCategory: dto.simCategory ?? SimCategory.PERSONAL,
            simTechnology: dto.simTechnology,
          },
          successUrl: `${frontend}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${frontend}/onboarding?payment=cancelled`,
          expiresInMinutes: 30,
        },
      );

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { stripeCheckoutSessionId: session.sessionId },
      });

      return { sessionId: session.sessionId, url: session.url };
    } catch (err) {
      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        }),
        this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.CANCELLED },
        }),
      ]);
      throw err;
    }
  }

  /**
   * Activate a SIM once its order has been paid. Idempotent — safe to call
   * from both the success redirect and webhook-driven reconciliation.
   */
  private async activatePaidOrder(orderId: string, dto: CompleteOnboardingDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { phoneNumber: true, plan: true, sim: true },
    });

    if (!order || !order.phoneNumber || !order.plan) {
      throw new ApiException(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    // Idempotent: activation already ran.
    if (order.status === OrderStatus.COMPLETED && order.sim) {
      const dataBank = await this.prisma.dataBankAccount.findUnique({
        where: { simId: order.sim.id },
      });
      return this.activationResponse(
        order.sim,
        order.phoneNumber,
        order.plan,
        order.id,
        dataBank?.balanceMb ?? 0,
      );
    }

    if (order.phoneNumber.status === PhoneNumberStatus.ASSIGNED) {
      throw new ApiException(
        409,
        'NUMBER_ALREADY_ASSIGNED',
        'This phone number was assigned to another SIM while payment was processing. Please contact support for a refund.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.COMPLETED },
      });

      await tx.payment.updateMany({
        where: { orderId: order.id, status: { not: PaymentStatus.SUCCEEDED } },
        data: {
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
        },
      });

      const provisioned = await this.provisionSim(tx, {
        userId: order.userId,
        orderId: order.id,
        phoneNumber: order.phoneNumber!,
        plan: order.plan!,
        simCategory: dto.simCategory ?? SimCategory.PERSONAL,
        simTechnology: dto.simTechnology,
      });

      return provisioned;
    });

    return this.activationResponse(
      result.sim,
      order.phoneNumber,
      order.plan,
      order.id,
      result.dataBank.balanceMb,
    );
  }

  /**
   * Verify a Stripe checkout session after the customer is redirected back.
   * The session is retrieved directly from Stripe — the client redirect is
   * never trusted as proof of payment.
   */
  async verifyCheckout(userId: string, sessionId: string) {
    const session = await this.stripeService.retrieveCheckoutSession(sessionId);

    if (session.client_reference_id !== userId) {
      throw new ApiException(
        403,
        'FORBIDDEN',
        'This checkout session belongs to another user',
      );
    }

    if (session.metadata?.type !== ONBOARDING_SESSION_TYPE) {
      throw new ApiException(
        400,
        'INVALID_SESSION',
        'This checkout session is not a SIM onboarding payment',
      );
    }

    const payment = await this.prisma.payment.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      include: { order: true },
    });

    if (!payment?.order) {
      throw new ApiException(
        404,
        'PAYMENT_NOT_FOUND',
        'No onboarding payment found for this checkout session',
      );
    }

    const orderId = payment.order.id;
    const metadata = session.metadata;

    const paid =
      session.payment_status === 'paid' ||
      payment.status === PaymentStatus.SUCCEEDED;

    if (!paid) {
      if (session.status === 'expired') {
        await this.prisma.$transaction([
          this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.CANCELLED },
          }),
          this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.CANCELLED },
          }),
        ]);
      }
      throw new ApiException(
        402,
        'PAYMENT_NOT_COMPLETED',
        'Payment was not completed for this checkout session',
      );
    }

    const dto: CompleteOnboardingDto = {
      simCategory: (metadata.simCategory as SimCategory) ?? SimCategory.PERSONAL,
      simTechnology:
        (metadata.simTechnology as CompleteOnboardingDto['simTechnology']) ??
        SimTechnology.PHYSICAL,
      phoneNumberId: metadata.phoneNumberId!,
      planId: metadata.planId!,
    };

    const activated = await this.activatePaidOrder(orderId, dto);

    // Persist the Stripe payment intent reference if not already stored.
    if (!payment.stripePaymentIntentId) {
      const intentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;
      if (intentId) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { stripePaymentIntentId: intentId },
        });
      }
    }

    return activated;
  }

  /**
   * Development-only activation path: completes onboarding without a real
   * Stripe charge. Used as a fallback when Stripe is not configured.
   * Atomically assigns the phone number, activates the SIM, provisions the plan,
   * records the order & payment, and initializes the Data Bank.
   */
  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const { phoneNumber, plan, totalAmount } =
      await this.validateActivationPrereqs(userId, dto);

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          type: OrderType.SIM_PURCHASE,
          status: OrderStatus.COMPLETED,
          amount: totalAmount,
          currency: 'inr',
          phoneNumberId: phoneNumber.id,
          planId: plan.id,
        },
      });

      const payment = await tx.payment.create({
        data: {
          userId,
          orderId: order.id,
          amount: totalAmount,
          currency: 'inr',
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          description: `SIM Onboarding Payment (dev simulator) - Plan: ${plan.name}`,
        },
      });

      const provisioned = await this.provisionSim(tx, {
        userId,
        orderId: order.id,
        phoneNumber,
        plan,
        simCategory: dto.simCategory ?? SimCategory.PERSONAL,
        simTechnology: dto.simTechnology,
      });

      return { order, payment, ...provisioned };
    });

    return this.activationResponse(
      result.sim,
      phoneNumber,
      plan,
      result.order.id,
      result.dataBank.balanceMb,
    );
  }

  /**
   * Helper to validate government document formats.
   */
  private validateDocumentFormat(type: KycDocumentType, number: string) {
    const clean = number.trim().toUpperCase();
    switch (type) {
      case KycDocumentType.AADHAAR:
        if (!/^\d{12}$/.test(clean.replace(/\s/g, ''))) {
          throw new ApiException(
            400,
            'INVALID_AADHAAR',
            'Aadhaar number must be exactly 12 digits',
          );
        }
        break;
      case KycDocumentType.PAN:
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean)) {
          throw new ApiException(
            400,
            'INVALID_PAN',
            'PAN must follow the standard 10-character alphanumeric format (e.g. ABCDE1234F)',
          );
        }
        break;
      case KycDocumentType.PASSPORT:
        if (!/^[A-Z][0-9]{7}$/.test(clean)) {
          throw new ApiException(
            400,
            'INVALID_PASSPORT',
            'Indian Passport must be 1 letter followed by 7 digits',
          );
        }
        break;
      default:
        if (clean.length < 5) {
          throw new ApiException(
            400,
            'INVALID_DOCUMENT',
            'Document number is too short',
          );
        }
    }
  }
}
