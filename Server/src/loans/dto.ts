import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DataLoanStatus } from '../generated/prisma/enums.js';
import { PaginationQueryDto, trim } from '../common/dto.js';

export class BorrowLoanDto {
  @IsUUID()
  simId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountMb: number;
}

export class RepayLoanDto {
  @IsUUID()
  simId: string;
}

export class ListAdminLoansQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DataLoanStatus)
  status?: DataLoanStatus;

  /** Matches customer name/email or the SIM's Zylo number. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  search?: string;
}

export class CancelLoanDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason: string;
}

export class RunNightlyQueryDto {
  /** ISO date/time to run the job "as of" — lets the demo skip days ahead. */
  @IsOptional()
  @IsDateString()
  asOf?: string;
}
