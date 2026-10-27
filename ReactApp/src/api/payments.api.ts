import { api, PaginationMeta } from "@/lib/api";

export const PAYMENTS_LIST_KEY = ["payments", "list"] as const;

export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export type PaymentType = "ONE_TIME" | "SUBSCRIPTION";

export interface Payment {
  id: string;
  userId: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: string | number;
  currency: string;
  description?: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeInvoiceId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface ListPaymentsParams {
  status?: PaymentStatus;
  type?: PaymentType;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

function qs(params: ListPaymentsParams) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const paymentsApi = {
  /** Customers get their own payments; admins get all (+ filters). */
  list: (params: ListPaymentsParams = {}) =>
    api.getWithMeta<Payment[], PaginationMeta>(
      `/api/v1/payments${qs(params)}`
    ),

  get: (id: string) => api.get<Payment>(`/api/v1/payments/${id}`),
};
