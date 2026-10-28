import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrderStatus, OrderType } from '../generated/prisma/enums.js';
import { PaginationQueryDto } from '../common/dto.js';

export class ListOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  /** Admin-only filter — list orders for a specific user. */
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
