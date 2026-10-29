import { api, PaginationMeta } from "@/lib/api";

/* Zylo Data Loan — mirrors the server payloads from
   /api/v1/loans and /api/v1/admin/loans */

export type DataLoanStatus =
  | "ACTIVE"
  | "PARTIALLY_REPAID"
  | "DUE"
  | "REPAID"
  | "SETTLED"
  | "CANCELLED";

export type DataLoanTransactionType =
  | "LOAN_ISSUED"
  | "BANK_REPAYMENT"
  | "RECHARGE_REPAYMENT"
  | "ADJUSTMENT";

export interface DataLoanTransaction {
  id: string;
  type: DataLoanTransactionType;
  amountMb: number;
  balanceAfterMb: number;
  reference: string;
  description: string | null;
  processedAt: string;
}

export interface DataLoan {
  id: string;
  userId: string;
  simId: string;
  originalAmountMb: number;
  outstandingAmountMb: number;
  /** Present on history rows — originalAmountMb − outstandingAmountMb. */
  repaidAmountMb?: number;
  status: DataLoanStatus;
  borrowedAt: string;
  dueAt: string | null;
  repaidAt: string | null;
  transactions?: DataLoanTransaction[];
}

export interface LoanEligibility {
  eligible: boolean;
  code?: string;
  message?: string;
  maxMb: number;
  dueDays: number;
}

export interface AdminLoan extends DataLoan {
  user: { id: string; name: string; email: string };
  sim: {
    id: string;
    status: string;
    category?: string;
    phoneNumber: { number: string };
  };
  _count?: { transactions: number };
}

export interface LoanSummary {
  openCount: number;
  dueCount: number;
  totalOutstandingMb: number;
  repaidThisMonthMb: number;
  demoJobsEnabled: boolean;
}

export interface LoanRepayResult {
  repaidMb: number;
  outstandingMb: number;
  bankBalanceMb: number;
  status: DataLoanStatus;
}

export interface NightlyRunResult {
  asOf: string;
  scanned: number;
  dueLoans: number;
  repaidLoans: number;
  repaidMb: number;
  errors: number;
}

export const loansApi = {
  eligibility: (simId: string) =>
    api.get<LoanEligibility>(`/api/v1/loans/eligibility?simId=${simId}`),

  active: (simId: string) =>
    api.get<DataLoan | null>(`/api/v1/loans/active?simId=${simId}`),

  history: (simId: string) =>
    api.get<DataLoan[]>(`/api/v1/loans?simId=${simId}`),

  /** One idempotency key per user attempt — a replay returns the same loan. */
  borrow: (simId: string, amountMb: number, idempotencyKey: string) =>
    api.post<DataLoan>(
      "/api/v1/loans",
      { simId, amountMb },
      { headers: { "Idempotency-Key": idempotencyKey } }
    ),

  /** "Repay now" — drains Data Bank balance into the open loan (partial ok). */
  repay: (simId: string) =>
    api.post<LoanRepayResult>("/api/v1/loans/repay", { simId }),

  admin: {
    list: (params: {
      status?: DataLoanStatus;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
      const s = qs.toString();
      return api.getWithMeta<AdminLoan[], PaginationMeta>(
        `/api/v1/admin/loans${s ? `?${s}` : ""}`
      );
    },
    summary: () => api.get<LoanSummary>("/api/v1/admin/loans/summary"),
    get: (id: string) => api.get<AdminLoan>(`/api/v1/admin/loans/${id}`),
    cancel: (id: string, reason: string) =>
      api.post<DataLoan>(`/api/v1/admin/loans/${id}/cancel`, { reason }),
    runNightly: (asOf?: string) =>
      api.post<NightlyRunResult>(
        `/api/v1/admin/jobs/loan-nightly${asOf ? `?asOf=${encodeURIComponent(asOf)}` : ""}`
      ),
  },
};

export const loanEligibilityKey = (simId: string) =>
  ["loans", "eligibility", simId] as const;
export const loanActiveKey = (simId: string) =>
  ["loans", "active", simId] as const;
export const loanHistoryKey = (simId: string) =>
  ["loans", "history", simId] as const;
export const ADMIN_LOANS_KEY = ["admin", "loans"] as const;
export const ADMIN_LOAN_SUMMARY_KEY = ["admin", "loans", "summary"] as const;
