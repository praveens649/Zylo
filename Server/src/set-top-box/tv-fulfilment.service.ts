import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { applyPaidPackPurchase, notify, rentPaidUntilFrom, TV_ORDER_TYPES } from './tv-lifecycle.js';

@Injectable()
export class TvFulfilmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Called when a payment for an order is confirmed by Stripe. Idempotent:
   * the PENDING -> COMPLETED transition is claimed atomically, so a repeated
   * webhook delivery changes nothing.
   *
   * SET_TOP_BOX_ORDER only becomes COMPLETED here; the connection is NOT
   * activated until installation is completed. TV_PACK_PURCHASE also extends
   * the pack in the same transaction.
   */
  async onOrderPaid(orderId: string, now: Date = new Date()): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || !(TV_ORDER_TYPES as readonly string[]).includes(order.type)) return false;

      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'COMPLETED' },
      });
      if (claimed.count === 0) return false;

      if (order.type === 'TV_PACK_PURCHASE') {
        await applyPaidPackPurchase(tx, orderId, now);
      } else if (order.setTopBoxModelId == null && order.setTopBoxConnectionId) {
        // Monthly rent order (SET_TOP_BOX_ORDER without a model): the derived
        // paid-month count already advanced when the order went COMPLETED.
        const conn = await tx.setTopBoxConnection.findUnique({
          where: { id: order.setTopBoxConnectionId },
          select: { connectionNumber: true, activatedAt: true },
        });
        const months = await tx.order.count({
          where: { setTopBoxConnectionId: order.setTopBoxConnectionId, type: 'SET_TOP_BOX_ORDER', status: 'COMPLETED' },
        });
        await notify(
          tx,
          order.userId,
          'Zylo TV rent received',
          `Rent for ${conn?.connectionNumber ?? 'your box'} was paid. Box covered till ${conn?.activatedAt ? rentPaidUntilFrom(conn.activatedAt, months).toDateString() : 'the next due date'}.`,
        );
      } else {
        await notify(
          tx,
          order.userId,
          'Zylo TV payment received',
          'Payment confirmed. We will assign your box and schedule the installation shortly.',
        );
      }
      return true;
    });
  }
}
