const num = (key: string, fallback: number) => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && process.env[key] !== undefined ? v : fallback;
};

/** Business knobs for P2P data transfers — read lazily so tests can stub them. */
export const transferConfig = {
  /** Smallest transfer allowed, MB. */
  get minMb() {
    return num('DATA_TRANSFER_MIN_MB', 10);
  },
  /** Per-transfer cap when the sender's plan does not set transferLimitMb, MB. */
  get maxMb() {
    return num('DATA_TRANSFER_MAX_MB', 2048);
  },
  /** Total a SIM may send per IST day, MB. */
  get dailyLimitMb() {
    return num('DATA_TRANSFER_DAILY_LIMIT_MB', 5120);
  },
};
