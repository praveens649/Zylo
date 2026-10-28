import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { PlanType } from '../generated/prisma/enums.js';
import { PaginationQueryDto, toBool, trim } from '../common/dto.js';

export class CreatePlanDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Plan name must be at least 2 characters long' })
  name: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PlanType)
  type?: PlanType = PlanType.PREPAID;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price cannot be negative' })
  price: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  currency?: string = 'inr';

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Validity must be at least 1 day' })
  validityDays: number = 28;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dataAllowanceGb?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  callingBenefit?: string = 'Unlimited';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  smsCount?: number;

  @IsOptional()
  @IsBoolean()
  businessOnly?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isValidityOnly?: boolean = false;

  @IsOptional()
  @IsBoolean()
  dataBankEnabled?: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rolloverLimitMb?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rolloverExpiryDays?: number;

  @IsOptional()
  @IsBoolean()
  dataTransferEnabled?: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  transferLimitMb?: number;
}

export class UpdatePlanDto {
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
  @IsEnum(PlanType)
  type?: PlanType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  validityDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dataAllowanceGb?: number | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  callingBenefit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  smsCount?: number | null;

  @IsOptional()
  @IsBoolean()
  businessOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isValidityOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  dataBankEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rolloverLimitMb?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rolloverExpiryDays?: number | null;

  @IsOptional()
  @IsBoolean()
  dataTransferEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  transferLimitMb?: number | null;
}

export class ListPlansQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(PlanType)
  type?: PlanType;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  businessOnly?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  dataBankEnabled?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  sortBy?: 'price' | 'validityDays' | 'dataAllowanceGb' | 'name' | 'createdAt' = 'createdAt';

  @IsOptional()
  @Transform(trim)
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
