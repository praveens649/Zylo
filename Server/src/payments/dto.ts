import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  PaymentStatus,
  PaymentType,
} from '../generated/prisma/enums.js';
import { PaginationQueryDto } from '../common/dto.js';

export class ListPaymentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  /** Admin-only filter — list payments for a specific user. */
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
