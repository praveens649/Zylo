import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller.js';
import { OnboardingService } from './onboarding.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StripeModule } from '../stripe/stripe.module.js';

@Module({
  imports: [PrismaModule, StripeModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
