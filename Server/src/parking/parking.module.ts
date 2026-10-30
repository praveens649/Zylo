import { Module } from '@nestjs/common';
import { ParkingController } from './parking.controller.js';
import { ParkingService } from './parking.service.js';
import { ParkingCarrierClient } from './parking-carrier.js';

/**
 * Number Parking flow (Normal + Business SIMs share it):
 *   GET  /api/v1/parking/config        — periods, prices, extension rules
 *   POST /api/v1/parking/validate      — number format + ownership + eligibility
 *   POST /api/v1/parking/checkout      — order + Stripe checkout session
 *   GET  /api/v1/parking/vault         — parkings the user can manage
 *   GET  /api/v1/parking/:id           — single parking detail/receipts
 *   POST /api/v1/parking/:id/extend    — paid extension checkout
 *   POST /api/v1/parking/:id/reactivate — early unpark
 *
 * Activation happens in ParkingService.fulfillOrder, triggered by the
 * Stripe webhook (or the session-verify fallback) via StripeModule —
 * never from a client redirect alone.
 */
@Module({
  controllers: [ParkingController],
  providers: [ParkingService, ParkingCarrierClient],
  exports: [ParkingService],
})
export class ParkingModule {}
