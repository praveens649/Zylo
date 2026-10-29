import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { trim } from '../common/dto.js';

export class CreateRechargeCheckoutDto {
  /**
   * Optional — when omitted, a Zylo number + SIM is provisioned for the
   * customer automatically once the payment succeeds.
   */
  @IsOptional()
  @IsUUID()
  simId?: string;

  @IsUUID()
  planId!: string;

  /**
   * Gift recharge — a full Zylo number belonging to another customer.
   * The payer owns the order/payment; the plan lands on the recipient's SIM.
   */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^\+?\d[\d\s-]{6,18}$/, {
    message: 'targetNumber must be a valid phone number',
  })
  targetNumber?: string;
}
