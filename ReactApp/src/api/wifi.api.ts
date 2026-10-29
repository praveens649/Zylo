import { api, PaginationMeta } from "@/lib/api";

export type WifiPlanType = "BASE" | "ADD_ON";
export type WifiBand = "SINGLE_BAND" | "DUAL_BAND" | "TRI_BAND";
export type DeviceOwnership = "PURCHASE" | "RENTAL";
export type InstallationSlot = "MORNING" | "AFTERNOON" | "EVENING";
export type InstallationStatus =
  | "REQUESTED"
  | "SCHEDULED"
  | "RESCHEDULED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
export type WifiConnectionStatus =
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

export interface WifiDevice {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  band: WifiBand;
  wifiStandard: string;
  maxDevices: number;
  ethernetPorts: number;
  isMesh: boolean;
  purchasePrice: Money;
  rentalPerMonth: Money;
  securityDeposit: Money;
  isActive: boolean;
  isFeatured: boolean;
  inStock?: boolean;
  _count?: { units: number; connections: number };
}

export interface WifiPlan {
  id: string;
  name: string;
  description: string | null;
  type: WifiPlanType;
  price: Money;
  currency: string;
  validityDays: number;
  speedMbps: number;
  dataLimitGb: number | null;
  postFupSpeedMbps: number | null;
  requiresTriBand: boolean;
  features: string[];
  isActive: boolean;
  isFeatured: boolean;
  _count?: { subscriptions: number };
}

export interface WifiSubscription {
  id: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  wifiPlan: WifiPlan;
}

