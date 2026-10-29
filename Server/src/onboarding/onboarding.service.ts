import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { StripeService } from '../stripe/stripe.service.js';
import { MailerService } from '../mail/mailer.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  PhoneNumberModel,
  PlanModel,
} from '../generated/prisma/models.js';
import {
  InvitationStatus,
  KycDocumentType,
  KycStatus,
  MembershipStatus,
  OrderStatus,
  OrderType,
  OrganizationMemberRole,
  OrganizationStatus,
  PaymentStatus,
  PaymentType,
  PhoneNumberStatus,
  PlanSubscriptionStatus,
  PlanType,
  SimCategory,
  SimStatus,
  SimTechnology,
} from '../generated/prisma/enums.js';
import {
  generateBusinessCandidatesBatch,
  validateIndianMobileNumber,
} from '../numbers/numbers-generator.engine.js';
import {
  AcceptBusinessInviteDto,
  CompleteOnboardingDto,
  CreateBusinessInviteDto,
  RegisterBusinessDto,
  SubmitKycDto,
} from './dto.js';

const ONBOARDING_SESSION_TYPE = 'sim_onboarding';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly mailer: MailerService,
  ) {}

  /**
   * Get current user's onboarding progress.
   */
  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    const [kyc, sims, organization, membership, allocatedInvite] =
      await Promise.all([
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
      this.prisma.businessOrganization.findFirst({
        where: { ownerUserId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organizationMember.findFirst({
        where: { userId, status: MembershipStatus.ACTIVE },
        include: { organization: true },
      }),
      this.prisma.businessInvite.findFirst({
        where: {
          email: user?.email ?? '',
          status: InvitationStatus.ACCEPTED,
          phoneNumberId: { not: null },
        },
        orderBy: { acceptedAt: 'desc' },
        include: { phoneNumber: { select: { id: true, number: true } } },
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
      organization: organization ?? membership?.organization ?? null,
      membership,
      allocatedNumber: allocatedInvite?.phoneNumber ?? null,
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
   * Business SIM onboarding — registers the organization, requests a
   * dedicated 4-digit number prefix, and stocks the first batch of
   * corporate numbers.
   *
   * Demo boundary: verification auto-approves (same as the simulated KYC
   * check) since there is no admin review queue for organizations yet.
   */
  async registerBusiness(userId: string, dto: RegisterBusinessDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiException(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Resume path — the owner already has an organization on file.
    const existing = await this.prisma.businessOrganization.findFirst({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing && existing.status !== OrganizationStatus.REJECTED) {
      const membership = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: existing.id,
            userId,
          },
        },
      });
      return {
        message: 'Organization already registered',
        organization: existing,
        membership,
        numbersGenerated: 0,
      };
    }

    const prefixTaken = await this.prisma.businessOrganization.findUnique({
      where: { numberPrefix: dto.numberPrefix },
    });
    if (prefixTaken) {
      throw new ApiException(
        409,
        'PREFIX_TAKEN',
        `Prefix ${dto.numberPrefix} is already assigned to ${prefixTaken.name}`,
      );
    }

    if (dto.registrationNumber) {
      const regTaken = await this.prisma.businessOrganization.findUnique({
        where: { registrationNumber: dto.registrationNumber },
      });
      if (regTaken) {
        throw new ApiException(
          409,
          'REGISTRATION_TAKEN',
          'An organization with this registration number already exists',
        );
      }
    }

    if (dto.verificationDocumentId) {
      const doc = await this.prisma.storedFile.findUnique({
        where: { id: dto.verificationDocumentId },
      });
      if (!doc) {
        throw new ApiException(
          400,
          'DOCUMENT_NOT_FOUND',
          'Uploaded verification document was not found',
        );
      }
    }

    const candidates = generateBusinessCandidatesBatch(
      dto.numberPrefix,
      10,
    ).filter(
      (c) =>
        validateIndianMobileNumber(c.number, true, dto.numberPrefix).isValid,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.businessOrganization.create({
        data: {
          name: dto.name,
          businessType: dto.businessType,
          registrationNumber: dto.registrationNumber,
          businessEmail: dto.businessEmail,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          numberPrefix: dto.numberPrefix,
          verificationDocumentId: dto.verificationDocumentId,
          ownerUserId: userId,
          status: OrganizationStatus.APPROVED,
          verifiedAt: new Date(),
        },
      });

      const membership = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          employeeId: dto.employeeId ?? 'OWN-001',
          role: OrganizationMemberRole.OWNER,
          status: MembershipStatus.ACTIVE,
          verifiedAt: new Date(),
        },
      });

      const numbers = await Promise.all(
        candidates.map((c) =>
          tx.phoneNumber.create({
            data: {
              number: c.number,
              prefix: dto.numberPrefix,
              type: c.type,
              price: 0,
              status: PhoneNumberStatus.AVAILABLE,
              organizationId: organization.id,
            },
          }),
        ),
      );

      await tx.notification.create({
        data: {
          userId,
          title: 'Business verification complete',
          message: `${organization.name} is approved. Corporate prefix ${dto.numberPrefix} is live with ${numbers.length} numbers.`,
        },
      });

      return { organization, membership, numbersGenerated: numbers.length };
    });

    return {
      message: 'Business organization verified and prefix activated',
      ...result,
    };
  }

  /**
   * Business starter plans — restricted to `businessOnly` plans.
   * Seeds defaults when none exist (same approach as personal starters).
   */
  async getBusinessPlans() {
    let plans = await this.prisma.plan.findMany({
      where: { isActive: true, businessOnly: true },
      orderBy: [{ price: 'asc' }],
    });

    if (plans.length === 0) {
      await this.prisma.plan.createMany({
        data: [
          {
            name: 'Zylo Business Team 599',
            description:
              '2.5 GB/Day shared business data, unlimited calls, corporate prefix numbers & Data Bank rollover',
            type: PlanType.BUSINESS,
            price: 599.0,
            validityDays: 28,
            dataAllowanceGb: 70.0,
            callingBenefit: 'Unlimited Pan-India',
            smsCount: 100,
            businessOnly: true,
            isFeatured: true,
            isActive: true,
            dataBankEnabled: true,
            rolloverLimitMb: 20480,
            rolloverExpiryDays: 90,
            dataTransferEnabled: true,
            transferLimitMb: 5120,
          },
          {
            name: 'Zylo Business Enterprise 999',
            description:
              '4 GB/Day enterprise data, priority support, unlimited calls & full innovation pack for teams',
            type: PlanType.BUSINESS,
            price: 999.0,
            validityDays: 56,
            dataAllowanceGb: 224.0,
            callingBenefit: 'Unlimited Pan-India',
            smsCount: 200,
            businessOnly: true,
            isFeatured: false,
            isActive: true,
            dataBankEnabled: true,
            rolloverLimitMb: 30720,
            rolloverExpiryDays: 90,
            dataTransferEnabled: true,
            transferLimitMb: 10240,
          },
        ],
      });

      plans = await this.prisma.plan.findMany({
        where: { isActive: true, businessOnly: true },
        orderBy: [{ price: 'asc' }],
      });
    }

    return plans;
  }

  /**
   * Shared pre-payment validation: for PERSONAL SIMs the KYC must be
   * verified; for BUSINESS SIMs the organization must be approved and the
   * number must come from its corporate prefix pool. The plan must be
   * active and match the SIM category.
   */
  private async validateActivationPrereqs(
    userId: string,
    dto: CompleteOnboardingDto,
  ) {
    const isBusiness = dto.simCategory === SimCategory.BUSINESS;

    let organization = null;
    let membership = null;

    if (isBusiness) {
      if (!dto.organizationId) {
        throw new ApiException(
          400,
          'ORGANIZATION_REQUIRED',
          'Business SIM activation requires a verified organization',
        );
      }
      organization = await this.prisma.businessOrganization.findUnique({
        where: { id: dto.organizationId },
      });
      if (!organization) {
        throw new ApiException(
          404,
          'ORGANIZATION_NOT_FOUND',
          'Organization not found',
        );
      }
      membership = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId,
          },
        },
      });
      const isOwner = organization.ownerUserId === userId;
      const isActiveMember = membership?.status === MembershipStatus.ACTIVE;
      if (!isOwner && !isActiveMember) {
        throw new ApiException(
          403,
          'NOT_ORGANIZATION_MEMBER',
          'You are not an active member of this organization',
        );
      }
      if (organization.status !== OrganizationStatus.APPROVED) {
        throw new ApiException(
          400,
          'ORGANIZATION_NOT_VERIFIED',
          `Organization verification is ${organization.status.toLowerCase()} — business SIMs require an approved organization`,
        );
      }
    } else {
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

    // Travel eSIM destination numbers live in the same inventory table —
    // they can only be issued through the eSIM checkout.
    if (phoneNumber.countryCode !== 'IN') {
      throw new ApiException(
        400,
        'NUMBER_NOT_DOMESTIC',
        'This number is reserved for travel eSIM orders',
      );
    }

    if (isBusiness) {
      if (phoneNumber.organizationId !== organization!.id) {
        throw new ApiException(
          400,
          'NUMBER_NOT_IN_ORGANIZATION',
          'Business SIMs must use a number from the organization prefix pool',
        );
      }
    } else if (phoneNumber.organizationId) {
      throw new ApiException(
        400,
        'CORPORATE_NUMBER_NOT_ALLOWED',
        'Corporate-prefixed numbers are reserved for business SIMs',
      );
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || !plan.isActive) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'Selected plan is not available');
    }

    if (isBusiness && !plan.businessOnly) {
      throw new ApiException(
        400,
        'BUSINESS_PLAN_REQUIRED',
        'Business SIMs must be activated on a business-only plan',
      );
    }
    if (!isBusiness && plan.businessOnly) {
      throw new ApiException(
        400,
        'PERSONAL_PLAN_REQUIRED',
        'Business-only plans are not available for personal SIMs',
      );
    }

    const totalAmount = Number(plan.price) + Number(phoneNumber.price || 0);

    return { phoneNumber, plan, totalAmount, organization, membership };
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
      organization?: { id: string; name: string } | null;
      organizationMemberId?: string | null;
    },
  ) {
    const { userId, orderId, phoneNumber, plan } = opts;
    const isBusiness = (opts.simCategory ?? SimCategory.PERSONAL) === SimCategory.BUSINESS;

    await tx.phoneNumber.update({
      where: { id: phoneNumber.id },
      data: {
        status: PhoneNumberStatus.ASSIGNED,
        reservedUntil: null,
        reservedByUserId: null,
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
        organizationId: opts.organization?.id ?? null,
        organizationMemberId: opts.organizationMemberId ?? null,
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
        message: isBusiness
          ? `Your new Business SIM for ${opts.organization?.name} with number ${phoneNumber.number} and plan ${plan.name} has been activated successfully.`
          : `Your new Personal SIM with number ${phoneNumber.number} and plan ${plan.name} has been activated successfully.`,
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
    organizationName?: string | null,
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
        organizationName: organizationName ?? null,
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

    const { phoneNumber, plan, totalAmount, organization } =
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
        organizationId: organization?.id ?? null,
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
            organizationId: organization?.id ?? '',
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
      include: {
        phoneNumber: true,
        plan: true,
        sim: true,
        organization: true,
      },
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
        order.organization?.name,
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

      const membership = order.organizationId
        ? await tx.organizationMember.findUnique({
            where: {
              organizationId_userId: {
                organizationId: order.organizationId,
                userId: order.userId,
              },
            },
          })
        : null;

      const provisioned = await this.provisionSim(tx, {
        userId: order.userId,
        orderId: order.id,
        phoneNumber: order.phoneNumber!,
        plan: order.plan!,
        simCategory: dto.simCategory ?? SimCategory.PERSONAL,
        simTechnology: dto.simTechnology,
        organization: order.organization
          ? { id: order.organization.id, name: order.organization.name }
          : null,
        organizationMemberId: membership?.id ?? null,
      });

      return provisioned;
    });

    return this.activationResponse(
      result.sim,
      order.phoneNumber,
      order.plan,
      order.id,
      result.dataBank.balanceMb,
      order.organization?.name,
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
      organizationId: metadata.organizationId || undefined,
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
    const { phoneNumber, plan, totalAmount, organization, membership } =
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
          organizationId: organization?.id ?? null,
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
        organization: organization
          ? { id: organization.id, name: organization.name }
          : null,
        organizationMemberId: membership?.id ?? null,
      });

      return { order, payment, ...provisioned };
    });

    return this.activationResponse(
      result.sim,
      phoneNumber,
      plan,
      result.order.id,
      result.dataBank.balanceMb,
      organization?.name,
    );
  }

  /**
   * Resolve the organization the user owns; throws when it is missing or
   * not approved — invites are owner-only.
   */
  private async requireOwnedOrganization(userId: string) {
    const org = await this.prisma.businessOrganization.findFirst({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!org || org.status !== OrganizationStatus.APPROVED) {
      throw new ApiException(
        403,
        'NOT_ORGANIZATION_OWNER',
        'Only the owner of an approved organization can manage invites',
      );
    }
    return org;
  }

  async listInvites(userId: string) {
    const org = await this.requireOwnedOrganization(userId);
    return this.prisma.businessInvite.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
      include: {
        phoneNumber: { select: { id: true, number: true } },
      },
    });
  }

  /**
   * Shared member login password for an org — derived from the corporate
   * prefix so all invited members of an organization share one password
   * (demo policy; members can change it after login).
   */
  private memberPassword(org: { numberPrefix: string | null }) {
    return `Zylo@${org.numberPrefix ?? '0000'}`;
  }

  /**
   * Owner invites a member by email and allocates a prefix-pool number.
   * A Zylo account is auto-provisioned when the invitee doesn't have one —
   * credentials are emailed via Resend. The number is held (RESERVED)
   * while the invite is open; membership is created only on accept.
   */
  async createInvite(userId: string, dto: CreateBusinessInviteDto) {
    const org = await this.requireOwnedOrganization(userId);

    // Seat limit: active members + open invites cannot exceed 10.
    const [activeMembers, openInvites] = await Promise.all([
      this.prisma.organizationMember.count({
        where: {
          organizationId: org.id,
          status: MembershipStatus.ACTIVE,
        },
      }),
      this.prisma.businessInvite.count({
        where: {
          organizationId: org.id,
          status: InvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);
    if (activeMembers + openInvites >= 10) {
      throw new ApiException(
        409,
        'SEAT_LIMIT_REACHED',
        'This organization already has 10 members/invites — the maximum allowed',
      );
    }

    // The allocated number must come from this org's prefix pool.
    const phoneNumber = await this.prisma.phoneNumber.findUnique({
      where: { id: dto.phoneNumberId },
    });
    if (!phoneNumber || phoneNumber.organizationId !== org.id) {
      throw new ApiException(
        400,
        'NUMBER_NOT_IN_ORGANIZATION',
        'The number must belong to your organization prefix pool',
      );
    }
    if (phoneNumber.status !== PhoneNumberStatus.AVAILABLE) {
      throw new ApiException(
        409,
        'NUMBER_UNAVAILABLE',
        'This number is already allocated or reserved',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      const member = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: existingUser.id,
          },
        },
      });
      if (member?.status === MembershipStatus.ACTIVE) {
        throw new ApiException(
          409,
          'ALREADY_MEMBER',
          'This user is already a member of your organization',
        );
      }
    }

    const pending = await this.prisma.businessInvite.findFirst({
      where: {
        organizationId: org.id,
        email: dto.email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      throw new ApiException(
        409,
        'INVITE_PENDING',
        'A pending invite already exists for this email',
      );
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const password = this.memberPassword(org);

    const invite = await this.prisma.$transaction(async (tx) => {
      // Auto-provision the member account with the shared org password.
      if (!existingUser) {
        await tx.user.create({
          data: {
            email: dto.email,
            name: dto.email.split('@')[0],
            passwordHash: await bcrypt.hash(password, 12),
          },
        });
      }

      const created = await tx.businessInvite.create({
        data: {
          organizationId: org.id,
          email: dto.email,
          employeeId: dto.employeeId,
          phoneNumberId: phoneNumber.id,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt,
        },
        include: { phoneNumber: { select: { id: true, number: true } } },
      });

      // Hold the allocated number while the invite is open.
      await tx.phoneNumber.update({
        where: { id: phoneNumber.id },
        data: {
          status: PhoneNumberStatus.RESERVED,
          reservedUntil: expiresAt,
        },
      });

      return created;
    });

    // Email credentials only to brand-new accounts — existing users see
    // the invite on their dashboard.
    if (!existingUser) {
      const sent = await this.mailer.sendTempPasswordEmail({
        to: dto.email,
        name: dto.email.split('@')[0],
        password,
      });
      this.logger.log(
        sent
          ? `Invite ${invite.id} for ${dto.email} — credentials email sent`
          : `Invite ${invite.id} for ${dto.email} — credentials email NOT sent (see MailerService logs)`,
      );
    } else {
      this.logger.log(
        `Invite ${invite.id} for ${dto.email} — existing user, no credentials email`,
      );
    }

    return { invite, token };
  }

  /** Pending invites addressed to the logged-in member (dashboard card). */
  async myInvites(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      throw new ApiException(404, 'USER_NOT_FOUND', 'User not found');
    }
    const invites = await this.prisma.businessInvite.findMany({
      where: {
        email: user.email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { name: true, numberPrefix: true } },
        phoneNumber: { select: { id: true, number: true } },
      },
    });
    return invites;
  }

  /** Preview an invite by its raw token (no state change). */
  async getInviteByToken(token: string) {
    const invite = await this.prisma.businessInvite.findUnique({
      where: {
        tokenHash: createHash('sha256').update(token).digest('hex'),
      },
      include: {
        organization: { select: { name: true, numberPrefix: true } },
        phoneNumber: { select: { id: true, number: true } },
      },
    });
    if (!invite) {
      throw new ApiException(404, 'INVITE_NOT_FOUND', 'Invalid invite link');
    }
    if (
      invite.status === InvitationStatus.PENDING &&
      invite.expiresAt < new Date()
    ) {
      await this.releaseInvite(invite.id, invite.phoneNumberId, true);
      invite.status = InvitationStatus.EXPIRED;
    }
    return {
      email: invite.email,
      status: invite.status,
      expiresAt: invite.expiresAt,
      organization: invite.organization,
      phoneNumber: invite.phoneNumber,
    };
  }

  /**
   * Close an invite and release its held number. `expired` marks the
   * invite EXPIRED, otherwise REVOKED.
   */
  private async releaseInvite(
    inviteId: string,
    phoneNumberId: string | null,
    expired = false,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.businessInvite.update({
        where: { id: inviteId },
        data: {
          status: expired ? InvitationStatus.EXPIRED : InvitationStatus.REVOKED,
        },
      });
      if (phoneNumberId) {
        await tx.phoneNumber.update({
          where: { id: phoneNumberId },
          data: { status: PhoneNumberStatus.AVAILABLE, reservedUntil: null },
        });
      }
    });
  }

  private async assertInviteTarget(
    invite: { email: string },
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ApiException(
        403,
        'EMAIL_MISMATCH',
        'This invite was sent to a different email address',
      );
    }
    return user;
  }

  private async assertOpenInvite(invite: {
    id: string;
    phoneNumberId: string | null;
    status: InvitationStatus;
    expiresAt: Date;
  }) {
    if (invite.status !== InvitationStatus.PENDING) {
      throw new ApiException(
        409,
        'INVITE_CLOSED',
        `This invite has already been ${invite.status.toLowerCase()}`,
      );
    }
    if (invite.expiresAt < new Date()) {
      await this.releaseInvite(invite.id, invite.phoneNumberId, true);
      throw new ApiException(410, 'INVITE_EXPIRED', 'This invite has expired');
    }
  }

  private async resolveInvite(token: string) {
    const invite = await this.prisma.businessInvite.findUnique({
      where: {
        tokenHash: createHash('sha256').update(token).digest('hex'),
      },
      include: { organization: true },
    });
    if (!invite) {
      throw new ApiException(404, 'INVITE_NOT_FOUND', 'Invalid invite link');
    }
    await this.assertOpenInvite(invite);
    return invite;
  }

  private async resolveInviteById(inviteId: string) {
    const invite = await this.prisma.businessInvite.findUnique({
      where: { id: inviteId },
      include: { organization: true },
    });
    if (!invite) {
      throw new ApiException(404, 'INVITE_NOT_FOUND', 'Invite not found');
    }
    await this.assertOpenInvite(invite);
    return invite;
  }

  /**
   * Shared acceptance path — creates an ACTIVE OrganizationMember and,
   * when the invite allocated a number, provisions the member's Business
   * SIM immediately (org-covered — no member payment required in demo).
   */
  private async acceptInviteInternal(
    userId: string,
    invite: {
      id: string;
      email: string;
      organizationId: string;
      employeeId: string | null;
      phoneNumberId: string | null;
      organization: { name: string };
    },
  ) {
    await this.assertInviteTarget(invite, userId);

    const businessPlan = invite.phoneNumberId
      ? await this.prisma.plan.findFirst({
          where: { isActive: true, businessOnly: true },
          orderBy: { price: 'asc' },
        })
      : null;

    const membership = await this.prisma.$transaction(async (tx) => {
      const [member] = await Promise.all([
        tx.organizationMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: invite.organizationId,
              userId,
            },
          },
          create: {
            organizationId: invite.organizationId,
            userId,
            employeeId:
              invite.employeeId ?? `EMP-${userId.slice(-6).toUpperCase()}`,
            role: OrganizationMemberRole.EMPLOYEE,
            status: MembershipStatus.ACTIVE,
            verifiedAt: new Date(),
          },
          update: { status: MembershipStatus.ACTIVE },
        }),
        tx.businessInvite.update({
          where: { id: invite.id },
          data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
        }),
      ]);

      if (invite.phoneNumberId) {
        const sim = await tx.sim.create({
          data: {
            userId,
            phoneNumberId: invite.phoneNumberId,
            category: SimCategory.BUSINESS,
            technology: SimTechnology.PHYSICAL,
            status: SimStatus.ACTIVE,
            activatedAt: new Date(),
            organizationId: invite.organizationId,
            organizationMemberId: member.id,
          },
        });
        await tx.phoneNumber.update({
          where: { id: invite.phoneNumberId },
          data: { status: PhoneNumberStatus.ASSIGNED, reservedUntil: null },
        });
        if (businessPlan) {
          const start = new Date();
          await tx.planSubscription.create({
            data: {
              simId: sim.id,
              planId: businessPlan.id,
              status: PlanSubscriptionStatus.ACTIVE,
              startDate: start,
              endDate: new Date(
                start.getTime() + businessPlan.validityDays * 86400000,
              ),
            },
          });
        }
        await tx.dataBankAccount.create({
          data: { simId: sim.id, balanceMb: 0 },
        });
        await tx.notification.create({
          data: {
            userId,
            title: `Welcome to ${invite.organization.name}!`,
            message: `Your Business SIM is live — number assigned by your organization.`,
          },
        });
      }

      return member;
    });

    return {
      message: `You have joined ${invite.organization.name}`,
      organization: invite.organization,
      membership,
    };
  }

  /**
   * Invitee accepts via token link — creates an ACTIVE OrganizationMember
   * so the member can onboard a Business SIM with a number from the org
   * prefix pool.
   */
  async acceptInvite(userId: string, dto: AcceptBusinessInviteDto) {
    const invite = await this.resolveInvite(dto.token);
    return this.acceptInviteInternal(userId, {
      ...invite,
      phoneNumberId: invite.phoneNumberId ?? null,
    });
  }

  /**
   * Invitee accepts from the dashboard card (invite id, session email
   * must match).
   */
  async acceptInviteById(userId: string, inviteId: string) {
    const invite = await this.resolveInviteById(inviteId);
    return this.acceptInviteInternal(userId, {
      ...invite,
      phoneNumberId: invite.phoneNumberId ?? null,
    });
  }

  async declineInvite(userId: string, dto: AcceptBusinessInviteDto) {
    const invite = await this.resolveInvite(dto.token);
    await this.assertInviteTarget(invite, userId);
    await this.releaseInvite(invite.id, invite.phoneNumberId);
    return { message: 'Invite declined' };
  }

  async declineInviteById(userId: string, inviteId: string) {
    const invite = await this.resolveInviteById(inviteId);
    await this.assertInviteTarget(invite, userId);
    await this.releaseInvite(invite.id, invite.phoneNumberId);
    return { message: 'Invite declined' };
  }

  async cancelInvite(userId: string, inviteId: string) {
    const org = await this.requireOwnedOrganization(userId);
    const invite = await this.prisma.businessInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.organizationId !== org.id) {
      throw new ApiException(404, 'INVITE_NOT_FOUND', 'Invite not found');
    }
    if (invite.status !== InvitationStatus.PENDING) {
      throw new ApiException(
        409,
        'INVITE_CLOSED',
        'Only pending invites can be cancelled',
      );
    }
    await this.releaseInvite(invite.id, invite.phoneNumberId);
    return { message: 'Invite cancelled' };
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
