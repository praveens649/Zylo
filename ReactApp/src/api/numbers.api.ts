import { api, PaginationMeta } from "@/lib/api";

export const NUMBERS_AVAILABLE_KEY = ["numbers", "available"] as const;
export const NUMBERS_ADMIN_KEY = ["numbers", "admin"] as const;

export type PhoneNumberStatus = "AVAILABLE" | "RESERVED" | "ASSIGNED";
export type PhoneNumberType = "STANDARD" | "PREMIUM";
export type NumberCategory = "PERSONAL" | "BUSINESS";

export interface PhoneNumber {
  id: string;
  number: string;
  prefix: string | null;
  type: PhoneNumberType;
  price: number | string;
  status: PhoneNumberStatus;
  reservedUntil: string | null;
  organizationId: string | null;
  organization?: {
    id: string;
    name: string;
    numberPrefix: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateNumbersPayload {
  type: NumberCategory;
  count?: number;
  prefix?: string;
  organizationId?: string;
  allowPremium?: boolean;
}

export interface GenerateNumbersResponse {
  message: string;
  category: NumberCategory;
  totalGenerated: number;
  premiumCount?: number;
  standardCount?: number;
  prefix?: string;
  organizationId?: string | null;
  organizationName?: string;
  numbers: PhoneNumber[];
}

export interface ListAvailableNumbersParams {
  category?: NumberCategory;
  type?: PhoneNumberType;
  organizationId?: string;
  prefix?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminInventoryResponse {
  data: PhoneNumber[];
  stats: {
    AVAILABLE: number;
    RESERVED: number;
    ASSIGNED: number;
  };
  meta: PaginationMeta;
}

function qs(params: Record<string, unknown>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      p.set(k, String(v));
    }
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const numbersApi = {
  /** Customer Onboarding: Query available phone numbers to pick for a SIM. */
  getAvailable: (params: ListAvailableNumbersParams = {}) =>
    api.getWithMeta<PhoneNumber[], PaginationMeta>(
      `/api/v1/numbers/available${qs(params as Record<string, unknown>)}`
    ),

  /** Customer Onboarding: Hold a chosen number for 15 minutes during checkout. */
  reserve: (numberId: string, holdMinutes = 15) =>
    api.post<{ message: string; number: string; numberId: string; reservedUntil: string }>(
      "/api/v1/numbers/reserve",
      { numberId, holdMinutes }
    ),

  /** Customer Checkout: Release hold. */
  release: (numberId: string) =>
    api.post<{ message: string; number: string; status: PhoneNumberStatus }>(
      "/api/v1/numbers/release",
      { numberId }
    ),

  /** Admin: Generate batch of 10 (or custom) numbers using the server number engine. */
  generate: (payload: GenerateNumbersPayload) =>
    api.post<GenerateNumbersResponse>("/api/v1/numbers/generate", payload),

  /** Admin: Full inventory list and stats. */
  getAdminInventory: (params: ListAvailableNumbersParams = {}) =>
    api.get<AdminInventoryResponse>(
      `/api/v1/numbers/admin/inventory${qs(params as Record<string, unknown>)}`
    ),

  /** Admin: Remove unassigned number. */
  delete: (id: string) =>
    api.delete<{ message: string }>(`/api/v1/numbers/admin/${id}`),
};
