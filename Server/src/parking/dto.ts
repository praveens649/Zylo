import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ValidateParkingNumberDto {
  /** Free-form mobile number — normalized to E.164 (+91…) by the service. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number!: string;
}

export class CreateParkingCheckoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number!: string;

  /** Must match one of the configured parking periods (15/30 by default). */
  @IsInt()
  durationDays!: number;
}

export class ExtendParkingDto {
  /** Must match one of the configured parking periods (15/30 by default). */
  @IsInt()
  durationDays!: number;
}
