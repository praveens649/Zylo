const num = (key: string, fallback: number) => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && process.env[key] !== undefined ? v : fallback;
};

export interface ParkingPeriod {
  days: number;
  priceInr: number;
}

/**
 * Number Parking business rules — read lazily so .env changes and tests
 * take effect. The demo defaults mirror the product spec (₹29 / ₹49, two
 * extensions) and are overridable via environment variables; admins never
 * edit them through an API.
 */
export const parkingConfig = {
  /**
   * Offered parking durations and their prices (same for initial +
   * extension). Note: Stripe Checkout requires ≥ ~$0.50 (~₹50), so the
   * defaults sit above that floor — the ₹29/₹49 spec examples cannot be
   * charged through Stripe.
   */
  get periods(): ParkingPeriod[] {
    return [
      { days: 15, priceInr: num('PARKING_PRICE_15_INR', 59) },
      { days: 30, priceInr: num('PARKING_PRICE_30_INR', 99) },
    ].sort((a, b) => a.days - b.days);
  },
  /** Maximum number of paid extensions per parking. */
  get maxExtensions() {
    return Math.max(0, num('PARKING_MAX_EXTENSIONS', 2));
  },
  /** Flat processing fee added to every parking/extension order. */
  get processingFeeInr() {
    return Math.max(0, num('PARKING_PROCESSING_FEE_INR', 0));
  },
  currency: 'inr',
};

export function periodForDays(days: number): ParkingPeriod | undefined {
  return parkingConfig.periods.find((p) => p.days === days);
}
