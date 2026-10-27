import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsNumber()
  @Min(0.5)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class CreateSubscriptionCheckoutDto {
  @IsString()
  priceId!: string;

  @IsOptional()
  @IsString()
  planName?: string;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class CreatePortalSessionDto {
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
