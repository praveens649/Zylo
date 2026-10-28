import { Transform } from 'class-transformer';
import {
  IsDateString,
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
import { trim } from '../common/dto.js';

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
}
