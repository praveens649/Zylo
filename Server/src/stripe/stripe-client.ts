import Stripe from 'stripe';
import { ApiException } from '../common/api-error.js';

let client: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

const DEFAULT_CURRENCY = (
  process.env.STRIPE_CURRENCY ||
  process.env.STRIPE_PLAN_CURRENCY ||
  'usd'
).toLowerCase();

function stripeFail(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  throw new ApiException(
    502,
    'STRIPE_API_FAILED',
    `Stripe operation failed: ${msg}`,
  );
}

/** Create a Stripe Product. */
export async function createProduct(input: {
  name: string;
  description?: string | null;
}): Promise<string> {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new ApiException(
      503,
      'STRIPE_NOT_CONFIGURED',
      'Stripe is not configured on this server',
    );
  }

  try {
    const product = await stripe.products.create({
      name: input.name,
      description: input.description ?? undefined,
    });
    return product.id;
  } catch (err) {
    stripeFail(err);
  }
}

/** Create a recurring Price on a Product. Amount is in major currency units. */
export async function createRecurringPrice(
  productId: string,
  amountMajor: number,
  interval: 'month' | 'year',
  currency = DEFAULT_CURRENCY,
): Promise<string> {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new ApiException(
      503,
      'STRIPE_NOT_CONFIGURED',
      'Stripe is not configured on this server',
    );
  }
  try {
    const price = await stripe.prices.create({
      product: productId,
      currency: currency.toLowerCase(),
      unit_amount: Math.round(amountMajor * 100),
      recurring: { interval },
    });
    return price.id;
  } catch (err) {
    stripeFail(err);
  }
}

/** Create a one-time Price on a Product. Amount is in major currency units. */
export async function createOneTimePrice(
  productId: string,
  amountMajor: number,
  currency = DEFAULT_CURRENCY,
): Promise<string> {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new ApiException(
      503,
      'STRIPE_NOT_CONFIGURED',
      'Stripe is not configured on this server',
    );
  }
  try {
    const price = await stripe.prices.create({
      product: productId,
      currency: currency.toLowerCase(),
      unit_amount: Math.round(amountMajor * 100),
    });
    return price.id;
  } catch (err) {
    stripeFail(err);
  }
}

/** Archive a Price (deactivate). */
export async function archivePrice(priceId: string): Promise<void> {
  const stripe = getStripeClient();
  if (!stripe || !priceId) return;
  try {
    await stripe.prices.update(priceId, { active: false });
  } catch {
    /* best effort */
  }
}

/** Archive a Product (deactivate). */
export async function archiveProduct(productId: string): Promise<void> {
  const stripe = getStripeClient();
  if (!stripe || !productId) return;
  try {
    await stripe.products.update(productId, { active: false });
  } catch {
    /* best effort */
  }
}
