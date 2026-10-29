"use client";

import { useState } from "react";
import {
  ChevronDown,
  History,
  Landmark,
  Loader2,
  ReceiptText,
  SmartphoneCharging,
  Wrench,
} from "lucide-react";

import { formatDate, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import type {
  DataLoan,
  DataLoanStatus,
  DataLoanTransactionType,
} from "@/api/loans.api";
import { useLoanHistory } from "../_hooks/use-loans";

function formatMb(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb % 1 === 0 ? gb : gb.toFixed(2)} GB`;
  }
  return `${mb} MB`;
}

const STATUS_BADGE: Record<DataLoanStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  PARTIALLY_REPAID: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  DUE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  REPAID: "bg-muted text-muted-foreground border-border",
  SETTLED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<DataLoanStatus, string> = {
  ACTIVE: "Active",
  PARTIALLY_REPAID: "Partly repaid",
  DUE: "Due",
  REPAID: "Repaid",
  SETTLED: "Settled",
  CANCELLED: "Cancelled",
};

const TXN_META: Record<
  DataLoanTransactionType,
  { label: string; icon: typeof Landmark; className: string }
> = {
  LOAN_ISSUED: {
    label: "Borrowed",
    icon: ReceiptText,
    className: "bg-amber-500/10 text-amber-600",
  },
  BANK_REPAYMENT: {
    label: "Data Bank repayment",
    icon: Landmark,
    className: "bg-emerald-500/10 text-emerald-600",
  },
  RECHARGE_REPAYMENT: {
    label: "Settled by recharge",
    icon: SmartphoneCharging,
    className: "bg-sky-500/10 text-sky-600",
  },
  ADJUSTMENT: {
    label: "Adjustment",
    icon: Wrench,
    className: "bg-muted text-muted-foreground",
  },
};

function LoanRow({ loan }: { loan: DataLoan }) {
  const [open, setOpen] = useState(false);
  const txns = loan.transactions ?? [];

  return (
    <div className="rounded-xl border border-border/60 bg-background/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {formatMb(loan.originalAmountMb)}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] ${STATUS_BADGE[loan.status]}`}
            >
              {STATUS_LABEL[loan.status]}
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Borrowed {formatDate(loan.borrowedAt)}
            {loan.dueAt ? ` · due ${formatDate(loan.dueAt)}` : ""}
            {loan.repaidAt ? ` · closed ${formatDate(loan.repaidAt)}` : ""}
            {loan.outstandingAmountMb > 0 &&
              ` · ${formatMb(loan.outstandingAmountMb)} left`}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-1.5 border-t border-border/50 px-3.5 py-2.5">
          {txns.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              No ledger entries yet.
            </p>
          )}
          {txns.map((txn) => {
            const meta = TXN_META[txn.type] ?? TXN_META.ADJUSTMENT;
            const Icon = meta.icon;
            return (
              <div
                key={txn.id}
                className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.className}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">
                    {meta.label}{" "}
                    <span className="font-semibold">
                      {formatMb(txn.amountMb)}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDateTime(txn.processedAt)}
                    {txn.description ? ` · ${txn.description}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                  → {formatMb(txn.balanceAfterMb)} left
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Loan history for one SIM — every loan, expandable to its ledger. */
export function LoanHistory({ simId }: { simId: string }) {
  const history = useLoanHistory(simId);
  const loans = history.data ?? [];

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Loan history
          </span>
          {loans.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {loans.length} loan{loans.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {history.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : loans.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No loans on this number yet — borrow data when you run out, and
            it will show up here.
          </p>
        ) : (
          <div className="space-y-2">
            {loans.map((loan) => (
              <LoanRow key={loan.id} loan={loan} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LoanHistory;
