import { api } from "@/lib/api";
import type { PaginationMeta } from "@/lib/api";

/* Customer support — mirrors the payloads from
   /api/v1/support/tickets and /api/v1/admin/support/tickets */

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
export type SupportCategory =
  | "SIM_ACTIVATION"
  | "RECHARGE"
  | "PLAN"
  | "PAYMENT"
  | "SIM_REPLACEMENT"
  | "BUSINESS_SIM"
  | "SET_TOP_BOX"
  | "OTHER";

export interface SupportTicketUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  description: string;
  category: SupportCategory;
  priority: TicketPriority;
  status: TicketStatus;
  adminReply: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sim: { id: string; phoneNumber: { number: string } } | null;
  setTopBoxConnection: { id: string; connectionNumber: string } | null;
  /** Present on admin responses only. */
  user?: SupportTicketUser;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  category?: SupportCategory;
  simId?: string;
  setTopBoxConnectionId?: string;
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  priority?: TicketPriority;
  adminReply?: string;
}

export interface AdminTicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: SupportCategory;
  search?: string;
}

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const supportApi = {
  /** File a new ticket as the signed-in customer. */
  create: (payload: CreateTicketPayload) =>
    api.post<SupportTicket>("/api/v1/support/tickets", payload),

  /** The customer's own tickets, newest first. */
  myTickets: (filters: { status?: TicketStatus } = {}) =>
    api.getWithMeta<SupportTicket[], PaginationMeta>(
      `/api/v1/support/tickets${qs({ status: filters.status, limit: "50" })}`
    ),

  /** Every customer ticket — admin console. */
  adminTickets: (filters: AdminTicketFilters = {}) =>
    api.getWithMeta<SupportTicket[], PaginationMeta>(
      `/api/v1/admin/support/tickets${qs({
        status: filters.status,
        priority: filters.priority,
        category: filters.category,
        search: filters.search,
        limit: "100",
      })}`
    ),

  /** Admin: reply, reprioritize, or move the ticket through its lifecycle. */
  update: (id: string, payload: UpdateTicketPayload) =>
    api.patch<SupportTicket>(`/api/v1/admin/support/tickets/${id}`, payload),
};

export const SUPPORT_KEYS = {
  mine: ["support", "mine"] as const,
  admin: ["support", "admin"] as const,
  all: ["support"] as const,
};
