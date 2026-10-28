import { IsOptional, IsUUID } from 'class-validator';

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
}
