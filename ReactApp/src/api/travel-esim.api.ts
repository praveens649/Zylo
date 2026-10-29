import { api } from "@/lib/api";

export interface InternationalPlan {
  id: string;
  name: string;
  description: string | null;
  destinationCountry: string;
  dataAllowanceMb: number;
  validityDays: number;
  callMinutes: number | null;
  smsCount: number | null;
  pricePaise: number;
  currency: string;
  providerName: string | null;
  providerPlanCode: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { orders: number };
}

export interface TravelDestination {
  country: string;
  planCount: number;
  fromPricePaise: number | null;
}

export type TravelEsimStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "READY_TO_ACTIVATE"
  | "ACTIVATED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | "REFUNDED";

export interface TravelEsimOrder {
  id: string;
  reference: string;
  status: TravelEsimStatus;
  destinationCountry: string;
  departureDate: string;
  returnDate: string;
  travellerName: string;
  passportCountry: string;
  amountPaise: number;
  currency: string;
  activatedAt: string | null;
  activationExpiresAt: string | null;
  failureReason: string | null;
  createdAt: string;
  number: string | null;
  plan: {
    id?: string;
    name: string;
    dataAllowanceMb: number;
    validityDays: number;
    callMinutes?: number | null;
    smsCount?: number | null;
    providerName?: string | null;
  };
  esim: {
    activationCode: string | null;
    qrCodeData: string | null;
  } | null;
}

export interface TravellerDetails {
  travellerName: string;
  passportCountry: string;
  passportNumber: string;
  passportExpiryDate: string;
  phoneNumberId?: string;
}

export interface TravelEsimCheckoutInput extends TravellerDetails {
  planId: string;
  departureDate: string;
  returnDate: string;
  phoneNumberId?: string;
}

export interface EsimDestinationNumber {
  id: string;
  number: string;
  prefix: string | null;
  type: "STANDARD" | "PREMIUM";
  status: string;
  reservedUntil: string | null;
  reservedById: string | null;
}

export const travelEsimApi = {
  destinations: () =>
    api
      .get<{ destinations: TravelDestination[] }>(
        "/api/v1/travel-esim/destinations"
      )
      .then((r) => r.destinations),

  plans: (destinationCountry?: string) =>
    api
      .get<{ plans: InternationalPlan[] }>(
        `/api/v1/travel-esim/plans${
          destinationCountry
            ? `?destinationCountry=${encodeURIComponent(destinationCountry)}`
            : ""
        }`
      )
      .then((r) => r.plans),

  createCheckout: (input: TravelEsimCheckoutInput) =>
    api.post<{ sessionId: string; url: string | null; orderId: string }>(
      "/api/v1/travel-esim/checkout",
      input
    ),

  verify: (sessionId: string) =>
    api.post<{ verified: boolean; order?: TravelEsimOrder }>(
      `/api/v1/travel-esim/verify?session_id=${encodeURIComponent(sessionId)}`
    ),

  myOrders: () =>
    api
      .get<{ orders: TravelEsimOrder[] }>("/api/v1/travel-esim/orders")
      .then((r) => r.orders),

  orderDetail: (reference: string) =>
    api.get<TravelEsimOrder>(`/api/v1/travel-esim/orders/${reference}`),

  activate: (reference: string) =>
    api.post<TravelEsimOrder>(
      `/api/v1/travel-esim/orders/${encodeURIComponent(reference)}/activate`
    ),

  // ---- Destination numbers (10-minute hold) ----
  numbers: (country: string) =>
    api
      .get<{ numbers: EsimDestinationNumber[] }>(
        `/api/v1/travel-esim/numbers?country=${encodeURIComponent(country)}`
      )
      .then((r) => r.numbers),

  holdNumber: (numberId: string) =>
    api.post<{
      number: string;
      numberId: string;
      holdMinutes: number;
      reservedUntil: string;
    }>("/api/v1/travel-esim/numbers/hold", { numberId }),

  releaseNumber: (numberId: string) =>
    api.post<{ released: boolean }>(
      `/api/v1/travel-esim/numbers/${encodeURIComponent(numberId)}/release`
    ),

  // ---- Admin plan management (SUPER_ADMIN only) ----
  adminCreatePlan: (input: CreateInternationalPlanInput) =>
    api.post<InternationalPlan>("/api/v1/travel-esim/admin/plans", input),

  adminUpdatePlan: (id: string, input: UpdateInternationalPlanInput) =>
    api.patch<InternationalPlan>(
      `/api/v1/travel-esim/admin/plans/${id}`,
      input
    ),

  adminTogglePlan: (id: string) =>
    api.patch<InternationalPlan>(
      `/api/v1/travel-esim/admin/plans/${id}/toggle`
    ),

  adminDeletePlan: (id: string) =>
    api.delete<{
      deleted: boolean;
      deactivated: boolean;
      message: string;
    }>(`/api/v1/travel-esim/admin/plans/${id}`),

  // ---- Admin number inventory ----
  adminNumbers: (country?: string) =>
    api.get<{
      numbers: AdminEsimNumber[];
      summary: Record<
        string,
        { total: number; inStock: number; held: number; used: number }
      >;
    }>(
      `/api/v1/travel-esim/admin/numbers${country ? `?country=${encodeURIComponent(country)}` : ""}`
    ),

  adminGenerateNumbers: (country: string, count = 10) =>
    api.post<{ created: string[]; count: number; country: string }>(
      "/api/v1/travel-esim/admin/numbers/generate",
      { country, count }
    ),
};

export interface AdminEsimNumber {
  id: string;
  number: string;
  prefix: string | null;
  type: "STANDARD" | "PREMIUM";
  status: "AVAILABLE" | "RESERVED" | "ASSIGNED";
  countryCode: string;
  reservedUntil: string | null;
  reservedByUserId: string | null;
}

export interface CreateInternationalPlanInput {
  name: string;
  description?: string;
  destinationCountry: string;
  dataAllowanceMb: number;
  validityDays: number;
  callMinutes?: number;
  smsCount?: number;
  pricePaise: number;
  currency?: string;
  providerName?: string;
  providerPlanCode?: string;
  isActive?: boolean;
}

export type UpdateInternationalPlanInput =
  Partial<CreateInternationalPlanInput>;

export const TRAVEL_DESTINATIONS_KEY = ["travel-esim", "destinations"] as const;
export const TRAVEL_PLANS_KEY = ["travel-esim", "plans"] as const;
export const TRAVEL_ORDERS_KEY = ["travel-esim", "orders"] as const;
