import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { listMeta, pageParams } from '../common/pagination.js';
import {
  PhoneNumberStatus,
  PhoneNumberType,
} from '../generated/prisma/enums.js';
import type { UserModel } from '../generated/prisma/models.js';
import {
  GenerateNumbersDto,
  ListAvailableNumbersDto,
  NumberGenerationCategory,
  ReleaseNumberDto,
  ReserveNumberDto,
} from './dto.js';
import {
  GeneratedCandidate,
  generateBusinessCandidatesBatch,
  generatePersonalCandidatesBatch,
  validateIndianMobileNumber,
} from './numbers-generator.engine.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class NumbersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Core Generation Engine:
   * Generates batches of validated, unique Indian phone numbers.
   * Handles Type 1 (PERSONAL standard/premium) and Type 2 (BUSINESS with 4-digit prefix).
   */
  async generateNumbers(dto: GenerateNumbersDto) {
    const count = dto.count ?? 10;

    if (dto.type === NumberGenerationCategory.PERSONAL) {
      return this.generatePersonalNumbers(count, dto.allowPremium);
    } else {
      return this.generateBusinessNumbers(dto);
    }
  }

  /**
   * Generates PERSONAL numbers conforming to Indian Telecom standard (+91[6-9]XXXXXXXXX).
   * Identifies VIP/Premium vanity patterns and assigns appropriate pricing.
   */
  private async generatePersonalNumbers(count: number, allowPremium: boolean) {
    const verifiedCandidates: GeneratedCandidate[] = [];
    const seenInBatch = new Set<string>();

    let attempts = 0;
    const maxAttempts = count * 30;

    while (verifiedCandidates.length < count && attempts < maxAttempts) {
      attempts++;
      const needed = count - verifiedCandidates.length;
      const batch = generatePersonalCandidatesBatch(needed * 2, allowPremium);

      const candidateNumbers = batch
        .map((b) => b.number)
        .filter((num) => !seenInBatch.has(num));

      if (candidateNumbers.length === 0) continue;

      // Query database for existing duplicates
      const existing = await this.prisma.phoneNumber.findMany({
        where: { number: { in: candidateNumbers } },
        select: { number: true },
      });
      const existingSet = new Set(existing.map((e) => e.number));

      for (const item of batch) {
        if (
          !seenInBatch.has(item.number) &&
          !existingSet.has(item.number) &&
          verifiedCandidates.length < count
        ) {
          // Double verify Indian format
          const validation = validateIndianMobileNumber(item.number, false);
          if (validation.isValid) {
            seenInBatch.add(item.number);
            verifiedCandidates.push(item);
          }
        }
      }
    }

    if (verifiedCandidates.length < count) {
      throw new ApiException(
        500,
        'GENERATION_COLLISION_ERROR',
        `Failed to generate ${count} unique numbers after multiple attempts`,
      );
    }

    // Persist to database in a transaction
    const createdRecords = await this.prisma.$transaction(
      verifiedCandidates.map((c) =>
        this.prisma.phoneNumber.create({
          data: {
            number: c.number,
            prefix: c.prefix,
            type: c.type,
            price: c.price,
            status: PhoneNumberStatus.AVAILABLE,
          },
        }),
      ),
    );

    const premiumCount = createdRecords.filter(
      (r) => r.type === PhoneNumberType.PREMIUM,
    ).length;
    const standardCount = createdRecords.length - premiumCount;

    return {
      message: `Successfully generated and stocked ${createdRecords.length} personal numbers`,
      category: 'PERSONAL',
      totalGenerated: createdRecords.length,
      premiumCount,
      standardCount,
      numbers: createdRecords,
    };
  }

  /**
   * Generates BUSINESS numbers for an Organization and its members.
   * Format: +91 + [4-digit prefix] + [6 random digits] = 10 digits after +91.
   */
  private async generateBusinessNumbers(dto: GenerateNumbersDto) {
    let resolvedPrefix = dto.prefix?.trim();
    let organizationName: string | undefined;

    // If an organizationId is supplied, verify and retrieve or update its prefix
    if (dto.organizationId) {
      const org = await this.prisma.businessOrganization.findUnique({
        where: { id: dto.organizationId },
      });

      if (!org) {
        throw new ApiException(
          404,
          'ORGANIZATION_NOT_FOUND',
          `Business organization with ID ${dto.organizationId} does not exist`,
        );
      }

      organizationName = org.name;

      if (org.numberPrefix) {
        if (resolvedPrefix && resolvedPrefix !== org.numberPrefix) {
          throw new ApiException(
            400,
            'PREFIX_MISMATCH',
            `Supplied prefix (${resolvedPrefix}) does not match organization's registered prefix (${org.numberPrefix})`,
          );
        }
        resolvedPrefix = org.numberPrefix;
      } else if (resolvedPrefix) {
        // Set the organization's prefix
        await this.prisma.businessOrganization.update({
          where: { id: dto.organizationId },
          data: { numberPrefix: resolvedPrefix },
        });
      } else {
        throw new ApiException(
          400,
          'PREFIX_REQUIRED',
          'Business prefix must be provided or already set on the organization',
        );
      }
    }

    if (!resolvedPrefix || !/^\d{4}$/.test(resolvedPrefix)) {
      throw new ApiException(
        400,
        'INVALID_PREFIX',
        'Business numbers require a valid 4-digit prefix (e.g. "0482")',
      );
    }

    const count = dto.count ?? 10;
    const verifiedCandidates: GeneratedCandidate[] = [];
    const seenInBatch = new Set<string>();

    let attempts = 0;
    const maxAttempts = count * 30;

    while (verifiedCandidates.length < count && attempts < maxAttempts) {
      attempts++;
      const needed = count - verifiedCandidates.length;
      const batch = generateBusinessCandidatesBatch(resolvedPrefix, needed * 2);

      const candidateNumbers = batch
        .map((b) => b.number)
        .filter((num) => !seenInBatch.has(num));

      if (candidateNumbers.length === 0) continue;

      const existing = await this.prisma.phoneNumber.findMany({
        where: { number: { in: candidateNumbers } },
        select: { number: true },
      });
      const existingSet = new Set(existing.map((e) => e.number));

      for (const item of batch) {
        if (
          !seenInBatch.has(item.number) &&
          !existingSet.has(item.number) &&
          verifiedCandidates.length < count
        ) {
          const validation = validateIndianMobileNumber(
            item.number,
            true,
            resolvedPrefix,
          );
          if (validation.isValid) {
            seenInBatch.add(item.number);
            verifiedCandidates.push(item);
          }
        }
      }
    }

    if (verifiedCandidates.length < count) {
      throw new ApiException(
        500,
        'GENERATION_COLLISION_ERROR',
        `Failed to generate ${count} unique business numbers for prefix ${resolvedPrefix}`,
      );
    }

    const createdRecords = await this.prisma.$transaction(
      verifiedCandidates.map((c) =>
        this.prisma.phoneNumber.create({
          data: {
            number: c.number,
            prefix: resolvedPrefix,
            type: c.type,
            price: 0,
            status: PhoneNumberStatus.AVAILABLE,
            organizationId: dto.organizationId ?? null,
          },
        }),
      ),
    );

    return {
      message: `Successfully generated and stocked ${createdRecords.length} business numbers with prefix "${resolvedPrefix}"`,
      category: 'BUSINESS',
      prefix: resolvedPrefix,
      organizationId: dto.organizationId ?? null,
      organizationName,
      totalGenerated: createdRecords.length,
      numbers: createdRecords,
    };
  }

  /**
   * Customer Onboarding Query:
   * Retrieves available numbers with auto-release of expired reservations.
   */
  async getAvailableNumbers(query: ListAvailableNumbersDto) {
    // 1. Release expired holds
    await this.releaseExpiredReservations();

    const now = new Date();
    const where: Prisma.PhoneNumberWhereInput = {
      // Domestic SIM onboarding only offers Indian numbers — travel eSIM
      // destination numbers (countryCode != 'IN') are stocked for the
      // eSIM checkout and must never leak into this picker.
      countryCode: 'IN',
      OR: [
        { status: PhoneNumberStatus.AVAILABLE },
        {
          status: PhoneNumberStatus.RESERVED,
          reservedUntil: { lt: now },
        },
      ],
    };

    if (query.category === 'PERSONAL') {
      where.organizationId = null;
    } else if (query.category === 'BUSINESS') {
      if (query.organizationId) {
        where.organizationId = query.organizationId;
      } else {
        where.organizationId = { not: null };
      }
    } else if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.prefix) {
      where.prefix = query.prefix;
    }

    if (query.search) {
      where.number = { contains: query.search };
    }

    const { skip, take } = pageParams(query);
    const [total, data] = await Promise.all([
      this.prisma.phoneNumber.count({ where }),
      this.prisma.phoneNumber.findMany({
        where,
        include: {
          organization: {
            select: { id: true, name: true, numberPrefix: true },
          },
        },
        orderBy: [
          { type: 'desc' }, // Show PREMIUM first if unfiltered
          { createdAt: 'desc' },
        ],
        skip,
        take,
      }),
    ]);

    return {
      data,
      meta: listMeta(total, query.page, query.limit),
    };
  }

  /**
   * Reserves a number for 15 minutes during customer onboarding/checkout.
   *
   * Holds are owned by the reserving user:
   * - Re-selecting a number you already hold just renews the hold.
   * - Reserving a different number releases your previous hold, so a
   *   customer can change their pick without waiting for expiry.
   * - A number held by someone else still returns 409 until it expires.
   */
  async reserveNumber(dto: ReserveNumberDto, userId: string) {
    await this.releaseExpiredReservations();

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const phoneNumber = await tx.phoneNumber.findUnique({
        where: { id: dto.numberId },
      });

      if (!phoneNumber) {
        throw new ApiException(
          404,
          'PHONE_NUMBER_NOT_FOUND',
          'Phone number not found',
        );
      }

      const heldByOther =
        phoneNumber.status === PhoneNumberStatus.RESERVED &&
        phoneNumber.reservedUntil &&
        phoneNumber.reservedUntil > now &&
        phoneNumber.reservedByUserId !== userId;

      if (phoneNumber.status === PhoneNumberStatus.ASSIGNED || heldByOther) {
        throw new ApiException(
          409,
          'NUMBER_NOT_AVAILABLE',
          'This phone number is already reserved or assigned',
        );
      }

      // One number per checkout — release this customer's other active holds.
      await tx.phoneNumber.updateMany({
        where: {
          status: PhoneNumberStatus.RESERVED,
          reservedByUserId: userId,
          reservedUntil: { gt: now },
          id: { not: dto.numberId },
        },
        data: {
          status: PhoneNumberStatus.AVAILABLE,
          reservedUntil: null,
          reservedByUserId: null,
        },
      });

      const holdMinutes = dto.holdMinutes ?? 15;
      const reservedUntil = new Date(Date.now() + holdMinutes * 60 * 1000);

      const updated = await tx.phoneNumber.update({
        where: { id: dto.numberId },
        data: {
          status: PhoneNumberStatus.RESERVED,
          reservedUntil,
          reservedByUserId: userId,
        },
      });

      return {
        message: `Phone number held for ${holdMinutes} minutes`,
        number: updated.number,
        numberId: updated.id,
        reservedUntil,
      };
    });
  }

  /**
   * Releases a held number back to AVAILABLE.
   * Only the customer who holds it (or an admin) may release it.
   */
  async releaseNumber(dto: ReleaseNumberDto, user: UserModel) {
    const phoneNumber = await this.prisma.phoneNumber.findUnique({
      where: { id: dto.numberId },
    });

    if (!phoneNumber) {
      throw new ApiException(
        404,
        'PHONE_NUMBER_NOT_FOUND',
        'Phone number not found',
      );
    }

    if (phoneNumber.status === PhoneNumberStatus.ASSIGNED) {
      throw new ApiException(
        400,
        'CANNOT_RELEASE_ASSIGNED_NUMBER',
        'Cannot release a phone number that is already assigned to a SIM',
      );
    }

    const heldByOther =
      phoneNumber.status === PhoneNumberStatus.RESERVED &&
      phoneNumber.reservedByUserId &&
      phoneNumber.reservedByUserId !== user.id;

    if (heldByOther && user.role !== 'SUPER_ADMIN') {
      throw new ApiException(
        403,
        'FORBIDDEN',
        'This number is held by another customer',
      );
    }

    const updated = await this.prisma.phoneNumber.update({
      where: { id: dto.numberId },
      data: {
        status: PhoneNumberStatus.AVAILABLE,
        reservedUntil: null,
        reservedByUserId: null,
      },
    });

    return {
      message: 'Phone number released to available inventory',
      number: updated.number,
      status: updated.status,
    };
  }

  /**
   * Admin Inventory View with statistics.
   */
  async getAdminInventory(query: ListAvailableNumbersDto) {
    // SIM-fleet inventory is Indian numbers only; travel eSIM stock is
    // managed per-country in the admin eSIM console.
    const where: Prisma.PhoneNumberWhereInput = { countryCode: 'IN' };

    if (query.category === 'PERSONAL') {
      where.organizationId = null;
    } else if (query.category === 'BUSINESS') {
      where.organizationId = query.organizationId
        ? query.organizationId
        : { not: null };
    }

    if (query.type) where.type = query.type;
    if (query.prefix) where.prefix = query.prefix;
    if (query.search) where.number = { contains: query.search };

    const { skip, take } = pageParams(query);

    const [total, data, stats] = await Promise.all([
      this.prisma.phoneNumber.count({ where }),
      this.prisma.phoneNumber.findMany({
        where,
        include: {
          organization: {
            select: { id: true, name: true, numberPrefix: true },
          },
          sim: {
            select: { id: true, status: true, userId: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.phoneNumber.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const statusCounts = {
      AVAILABLE: 0,
      RESERVED: 0,
      ASSIGNED: 0,
    };
    for (const s of stats) {
      statusCounts[s.status] = s._count._all;
    }

    return {
      data,
      stats: statusCounts,
      meta: listMeta(total, query.page, query.limit),
    };
  }

  /**
   * Admin deletion of unassigned number.
   */
  async deleteNumber(id: string) {
    const phoneNumber = await this.prisma.phoneNumber.findUnique({
      where: { id },
    });

    if (!phoneNumber) {
      throw new ApiException(
        404,
        'PHONE_NUMBER_NOT_FOUND',
        'Phone number not found',
      );
    }

    if (phoneNumber.status === PhoneNumberStatus.ASSIGNED) {
      throw new ApiException(
        400,
        'CANNOT_DELETE_ASSIGNED_NUMBER',
        'Cannot delete a number currently assigned to an active SIM',
      );
    }

    await this.prisma.phoneNumber.delete({ where: { id } });

    return { message: 'Phone number removed from inventory' };
  }

  /**
   * Helper: Releases any reservation whose hold has expired.
   */
  private async releaseExpiredReservations() {
    const now = new Date();
    await this.prisma.phoneNumber.updateMany({
      where: {
        status: PhoneNumberStatus.RESERVED,
        reservedUntil: { lt: now },
      },
      data: {
        status: PhoneNumberStatus.AVAILABLE,
        reservedUntil: null,
        reservedByUserId: null,
      },
    });
  }
}
