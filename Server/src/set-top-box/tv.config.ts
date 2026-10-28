const num = (key: string, fallback: number) => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && process.env[key] !== undefined ? v : fallback;
};

/** Business knobs — read lazily so .env changes and tests take effect. */
export const tvConfig = {
  get graceDays() {
    return num('TV_GRACE_DAYS', 3);
  },
  get maxPauseDaysPerYear() {
    return num('TV_MAX_PAUSE_DAYS_PER_YEAR', 30);
  },
  get returnDueDays() {
    return num('TV_RENTAL_RETURN_DAYS', 7);
  },
  /** Percent off pack prices when the connection is linked to the customer's own active SIM. */
  get simBundleDiscountPercent() {
    return Math.min(100, Math.max(0, num('TV_SIM_BUNDLE_DISCOUNT_PERCENT', 0)));
  },
  currency: 'inr',
};