export interface WifiInstallation {
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

export interface WifiConnectionOrder {
  id: string;
  type: "WIFI_ORDER" | "WIFI_PLAN_PURCHASE";
  status: string;
  amount: Money;
  createdAt: string;
  wifiPlan: { name: string } | null;
}

export interface WifiConnection {
  id: string;
  connectionNumber: string;
  status: WifiConnectionStatus;
  ownership: DeviceOwnership;
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
  device: { id: string; name: string; band: WifiBand; wifiStandard: string; isMesh: boolean };
  unit: { serialNumber: string; macMasked: string | null; status: UnitStatus } | null;
  subscriptions: WifiSubscription[];
  installations: WifiInstallation[];
  orders: WifiConnectionOrder[];
  currentPlan: WifiPlan | null;
  daysLeft: number;
  pauseDaysRemaining: number;
}

export interface WifiCheckoutInput {
  deviceId: string;
  ownership: DeviceOwnership;
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

export const wifiApi = {
  devices: () => api.get<WifiDevice[]>("/api/v1/wifi/devices"),
  plans: (type?: WifiPlanType) =>
    api.get<WifiPlan[]>(`/api/v1/wifi/plans${type ? `?type=${type}` : ""}`),
  checkout: (input: WifiCheckoutInput) =>
    api.post<CheckoutResult & { connectionNumber: string }>("/api/v1/wifi/checkout", input),
  connections: () => api.get<WifiConnection[]>("/api/v1/wifi/connections"),
  syncOrder: (orderId: string) =>
    api.post<{ status: string; paid: boolean; sessionStatus?: string }>(`/api/v1/wifi/orders/${orderId}/sync`),
  payOrder: (orderId: string) =>
    api.post<{ alreadyPaid: boolean; url: string | null }>(`/api/v1/wifi/orders/${orderId}/pay`),
  cancelOrder: (orderId: string) =>
    api.post<{ status: string }>(`/api/v1/wifi/orders/${orderId}/cancel`),
  renew: (id: string, wifiPlanId?: string) =>
    api.post<CheckoutResult>(`/api/v1/wifi/connections/${id}/renew`, { wifiPlanId }),
  addOn: (id: string, wifiPlanId: string) =>
    api.post<CheckoutResult>(`/api/v1/wifi/connections/${id}/add-on`, { wifiPlanId }),
  pause: (id: string, days: number) =>
    api.post<WifiConnection>(`/api/v1/wifi/connections/${id}/pause`, { days }),
  resume: (id: string) => api.post<WifiConnection>(`/api/v1/wifi/connections/${id}/resume`),
  reschedule: (installationId: string, preferredDate: string, preferredSlot: InstallationSlot) =>
    api.post<WifiInstallation>(`/api/v1/wifi/installations/${installationId}/reschedule`, {
      preferredDate,
      preferredSlot,
    }),
  cancelInstallation: (installationId: string) =>
    api.post<WifiInstallation>(`/api/v1/wifi/installations/${installationId}/cancel`),
  createTicket: (id: string, subject: string, description: string) =>
    api.post<{ ticketNumber: string }>(`/api/v1/wifi/connections/${id}/support-tickets`, {
      subject,
      description,
    }),
};

// ------------------------------------------------------------------ admin

export interface WifiDashboard {
  activeConnections: number;
  unitsInStock: number;
  installsToday: number;
  expiringThisWeek: number;
}

export interface AdminUnit {
  id: string;
  serialNumber: string;
  macMasked: string | null;
  status: UnitStatus;
  warrantyEndsAt: string | null;
  notes: string | null;
  device: { id: string; name: string };
  connection: { id: string; connectionNumber: string; user: { name: string } } | null;
}

export interface AdminOrder {
  id: string;
  type: string;
  status: string;
  amount: Money;
  createdAt: string;
  user: { id: string; name: string; email: string };
  wifiDevice: { name: string } | null;
  wifiPlan: { name: string } | null;
  wifiConnection: { id: string; connectionNumber: string; status: WifiConnectionStatus; unitId: string | null } | null;
  payment: { status: string } | null;
}

export interface AdminConnection {
  id: string;
  connectionNumber: string;
  status: WifiConnectionStatus;
  ownership: DeviceOwnership;
  planExpiredAt: string | null;
  returnDueAt: string | null;
  city: string;
  user: { id: string; name: string; email: string };
  device: { name: string; band: WifiBand };
  unit: { id: string; serialNumber: string; macMasked: string | null; status: UnitStatus } | null;
  subscriptions: { id: string; status: string; wifiPlan: { name: string; type: WifiPlanType } }[];
}

export interface AdminInstallation extends WifiInstallation {
  connection: {
    id: string;
    connectionNumber: string;
    status: WifiConnectionStatus;
    unitId: string | null;
    addressLine: string;
    city: string;
    state: string;
    postalCode: string;
    contactPhone: string;
    user: { name: string; email: string };
    device: { name: string };
  };
}

export type DeviceInput = Partial<Omit<WifiDevice, "id" | "inStock" | "_count">> & {
  name: string;
  sku: string;
  band: WifiBand;
};
export type PlanInput = Partial<Omit<WifiPlan, "id" | "_count" | "currency">> & {
  name: string;
  type: WifiPlanType;
  price: number;
  validityDays: number;
  speedMbps: number;
  features: string[];
};

function qs(params: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

const A = "/api/v1/admin/wifi";

export const wifiAdminApi = {
  dashboard: () => api.get<WifiDashboard>(`${A}/dashboard`),
  devices: () => api.get<WifiDevice[]>(`${A}/devices`),
  createDevice: (d: DeviceInput) => api.post<WifiDevice>(`${A}/devices`, d),
  updateDevice: (id: string, d: Partial<DeviceInput>) => api.patch<WifiDevice>(`${A}/devices/${id}`, d),
  deleteDevice: (id: string) => api.delete<{ deleted: boolean; deactivated: boolean }>(`${A}/devices/${id}`),
  plans: () => api.get<WifiPlan[]>(`${A}/plans`),
  createPlan: (p: PlanInput) => api.post<WifiPlan>(`${A}/plans`, p),
  updatePlan: (id: string, p: Partial<PlanInput>) => api.patch<WifiPlan>(`${A}/plans/${id}`, p),
  deletePlan: (id: string) => api.delete<{ deleted: boolean; deactivated: boolean }>(`${A}/plans/${id}`),
  units: (p: { status?: string; deviceId?: string; search?: string; limit?: number }) =>
    api.getWithMeta<AdminUnit[], PaginationMeta>(`${A}/units${qs({ limit: 100, ...p })}`),
  createUnit: (b: { deviceId: string; serialNumber: string; macAddress: string }) =>
    api.post<AdminUnit>(`${A}/units`, b),
  importUnits: (deviceId: string, csv: string) =>
    api.post<{ importedCount: number; errorCount: number; errors: { row: number; serialNumber?: string; error: string }[] }>(
      `${A}/units/import`,
      { deviceId, csv }
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

export const WIFI_KEYS = {
  devices: ["wifi", "devices"] as const,
  plans: ["wifi", "plans"] as const,
  connections: ["wifi", "connections"] as const,
  admin: ["wifi", "admin"] as const,
};
