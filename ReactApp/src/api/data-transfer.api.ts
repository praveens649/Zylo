import { api } from "@/lib/api";

/* Zylo Data Transfer — send banked data to a friend on another Zylo number.
   Mirrors the server payloads from /api/v1/data-transfer/* */

export type TransferDirection = "SENT" | "RECEIVED";
export type TransferStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface TransferSimSummary {
  simId: string;
  number: string;
  status: string;
  planName: string | null;
  /** Active plan allows P2P transfers. */
  transferEnabled: boolean;
  /** Plan per-transfer cap (or global default when the plan sets none). */
  perTransferLimitMb: number | null;
  /** Today's remaining data — the pool transfers come out of. */
  shareableTodayMb: number;
  bankBalanceMb: number;
  sentTodayMb: number;
  dailyLimitMb: number;
}

export interface TransferRecipient {
  name: string;
  number: string;
  category: string;
}

export interface DataTransfer {
  id: string;
  reference: string;
  fromSimId: string;
  toSimId: string;
  amountMb: number;
  message: string | null;
  status: TransferStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface TransferHistoryEntry {
  id: string;
  reference: string;
  direction: TransferDirection;
  otherParty: { name: string | null; number: string | null };
  amountMb: number;
  message: string | null;
  status: TransferStatus;
  createdAt: string;
  completedAt: string | null;
}

export const dataTransferApi = {
  /** The customer's active SIMs with bank balance + transfer limits. */
  overview: () =>
    api.get<{ sims: TransferSimSummary[] }>("/api/v1/data-transfer/overview"),

  /** Exact-match friend lookup by full Zylo number. */
  lookup: (number: string) =>
    api.get<{ recipient: TransferRecipient | null }>(
      `/api/v1/data-transfer/lookup?number=${encodeURIComponent(number)}`
    ),

  /** Send banked data. `idempotencyKey` makes retries safe. */
  send: (input: {
    simId: string;
    targetNumber: string;
    amountMb: number;
    message?: string;
    idempotencyKey?: string;
  }) => api.post<{ transfer: DataTransfer; replayed: boolean }>("/api/v1/data-transfer", input),

  /** Sent + received history for the customer's SIMs. */
  history: () =>
    api.get<{ transfers: TransferHistoryEntry[] }>("/api/v1/data-transfer/history"),
};

export const TRANSFER_OVERVIEW_KEY = ["data-transfer", "overview"] as const;
export const TRANSFER_HISTORY_KEY = ["data-transfer", "history"] as const;
