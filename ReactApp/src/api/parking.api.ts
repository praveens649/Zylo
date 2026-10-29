import { api } from "@/lib/api";
import type { SimCategory } from "@/api/sims.api";

/* Zylo Number Parking — shared by Normal SIM and Business SIM users. */

export const PARKING_CONFIG_KEY = ["parking", "config"] as const;
export const PARKING_VAULT_KEY = ["parking", "vault"] as const;

export type ParkingStatus =
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "EXPIRED"
  | "REACTIVATED"
  | "CANCELLED";

export interface ParkingPeriod {
  days: number;
  priceInr: number;
}

/** Server-driven rules — the UI never hardcodes prices or limits. */
export interface ParkingConfig {
  periods: ParkingPeriod[];
  processingFeeInr: number;
  maxExtensions: number;
  currency: string;
  carrierIntegrated: boolean;
}

export interface ParkingCheck {
  label: string;
  passed: boolean;
}

export interface ParkingValidation {
  eligible: boolean;
  code?: string;
  reason?: string;
  number: string | null;
  category?: SimCategory;
  organizationName?: string | null;
  simStatus?: string;
  /** The number's current plan state — parking matters most when it expired. */
  plan?: {
    status: "NONE" | "ACTIVE" | "EXPIRED";
    name: string | null;
    endsAt: string | null;
  };
  checks: ParkingCheck[];
  /** True when no carrier API is configured — eligibility is local/demo. */
  simulated: boolean;
}

export interface ParkingCheckoutResult {
  sessionId: string;
  url: string | null;
  orderId: string;
  parkingId: string;
}

export interface ParkingOrderRecord {
  id: string;
  type: "NUMBER_PARKING" | "NUMBER_PARKING_EXTENSION" | string;
  status: string;
  amount: string;
  currency: string;
  paymentStatus: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface ParkingExtensionRecord {
  id: string;
  durationDays: number;
  previousExpiresAt: string;
  newExpiresAt: string;
  createdAt: string;
}

export interface VaultParking {
  id: string;
  reference: string;
  number: string;
  category: SimCategory;
  organizationName: string | null;
  status: ParkingStatus;
  durationDays: number;
  parkedAt: string | null;
  expiresAt: string | null;
  remainingDays: number;
  extensionsUsed: number;
  maxExtensions: number;
  canExtend: boolean;
  canReactivate: boolean;
  reactivatedAt: string | null;
  extensions: ParkingExtensionRecord[];
  orders: ParkingOrderRecord[];
  createdAt: string;
}

export interface ParkingVault {
  config: ParkingConfig;
  parkings: VaultParking[];
}

export const parkingApi = {
  /** Parking periods, prices, processing fee and extension limits. */
  config: () => api.get<ParkingConfig>("/api/v1/parking/config"),

  /** Step 1 — check a number's format, ownership and parking eligibility. */
  validate: (number: string) =>
    api.post<ParkingValidation>("/api/v1/parking/validate", { number }),

  /** Step 2 — create the parking order + Stripe checkout session. */
  checkout: (input: { number: string; durationDays: number }) =>
    api.post<ParkingCheckoutResult>("/api/v1/parking/checkout", input),

  /** Number Vault — every parking the current user can manage. */
  vault: () => api.get<ParkingVault>("/api/v1/parking/vault"),

  /** Single parking with its payment/extension records. */
  get: (id: string) => api.get<VaultParking>(`/api/v1/parking/${id}`),

  /** Paid extension checkout — same periods as the initial parking. */
  extend: (parkingId: string, durationDays: number) =>
    api.post<ParkingCheckoutResult>(`/api/v1/parking/${parkingId}/extend`, {
      durationDays,
    }),

  /** Reactivate a parked number before its expiry. */
  reactivate: (parkingId: string) =>
    api.post<{ status: ParkingStatus; reactivatedAt: string }>(
      `/api/v1/parking/${parkingId}/reactivate`
    ),
};
