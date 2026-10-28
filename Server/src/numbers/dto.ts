import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { PhoneNumberType } from '../generated/prisma/enums.js';
import { PaginationQueryDto, toBool, trim } from '../common/dto.js';

export const NumberGenerationCategory = {
  PERSONAL: 'PERSONAL',
  BUSINESS: 'BUSINESS',
} as const;

export type NumberGenerationCategory =
  (typeof NumberGenerationCategory)[keyof typeof NumberGenerationCategory];

export class GenerateNumbersDto {
  @Transform(trim)
  @IsEnum(NumberGenerationCategory, {
    message: 'type must be either PERSONAL or BUSINESS',
  })
  type: NumberGenerationCategory = NumberGenerationCategory.PERSONAL;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  count: number = 10;

  /**
   * For BUSINESS generation: 4-digit prefix (e.g. "0482", "8001").
   * Required if type is BUSINESS and organization has no prefix.
   */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'prefix must be exactly 4 digits (e.g. "0482")',
  })
  prefix?: string;

  /**
   * For BUSINESS generation: Links numbers to an existing BusinessOrganization.
   */
  @IsOptional()
  @IsUUID('4', { message: 'organizationId must be a valid UUID' })
  organizationId?: string;

  /**
   * For PERSONAL generation: whether to classify and include premium vanity numbers.
   */
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  allowPremium: boolean = true;
}

export class ListAvailableNumbersDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsIn(['PERSONAL', 'BUSINESS'])
  category?: 'PERSONAL' | 'BUSINESS';

  @IsOptional()
  @IsEnum(PhoneNumberType)
  type?: PhoneNumberType;

  @IsOptional()
  @IsUUID('4', { message: 'organizationId must be a valid UUID' })
  organizationId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  prefix?: string;

  /** Search by partial number or pattern (e.g. "786", "9999", "1234") */
  @IsOptional()
  @Transform(trim)
  @IsString()
  search?: string;
}

export class ReserveNumberDto {
  @IsUUID('4', { message: 'numberId must be a valid UUID' })
  numberId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(60)
  holdMinutes: number = 15;
}

export class ReleaseNumberDto {
  @IsUUID('4', { message: 'numberId must be a valid UUID' })
  numberId!: string;
}
