import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { trim } from '../common/dto.js';

export class SendTransferDto {
  /** The sender's SIM — must belong to the authenticated customer. */
  @IsUUID()
  simId!: string;

  /** Full Zylo number of the friend receiving the data. */
  @Transform(trim)
  @IsString()
  @Matches(/^\+?\d[\d\s-]{6,18}$/, {
    message: 'targetNumber must be a valid phone number',
  })
  targetNumber!: string;

  /** Amount of banked data to send, MB. Server enforces plan + daily limits. */
  @IsInt()
  @Min(1)
  amountMb!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(140)
  message?: string;

  /**
   * Client-generated key for retry-safe submission. Re-sending the same key
   * returns the original transfer instead of debiting the bank twice.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;
}
