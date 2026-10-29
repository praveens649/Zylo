import { api } from "@/lib/api";

/* Zylo Data Bank — mirrors the server payloads from
   GET/POST /api/v1/sims/:simId/data-bank */

export type DataBankTransactionType =
  | "DEPOSIT"
  | "REDEMPTION"
  | "EXPIRY"
  | "ADJUSTMENT";

export interface DataBankTransaction {
  id: string;
  type: DataBankTransactionType;
  amountMb: number;
  balanceAfterMb: number;
  description: string | null;
  reference: string;
  expiresAt: string | null;
  processedAt: string;
}

export interface DataBankStatus {
  balanceMb: number;
  capacityMb: number;
  rolloverExpiryDays: number;
  savableTodayMb: number;
  today: {
    allowanceMb: number;
    usedMb: number;
    bankedMb: number;
    redeemedMb: number;
  };
  transactions: DataBankTransaction[];
}

export interface DataBankSaveResult {
  savedMb: number;
  balanceMb: number;
  reference: string;
  expiresAt: string | null;
}

export interface DataBankRedeemResult {
  redeemedMb: number;
  balanceMb: number;
  reference: string;
}

export const dataBankApi = {
  /** Balance, limits, today's savable amount, and recent ledger entries. */
  getStatus: (simId: string) =>
    api.get<DataBankStatus>(`/api/v1/sims/${simId}/data-bank`),

  /** Bank today's unused data (idempotent per daily cycle). */
  save: (simId: string) =>
    api.post<DataBankSaveResult>(`/api/v1/sims/${simId}/data-bank/save`),

  /** Move banked data back into today's usage pool. */
  redeem: (simId: string, amountMb: number) =>
    api.post<DataBankRedeemResult>(`/api/v1/sims/${simId}/data-bank/redeem`, {
      amountMb,
    }),
};

export const dataBankStatusKey = (simId: string) =>
  ["data-bank", "status", simId] as const;
