import { api, PaginationMeta } from "@/lib/api";

export type TvPlanType = "BASE" | "ADD_ON";
export type BoxResolution = "HD" | "UHD_4K";
export type BoxOwnership = "PURCHASE" | "RENTAL";
export type InstallationSlot = "MORNING" | "AFTERNOON" | "EVENING";
export type InstallationStatus =
  | "REQUESTED"
  | "SCHEDULED"
  | "RESCHEDULED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
export type TvConnectionStatus =
  | "PENDING_INSTALLATION"
  | "ACTIVE"
  | "PAUSED"
  | "GRACE_PERIOD"
  | "SUSPENDED"
  | "DISCONNECTED"
  | "CANCELLED";
export type UnitStatus =
  | "IN_STOCK"
  | "RESERVED"
  | "ASSIGNED"
  | "INSTALLED"
  | "FAULTY"
  | "RETURNED"
  | "RETIRED";

type Money = string | number | null;

export interface TvBox {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  resolution: BoxResolution;
  isSmart: boolean;
  hasRecording: boolean;
  storageGb: number | null;
  purchasePrice: Money;
  rentalPerMonth: Money;
  securityDeposit: Money;
  isActive: boolean;
  isFeatured: boolean;
  inStock?: boolean;
  _count?: { units: number; connections: number };
}

export interface TvPack {
  id: string;
  name: string;
  description: string | null;
  type: TvPlanType;
  price: Money;
  currency: string;
  validityDays: number;
  channelCount: number;
  hdChannelCount: number;
  languages: string[];
  requires4kBox: boolean;
  isActive: boolean;
  isFeatured: boolean;
  _count?: { subscriptions: number };
}

export interface TvSubscription {
  id: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  tvPlan: TvPack;
}

export interface TvInstallation {
  id: string;
  reference: string;
  type: string;
  status: InstallationStatus;
  preferredDate: string;
  preferredSlot: InstallationSlot;
  scheduledAt: string | null;
  customerNotes: string | null;
  technicianName: string | null;
  technicianPhone: string | null;
  completedAt: string | null;
  failureReason: string | null;
}

export interface TvConnectionOrder {
  id: string;
  type: "SET_TOP_BOX_ORDER" | "TV_PACK_PURCHASE";
  status: string;
  amount: Money;
  createdAt: string;
  tvPlan: { name: string } | null;
}

export interface TvConnection {
  id: string;
  connectionNumber: string;
  status: TvConnectionStatus;
  ownership: BoxOwnership;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  contactPhone: string;
  activatedAt: string | null;
  planExpiredAt: string | null;
  gracePeriodEndsAt: string | null;
  pausedAt: string | null;
  pauseEndsAt: string | null;
  returnDueAt: string | null;
  createdAt: string;
  model: { id: string; name: string; resolution: BoxResolution; isSmart: boolean };
  unit: { serialNumber: string; smartCardMasked: string | null; status: UnitStatus } | null;
  subscriptions: TvSubscription[];
  installations: TvInstallation[];
  orders: TvConnectionOrder[];
  currentPack: TvPack | null;
  daysLeft: number;
  pauseDaysRemaining: number;
}

export interface TvCheckoutInput {
  modelId: string;
  ownership: BoxOwnership;
  basePlanId: string;
  addOnPlanIds?: string[];
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  contactPhone: string;
  preferredDate: string;
  preferredSlot: InstallationSlot;
  customerNotes?: string;
}

export interface CheckoutResult {
  sessionId: string;
  url: string | null;
  orderId: string;
  amount: string;
}

export const tvApi = {
  boxes: () => api.get<TvBox[]>("/api/v1/tv/boxes"),
  plans: (type?: TvPlanType) =>
    api.get<TvPack[]>(`/api/v1/tv/plans${type ? `?type=${type}` : ""}`),
  checkout: (input: TvCheckoutInput) =>
    api.post<CheckoutResult & { connectionNumber: string }>("/api/v1/tv/checkout", input),
  connections: () => api.get<TvConnection[]>("/api/v1/tv/connections"),
  syncOrder: (orderId: string) =>
    api.post<{ status: string; paid: boolean }>(`/api/v1/tv/orders/${orderId}/sync`),
  payOrder: (orderId: string) =>
    api.post<{ alreadyPaid: boolean; url: string | null }>(`/api/v1/tv/orders/${orderId}/pay`),
  cancelOrder: (orderId: string) =>
    api.post<{ status: string }>(`/api/v1/tv/orders/${orderId}/cancel`),
  renew: (id: string, tvPlanId?: string) =>
    api.post<CheckoutResult>(`/api/v1/tv/connections/${id}/renew`, { tvPlanId }),
  addOn: (id: string, tvPlanId: string) =>
    api.post<CheckoutResult>(`/api/v1/tv/connections/${id}/add-on`, { tvPlanId }),
  pause: (id: string, days: number) =>
    api.post<TvConnection>(`/api/v1/tv/connections/${id}/pause`, { days }),
  resume: (id: string) => api.post<TvConnection>(`/api/v1/tv/connections/${id}/resume`),
  reschedule: (installationId: string, preferredDate: string, preferredSlot: InstallationSlot) =>
    api.post<TvInstallation>(`/api/v1/tv/installations/${installationId}/reschedule`, {
      preferredDate,
      preferredSlot,
    }),
  cancelInstallation: (installationId: string) =>
    api.post<TvInstallation>(`/api/v1/tv/installations/${installationId}/cancel`),
  createTicket: (id: string, subject: string, description: string) =>
    api.post<{ ticketNumber: string }>(`/api/v1/tv/connections/${id}/support-tickets`, {
      subject,
      description,
    }),
};

