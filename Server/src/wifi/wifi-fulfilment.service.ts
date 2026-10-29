import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { applyPaidPlanPurchase, notify, WIFI_ORDER_TYPES } from './wifi-lifecycle.js';

@Injectable()
export class WifiFulfilmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Called when a payment for an order is confirmed by Stripe. Idempotent:
   * the PENDING -> COMPLETED transition is claimed atomically, so a repeated
   * webhook delivery changes nothing.
   *
   * WIFI_ORDER only becomes COMPLETED here; the connection is NOT
   * activated until installation is completed. WIFI_PLAN_PURCHASE also
   * extends the plan in the same transaction.
   */
  async onOrderPaid(orderId: string, now: Date = new Date()): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || !(WIFI_ORDER_TYPES as readonly string[]).includes(order.type)) return false;

      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'COMPLETED' },
      });
      if (claimed.count === 0) return false;

      if (order.type === 'WIFI_PLAN_PURCHASE') {
        await applyPaidPlanPurchase(tx, orderId, now);
      } else {
        await notify(
          tx,
          order.userId,
          'Zylo WiFi payment received',
          'Payment confirmed. We will assign your router and schedule the installation shortly.',
        );
      }
      return true;
    });
  }
}
