import { IsInt, Min } from 'class-validator';

export class RedeemDataBankDto {
  /** Amount of banked data to move into today's usage pool (MB). */
  @IsInt()
  @Min(1)
  amountMb!: number;
}
