import { api } from "@/lib/api";
import type { PlanType } from "@/api/plans.api";
import type { SimCategory, SimStatus, SimTechnology } from "@/api/sims.api";

export type PlanSubscriptionStatus =
  | "PENDING"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED";

export interface RechargePlanSummary {
  id: string;
  name: string;
  type: PlanType;
  price: string | number;
  currency: string;
  validityDays: number;
  dataAllowanceGb: string | number | null;
  callingBenefit: string;
  smsCount: number | null;
}

export interface RechargeSubscription {
  id: string;
  status: PlanSubscriptionStatus;
  startDate: string | null;
  endDate: string | null;
  plan: RechargePlanSummary;
}

export interface RechargeSim {
  id: string;
  number: string;
  category: SimCategory;
  technology: SimTechnology;
  status: SimStatus;
  currentPlan: RechargeSubscription | null;
  upcomingPlans: RechargeSubscription[];
}

export interface RechargeOverview {
  sims: RechargeSim[];
}

export interface RechargeCheckoutResult {
  sessionId: string;
  url: string | null;
  orderId: string;
}

/** A Zylo customer found by full phone number (gift recharge). */
export interface RechargeRecipient {
  simId: string;
  name: string;
  number: string;
  category: string;
}

/** An unused quest coupon redeemable at recharge checkout. */
export interface RechargeCoupon {
  code: string;
  name: string;
  discountPaise: number;
  minPurchasePaise: number | null;
  expiresAt: string | null;
}

export const rechargeApi = {
  /** The customer's SIMs with current + queued plan subscriptions. */
  overview: () => api.get<RechargeOverview>("/api/v1/recharge/overview"),

  /** Gift recharge — exact-match customer lookup by phone number. */
  lookup: (number: string) =>
    api.get<{ recipient: RechargeRecipient | null }>(
      `/api/v1/recharge/lookup?number=${encodeURIComponent(number)}`
    ),

  /** The customer's unused quest coupons usable at checkout. */
  coupons: () =>
    api.get<{ coupons: RechargeCoupon[] }>("/api/v1/recharge/coupons"),

  /**
   * Start a recharge — returns the Stripe hosted checkout URL. `simId` is
   * optional; without it a new Zylo number is provisioned on activation.
   * `targetNumber` recharges someone else's Zylo number (gift).
   */
  createCheckout: (input: {
    simId?: string;
    planId: string;
    targetNumber?: string;
    couponCode?: string;
  }) => api.post<RechargeCheckoutResult>("/api/v1/recharge/checkout", input),
};

export const RECHARGE_OVERVIEW_KEY = ["recharge", "overview"] as const;
