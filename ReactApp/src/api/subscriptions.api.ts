import { api } from "@/lib/api";

export const SUBSCRIPTION_KEY = ["subscriptions", "me"] as const;

export type SubscriptionStatus =
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "INCOMPLETE"
  | "CANCELLED"
  | "EXPIRED"
  | "UNPAID";

export interface SubscriptionRecord {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  plan: string | null;
  status: string;
  subscriptionStatus: SubscriptionStatus;
  billingInterval: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export const subscriptionsApi = {
  /** The current user's stored subscription (null until first checkout). */
  getMine: () =>
    api.get<SubscriptionRecord | null>("/api/v1/stripe/subscription/me"),

  /** Create a Stripe Checkout Session for subscription — returns { sessionId, url }. */
  createCheckout: (priceId: string, planName?: string) =>
    api.post<{ sessionId: string; url: string }>(
      "/api/v1/stripe/subscription/checkout",
      {
        priceId,
        planName,
      }
    ),

  /** Create a one-time Stripe Checkout Session — returns { sessionId, url }. */
  createOneTimeCheckout: (opts: {
    amount: number;
    currency?: string;
    name: string;
    description?: string;
  }) =>
    api.post<{ sessionId: string; url: string }>(
      "/api/v1/stripe/checkout",
      opts
    ),

  /** Explicitly verify checkout session with Stripe. */
  verifyCheckout: (sessionId: string) =>
    api.post<{ verified: boolean; session?: Record<string, unknown> }>(
      `/api/v1/stripe/subscription/verify?session_id=${encodeURIComponent(
        sessionId
      )}`
    ),

  /** Create customer billing portal session URL. */
  createPortal: (returnUrl?: string) =>
    api.post<{ url: string }>("/api/v1/stripe/portal", { returnUrl }),
};

export const stripeApi = subscriptionsApi;
