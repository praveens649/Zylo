import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  KycDocumentType,
  SimCategory,
  SimTechnology,
} from '../generated/prisma/enums.js';
import { normalizeEmail, trim } from '../common/dto.js';

export class SubmitKycDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(255)
  address!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  state!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'Postal code must be a valid 6-digit Indian PIN code',
  })
  postalCode!: string;

  @IsEnum(KycDocumentType, {
    message: 'documentType must be AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, or VOTER_ID',
  })
  documentType!: KycDocumentType;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(30)
  documentNumber!: string;
}

export class CompleteOnboardingDto {
  @IsOptional()
  @IsEnum(SimCategory)
  simCategory: SimCategory = SimCategory.PERSONAL;

  @IsOptional()
  @IsEnum(SimTechnology)
  simTechnology: SimTechnology = SimTechnology.PHYSICAL;

  @IsUUID('4', { message: 'phoneNumberId must be a valid UUID' })
  phoneNumberId!: string;

  @IsUUID('4', { message: 'planId must be a valid UUID' })
  planId!: string;

  /** Required when simCategory is BUSINESS — the verified organization. */
  @IsOptional()
  @IsUUID('4', { message: 'organizationId must be a valid UUID' })
  organizationId?: string;
}

/**
 * Business SIM onboarding — registers the organization, verifies it
 * (demo: auto-approved), and requests a dedicated 4-digit number prefix.
 */
export class RegisterBusinessDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  businessType?: string;

  /** Optional GSTIN — 15-character format when provided. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, {
    message: 'registrationNumber must be a valid 15-character GSTIN',
  })
  registrationNumber?: string;

  @Transform(normalizeEmail)
  @IsEmail()
  businessEmail!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(255)
  address!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  state!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'postalCode must be a valid 6-digit Indian PIN code',
  })
  postalCode!: string;

  /** Requested 4-digit corporate number prefix (e.g. "0482"). */
  @Transform(trim)
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'numberPrefix must be exactly 4 digits (e.g. "0482")',
  })
  numberPrefix!: string;

  /** Optional employee ID for the owner's membership record. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  employeeId?: string;

  /** StoredFile id of the uploaded GST/business certificate. */
  @IsOptional()
  @IsUUID('4', { message: 'verificationDocumentId must be a valid UUID' })
  verificationDocumentId?: string;
}
