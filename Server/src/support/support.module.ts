import { Module } from '@nestjs/common';
import { SupportController } from './support.controller.js';
import { AdminSupportController } from './admin-support.controller.js';
import { SupportService } from './support.service.js';

/**
 * Customer support — customers file issues against their SIM/TV connection
 * (POST/GET /api/v1/support/tickets); admins triage, reply, and resolve them
 * (/api/v1/admin/support/tickets). Replies and status changes drop a
 * Notification for the customer.
 */
@Module({
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
