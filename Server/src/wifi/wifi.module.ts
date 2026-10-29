import { Module } from '@nestjs/common';
import { WifiController } from './wifi.controller.js';
import { WifiAdminController } from './wifi-admin.controller.js';
import { WifiCustomerService } from './wifi-customer.service.js';
import { WifiCheckoutService } from './wifi-checkout.service.js';
import { WifiAdminService } from './wifi-admin.service.js';
import { WifiFulfilmentService } from './wifi-fulfilment.service.js';
import { WifiJobsService } from './wifi-jobs.service.js';

@Module({
  controllers: [WifiController, WifiAdminController],
  providers: [WifiCustomerService, WifiCheckoutService, WifiAdminService, WifiFulfilmentService, WifiJobsService],
  exports: [WifiFulfilmentService],
})
export class WifiModule {}
