import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
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

  /**
   * Quest coupon code (ZYLO-XXXX) — applies a recharge discount to this
   * checkout when valid and the plan meets the coupon's minimum purchase.
   */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  couponCode?: string;
}
