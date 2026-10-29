const num = (key: string, fallback: number) => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && process.env[key] !== undefined ? v : fallback;
};

/** Business knobs — read lazily so .env changes and tests take effect. */
export const wifiConfig = {
  get graceDays() {
    return num('WIFI_GRACE_DAYS', 3);
  },
  get maxPauseDaysPerYear() {
    return num('WIFI_MAX_PAUSE_DAYS_PER_YEAR', 30);
  },
  get returnDueDays() {
    return num('WIFI_RENTAL_RETURN_DAYS', 7);
  },
  /** Percent off plan prices when the connection is linked to the customer's own active SIM. */
  get simBundleDiscountPercent() {
    return Math.min(100, Math.max(0, num('WIFI_SIM_BUNDLE_DISCOUNT_PERCENT', 0)));
  },
  currency: 'inr',
};
