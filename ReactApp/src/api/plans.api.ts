import { api, PaginationMeta } from "@/lib/api";

export type PlanType = "PREPAID" | "POSTPAID" | "BUSINESS" | "VALIDITY_ONLY";

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  type: PlanType;
  price: string | number;
  currency: string;
  validityDays: number;
  dataAllowanceGb: string | number | null;
  /** Derived server-side: dataAllowanceGb × 1024 for per-day plans. */
  dailyDataAllowanceMb: number | null;
  callingBenefit: string;
  smsCount: number | null;
  businessOnly: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isValidityOnly: boolean;
  dataBankEnabled: boolean;
  rolloverLimitMb: number | null;
  rolloverExpiryDays: number | null;
  dataTransferEnabled: boolean;
  transferLimitMb: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
    planSubscriptions: number;
  };
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  type?: PlanType;
  price: number;
  currency?: string;
  validityDays: number;
  dataAllowanceGb?: number | null;
  /** Optional override — derived from dataAllowanceGb when omitted. */
  dailyDataAllowanceMb?: number | null;
  callingBenefit?: string;
  smsCount?: number | null;
  businessOnly?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  isValidityOnly?: boolean;
  dataBankEnabled?: boolean;
  rolloverLimitMb?: number | null;
  rolloverExpiryDays?: number | null;
  dataTransferEnabled?: boolean;
  transferLimitMb?: number | null;
}

export type UpdatePlanInput = Partial<CreatePlanInput>;

export interface ListPlansParams {
  search?: string;
  type?: PlanType;
  isActive?: boolean;
  businessOnly?: boolean;
  isFeatured?: boolean;
  dataBankEnabled?: boolean;
  sortBy?: "price" | "validityDays" | "dataAllowanceGb" | "name" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PlanStats {
  total: number;
  active: number;
  inactive: number;
  featured: number;
  business: number;
  dataBank: number;
  dataTransfer: number;
  prepaid: number;
  postpaid: number;
  validityOnly: number;
}

function qs(params: ListPlansParams) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) {
      p.set(k, String(v));
    }
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const plansApi = {
  list: (params: ListPlansParams = {}) =>
    api.getWithMeta<Plan[], PaginationMeta>(`/api/v1/plans${qs(params)}`),

  get: (id: string) =>
    api.get<{ plan: Plan }>(`/api/v1/plans/${id}`).then((res) => res.plan || (res as unknown as Plan)),

  create: (input: CreatePlanInput) =>
    api.post<Plan>("/api/v1/plans", input),

  update: (id: string, input: UpdatePlanInput) =>
    api.patch<Plan>(`/api/v1/plans/${id}`, input),

  toggleStatus: (id: string) =>
    api.patch<Plan>(`/api/v1/plans/${id}/toggle-status`),

  delete: (id: string) =>
    api.delete<{
      success: boolean;
      deleted: boolean;
      deactivated: boolean;
      message: string;
      plan?: Plan;
    }>(`/api/v1/plans/${id}`),

  getStats: () =>
    api.get<PlanStats>("/api/v1/plans/stats"),
};

export const PLANS_LIST_KEY = ["plans", "list"] as const;
export const PLAN_STATS_KEY = ["plans", "stats"] as const;
export const PLAN_DETAILS_KEY = ["plans", "detail"] as const;
