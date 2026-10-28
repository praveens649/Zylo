import { api, PaginationMeta } from "@/lib/api";

export const ORDERS_LIST_KEY = ["orders", "list"] as const;

export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type OrderType = "SIM_PURCHASE" | "PLAN_PURCHASE" | "RECHARGE";

export interface Order {
  id: string;
  userId: string;
  type: OrderType;
  status: OrderStatus;
  amount: string | number;
  currency: string;
  simId: string | null;
  phoneNumberId: string | null;
  planId: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  plan: { id: string; name: string } | null;
  phoneNumber: { id: string; number: string } | null;
  payment: { id: string; status: string } | null;
}

export interface ListOrdersParams {
  status?: OrderStatus;
  type?: OrderType;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

function qs(params: ListOrdersParams) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const ordersApi = {
  /** Customers get their own orders; admins get all (+ filters). */
  list: (params: ListOrdersParams = {}) =>
    api.getWithMeta<Order[], PaginationMeta>(
      `/api/v1/orders${qs(params)}`
    ),

  get: (id: string) => api.get<Order>(`/api/v1/orders/${id}`),
};
