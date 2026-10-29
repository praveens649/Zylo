import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TravelEsimController } from './travel-esim.controller.js';
import { TravelEsimService } from './travel-esim.service.js';

/**
 * Travel eSIM flow:
 *   GET  /api/v1/travel-esim/destinations            — countries with plans
 *   GET  /api/v1/travel-esim/plans?destinationCountry=SG
 *   POST /api/v1/travel-esim/checkout                — order + Stripe session
 *   POST /api/v1/travel-esim/verify?session_id=      — verify + fulfill
 *   GET  /api/v1/travel-esim/orders                  — customer eSIM orders
 *   GET  /api/v1/travel-esim/orders/:reference       — detail + QR payload
 *   POST /api/v1/travel-esim/orders/:reference/activate — simulated install
 *   POST /api/v1/travel-esim/admin/plans             — admin plan CRUD
 * Fulfillment also runs from the Stripe webhook via StripeModule.
 */
@Module({
  imports: [AuthModule],
  controllers: [TravelEsimController],
  providers: [TravelEsimService],
  exports: [TravelEsimService],
})
export class TravelEsimModule {}
