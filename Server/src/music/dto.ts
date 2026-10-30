import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { trim } from '../common/dto.js';

export class MusicCheckoutDto {
  /** MusicPlan the customer is subscribing to. Price comes from the plan. */
  @IsUUID()
  planId!: string;
}

export class CreateMusicPlanDto {
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  description?: string;

  /** ₹ price — the server is authoritative, the client never sets it. */
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  validityDays?: number;

  /** Display tier only — standard / hd / lossless. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  audioQuality?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDevices?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateMusicPlanDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  validityDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  audioQuality?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDevices?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
