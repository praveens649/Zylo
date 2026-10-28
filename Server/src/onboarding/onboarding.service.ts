import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import {
  KycDocumentType,
  KycStatus,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PhoneNumberStatus,
  PlanSubscriptionStatus,
  PlanType,
  SimCategory,
  SimStatus,
} from '../generated/prisma/enums.js';
import { CompleteOnboardingDto, SubmitKycDto } from './dto.js';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

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
   * Final step: completes the onboarding process.
   * Atomically assigns the phone number, activates the SIM, provisions the plan,
   * records the order & payment, and initializes the Data Bank.
   */
  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    // 1. Verify KYC exists and is approved
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

    // 2. Verify Phone Number
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

    // 3. Verify Plan
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || !plan.isActive) {
      throw new ApiException(404, 'PLAN_NOT_FOUND', 'Selected plan is not available');
    }

    // 4. Calculate total amount (Plan price + any VIP number price)
    const totalAmount = Number(plan.price) + Number(phoneNumber.price || 0);

    // 5. Execute atomic activation in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create Order
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

      // Create Payment (Demo / Simulated Stripe confirmation)
      const payment = await tx.payment.create({
        data: {
          userId,
          orderId: order.id,
          amount: totalAmount,
          currency: 'inr',
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          description: `SIM Onboarding Payment - Plan: ${plan.name}`,
        },
      });

      // Assign Phone Number
      await tx.phoneNumber.update({
        where: { id: phoneNumber.id },
        data: {
          status: PhoneNumberStatus.ASSIGNED,
          reservedUntil: null,
        },
      });

      // Create SIM
      const sim = await tx.sim.create({
        data: {
          userId,
          phoneNumberId: phoneNumber.id,
          category: dto.simCategory ?? SimCategory.PERSONAL,
          technology: dto.simTechnology,
          status: SimStatus.ACTIVE,
          activatedAt: new Date(),
        },
      });

      // Update Order with SIM id
      await tx.order.update({
        where: { id: order.id },
        data: { simId: sim.id },
      });

      // Create Plan Subscription
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + plan.validityDays * 24 * 60 * 60 * 1000);

      const subscription = await tx.planSubscription.create({
        data: {
          simId: sim.id,
          planId: plan.id,
          orderId: order.id,
          status: PlanSubscriptionStatus.ACTIVE,
          startDate,
          endDate,
        },
      });

      // Initialize Data Bank account
      const dataBank = await tx.dataBankAccount.create({
        data: {
          simId: sim.id,
          balanceMb: 0,
        },
      });

      // Create Welcome Notification
      await tx.notification.create({
        data: {
          userId,
          title: 'Welcome to Zylo Network!',
          message: `Your new Personal SIM with number ${phoneNumber.number} and plan ${plan.name} has been activated successfully.`,
        },
      });

      return {
        order,
        payment,
        sim,
        subscription,
        dataBank,
      };
    });

    return {
      success: true,
      message: 'Congratulations! Your Zylo SIM and plan are now active.',
      data: {
        simId: result.sim.id,
        phoneNumber: phoneNumber.number,
        planName: plan.name,
        validityDays: plan.validityDays,
        simTechnology: result.sim.technology,
        orderId: result.order.id,
        dataBankBalanceMb: result.dataBank.balanceMb,
      },
    };
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
