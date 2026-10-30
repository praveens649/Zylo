import { PrismaService } from '../prisma/prisma.service.js';
import { getStripeClient } from '../stripe/stripe-client.js';
import { tvConfig } from './tv.config.js';
import type { RentCharger } from './tv-lifecycle.js';

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

/**
 * Real off-session rent charge through Stripe. The customer's card is read back
 * from their latest successful payment — the rental checkout (and any manual
 * rent payment) saves it with `setup_future_usage: 'off_session'`, so the most
 * recent paid order always points at the card to charge.
 *
 * Each charge is idempotency-keyed on the rent order, so a retry can never
 * double-debit the customer.
 */
export function stripeRentCharger(prisma: PrismaService): RentCharger {
  return async (conn, amountPaise, orderId) => {
    const stripe = getStripeClient();
    if (!stripe) return { ok: false, message: 'Stripe is not configured' };

    const lastPaidOrder = await prisma.order.findFirst({
      where: { setTopBoxConnectionId: conn.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const payment = lastPaidOrder
      ? await prisma.payment.findFirst({
          where: { orderId: lastPaidOrder.id, status: 'SUCCEEDED', stripePaymentIntentId: { not: null } },
          select: { stripePaymentIntentId: true },
        })
      : null;
    if (!payment?.stripePaymentIntentId) {
      return { ok: false, message: 'no saved card on file' };
    }

    const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
    const paymentMethod = idOf(pi.payment_method);
    const customer = idOf(pi.customer);
    if (!paymentMethod || !customer) {
      return { ok: false, message: 'card was not saved for autopay' };
    }

    try {
      const charge = await stripe.paymentIntents.create(
        {
          amount: amountPaise,
          currency: tvConfig.currency,
          customer,
          payment_method: paymentMethod,
          off_session: true,
          confirm: true,
          description: `Zylo TV monthly rent — ${conn.connectionNumber}`,
          metadata: { kind: 'tv-rent', orderId, connectionId: conn.id },
        },
        { idempotencyKey: `tv-rent:${conn.id}:${orderId}` },
      );
      return charge.status === 'succeeded'
        ? { ok: true, paymentIntentId: charge.id }
        : { ok: false, message: `payment status ${charge.status}` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  };
}
