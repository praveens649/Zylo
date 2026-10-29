import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  SupportCategory,
  TicketPriority,
  TicketStatus,
} from '../generated/prisma/enums.js';
import { PaginationQueryDto, trim } from '../common/dto.js';

export class CreateTicketDto {
  @Transform(trim)
  @IsString()
  @MinLength(4)
  @MaxLength(120)
  subject!: string;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  /** Defaults to OTHER when omitted. */
  @IsOptional()
  @IsEnum(SupportCategory)
  category?: SupportCategory;

  /** Optional — link the ticket to one of the customer's own SIMs. */
  @IsOptional()
  @IsUUID()
  simId?: string;

  /** Optional — link the ticket to one of the customer's own TV connections. */
  @IsOptional()
  @IsUUID()
  setTopBoxConnectionId?: string;
}

export class ListTicketsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(SupportCategory)
  category?: SupportCategory;
}

export class AdminListTicketsQueryDto extends ListTicketsQueryDto {
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  /** Matches ticket number, subject, or the customer's name/email. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  search?: string;
}

export class AdminUpdateTicketDto {
  /** Must be a legal transition from the ticket's current status. */
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  /** The reply shown to the customer on their ticket. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  adminReply?: string;
}
