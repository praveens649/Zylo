import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { trim } from '../common/dto.js';

const ISO_COUNTRY = /^[A-Z]{2}$/;

export class ListTravelPlansQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(ISO_COUNTRY, {
    message: 'destinationCountry must be a 2-letter ISO code',
  })
  destinationCountry?: string;
}

export class TravelEsimCheckoutDto {
  @IsString()
  planId!: string;

  @IsDateString()
  departureDate!: string;

  @IsDateString()
  returnDate!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  travellerName!: string;

  /** ISO country code of the issuing country, e.g. "IN". */
  @Transform(trim)
  @IsString()
  @Matches(ISO_COUNTRY, {
    message: 'passportCountry must be a 2-letter ISO code',
  })
  passportCountry!: string;

  @Transform(trim)
  @IsString()
  @Length(6, 12, {
    message: 'Passport number must be 6–12 characters',
  })
  passportNumber!: string;

  @IsDateString()
  passportExpiryDate!: string;

  /** Held destination number to attach to this eSIM — required. */
  @IsString()
  phoneNumberId!: string;
}

export class ListEsimNumbersQueryDto {
  @IsString()
  @Matches(ISO_COUNTRY, {
    message: 'country must be a 2-letter ISO code',
  })
  country!: string;
}

export class HoldEsimNumberDto {
  @IsString()
  numberId!: string;
}

export class AdminListNumbersQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(ISO_COUNTRY, {
    message: 'country must be a 2-letter ISO code',
  })
  country?: string;
}

export class GenerateEsimNumbersDto {
  @IsString()
  @Matches(ISO_COUNTRY, {
    message: 'country must be a 2-letter ISO code',
  })
  country!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count?: number;
}

export class CreateInternationalPlanDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  description?: string;

  @Transform(trim)
  @IsString()
  @Matches(ISO_COUNTRY)
  destinationCountry!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  dataAllowanceMb!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  validityDays!: number;

  /** Optional voice minutes; omit for data-only packs. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  callMinutes?: number;

  /** Optional bundled SMS count; omit for data-only packs. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  smsCount?: number;

  /** Price in paise (₹399 → 39900). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pricePaise!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  currency?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  providerName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  providerPlanCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateInternationalPlanDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(ISO_COUNTRY)
  destinationCountry?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dataAllowanceMb?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  validityDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  callMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  smsCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pricePaise?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  currency?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  providerName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  providerPlanCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
