import { Module } from '@nestjs/common';
import { TvController } from './tv.controller.js';
import { TvAdminController } from './tv-admin.controller.js';
import { TvCustomerService } from './tv-customer.service.js';
import { TvCheckoutService } from './tv-checkout.service.js';
import { TvAdminService } from './tv-admin.service.js';
import { TvFulfilmentService } from './tv-fulfilment.service.js';
import { TvJobsService } from './tv-jobs.service.js';

@Module({
  controllers: [TvController, TvAdminController],
  providers: [TvCustomerService, TvCheckoutService, TvAdminService, TvFulfilmentService, TvJobsService],
  exports: [TvFulfilmentService],
})
export class SetTopBoxModule {}