// ------------------------------------------------------------------ admin

export interface TvDashboard {
  activeConnections: number;
  unitsInStock: number;
  installsToday: number;
  expiringThisWeek: number;
}

export interface AdminUnit {
  id: string;
  serialNumber: string;
  macAddress: string;
  smartCardMasked: string | null;
  status: UnitStatus;
  warrantyEndsAt: string | null;
  notes: string | null;
  model: { id: string; name: string };
  connection: { id: string; connectionNumber: string; user: { name: string } } | null;
}

export interface AdminOrder {
  id: string;
  type: string;
  status: string;
  amount: Money;
  createdAt: string;
  user: { id: string; name: string; email: string };
  setTopBoxModel: { name: string } | null;
  tvPlan: { name: string } | null;
  setTopBoxConnection: { id: string; connectionNumber: string; status: TvConnectionStatus; unitId: string | null } | null;
  payment: { status: string } | null;
}

export interface AdminConnection {
  id: string;
  connectionNumber: string;
  status: TvConnectionStatus;
  ownership: BoxOwnership;
  planExpiredAt: string | null;
  returnDueAt: string | null;
  city: string;
  user: { id: string; name: string; email: string };
  model: { name: string; resolution: BoxResolution };
  unit: { id: string; serialNumber: string; smartCardMasked: string | null; status: UnitStatus } | null;
  subscriptions: { id: string; status: string; tvPlan: { name: string; type: TvPlanType } }[];
}

export interface AdminInstallation extends TvInstallation {
  connection: {
    id: string;
    connectionNumber: string;
    status: TvConnectionStatus;
    unitId: string | null;
    addressLine: string;
    city: string;
    state: string;
    postalCode: string;
    contactPhone: string;
    user: { name: string; email: string };
    model: { name: string };
  };
}

export type BoxInput = Partial<Omit<TvBox, "id" | "inStock" | "_count">> & {
  name: string;
  sku: string;
  resolution: BoxResolution;
};
export type PackInput = Partial<Omit<TvPack, "id" | "_count" | "currency">> & {
  name: string;
  type: TvPlanType;
  price: number;
  validityDays: number;
  channelCount: number;
  languages: string[];
};

function qs(params: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

const A = "/api/v1/admin/tv";

export const tvAdminApi = {
  dashboard: () => api.get<TvDashboard>(`${A}/dashboard`),
  models: () => api.get<TvBox[]>(`${A}/models`),
  createModel: (b: BoxInput) => api.post<TvBox>(`${A}/models`, b),
  updateModel: (id: string, b: Partial<BoxInput>) => api.patch<TvBox>(`${A}/models/${id}`, b),
  deleteModel: (id: string) => api.delete<{ deleted: boolean; deactivated: boolean }>(`${A}/models/${id}`),
  plans: () => api.get<TvPack[]>(`${A}/plans`),
  createPlan: (p: PackInput) => api.post<TvPack>(`${A}/plans`, p),
  updatePlan: (id: string, p: Partial<PackInput>) => api.patch<TvPack>(`${A}/plans/${id}`, p),
  deletePlan: (id: string) => api.delete<{ deleted: boolean; deactivated: boolean }>(`${A}/plans/${id}`),
  units: (p: { status?: string; modelId?: string; search?: string; limit?: number }) =>
    api.getWithMeta<AdminUnit[], PaginationMeta>(`${A}/units${qs({ limit: 100, ...p })}`),
  createUnit: (b: { modelId: string; serialNumber: string; macAddress: string; smartCardNumber: string }) =>
    api.post<AdminUnit>(`${A}/units`, b),
  importUnits: (modelId: string, csv: string) =>
    api.post<{ importedCount: number; errorCount: number; errors: { row: number; serialNumber?: string; error: string }[] }>(
      `${A}/units/import`,
      { modelId, csv }
    ),
  deleteUnit: (id: string) => api.delete<{ deleted: boolean }>(`${A}/units/${id}`),
  markFaulty: (id: string) => api.post<{ status: string }>(`${A}/units/${id}/mark-faulty`),
  replaceUnit: (id: string) => api.post<{ newUnitId: string }>(`${A}/units/${id}/replace`, {}),
  orders: (status?: string) =>
    api.getWithMeta<AdminOrder[], PaginationMeta>(`${A}/orders${qs({ limit: 100, status })}`),
  connections: (p: { status?: string; search?: string }) =>
    api.getWithMeta<AdminConnection[], PaginationMeta>(`${A}/connections${qs({ limit: 100, ...p })}`),
  installations: (status?: string) =>
    api.getWithMeta<AdminInstallation[], PaginationMeta>(`${A}/installations${qs({ limit: 100, status })}`),
  assignUnit: (connectionId: string) =>
    api.post<{ unitId: string }>(`${A}/connections/${connectionId}/assign-unit`, {}),
  disconnect: (connectionId: string) => api.post(`${A}/connections/${connectionId}/disconnect`),
  confirmReturn: (connectionId: string) => api.post(`${A}/connections/${connectionId}/confirm-return`),
  schedule: (id: string, b: { scheduledAt: string; technicianName: string; technicianPhone: string }) =>
    api.post(`${A}/installations/${id}/schedule`, b),
  complete: (id: string) => api.post(`${A}/installations/${id}/complete`),
  fail: (id: string, reason: string) => api.post(`${A}/installations/${id}/fail`, { reason }),
  runJobs: () => api.post<Record<string, number>>(`${A}/jobs/run`),
};

export const TV_KEYS = {
  boxes: ["tv", "boxes"] as const,
  plans: ["tv", "plans"] as const,
  connections: ["tv", "connections"] as const,
  admin: ["tv", "admin"] as const,
};
