"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  HandCoins,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import type { DataLoanStatus } from "@/api/loans.api";
import {
  useActiveLoan,
  useBorrowLoan,
  useLoanEligibility,
  useRepayLoan,
} from "../_hooks/use-loans";

function formatMb(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb % 1 === 0 ? gb : gb.toFixed(2)} GB`;
  }
  return `${mb} MB`;
}

const AMOUNT_CHIPS = [100, 250, 500];

const STATUS_BADGE: Record<DataLoanStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  PARTIALLY_REPAID: { label: "Partly repaid", className: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
  DUE: { label: "Due", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  REPAID: { label: "Repaid", className: "bg-muted text-muted-foreground border-border" },
  SETTLED: { label: "Settled", className: "bg-muted text-muted-foreground border-border" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
};

/** Maps every borrow error code to a useful message (server text wins). */
const ERROR_HINTS: Record<string, string> = {
  ACCOUNT_INACTIVE: "Your account is not active right now.",
  SIM_NOT_FOUND: "That SIM doesn't belong to this account.",
  SIM_NOT_ACTIVE: "This SIM isn't active yet.",
  NO_ACTIVE_PLAN: "Recharge this SIM first — loans need an active plan.",
  PLAN_NOT_ELIGIBLE: "Your plan doesn't include Zylo Data Loan.",
  OPEN_LOAN_EXISTS: "You already have an open loan on this number.",
  NO_OPEN_LOAN: "There's no open loan on this number.",
  AMOUNT_INVALID: "Pick one of the suggested amounts.",
  AMOUNT_TOO_HIGH: "That amount is above your plan's borrow limit.",
  IDEMPOTENCY_KEY_REQUIRED: "Something went wrong — please try again.",
};

interface DataLoanCardProps {
  simId: string;
}

/**
 * Zylo Data Loan card — three states:
 *   1. open loan      → progress, repaid/remaining, due date, status badge
 *   2. eligible       → amount chips + confirm dialog (idempotent borrow)
 *   3. not eligible   → the server's own reason
 */
export function DataLoanCard({ simId }: DataLoanCardProps) {
  const { toast } = useToast();
  const eligibility = useLoanEligibility(simId);
  const activeLoan = useActiveLoan(simId);
  const borrow = useBorrowLoan(simId);
  const repay = useRepayLoan(simId);

  const [amountMb, setAmountMb] = useState<number>(250);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loan = activeLoan.data;
  const info = eligibility.data;
  const isLoading = eligibility.isPending || activeLoan.isPending;

  const chips = useMemo(
    () => AMOUNT_CHIPS.filter((amt) => amt <= (info?.maxMb ?? 0)),
    [info?.maxMb],
  );
  // If the API limit shrinks below the selected chip, fall back to the max.
  const effectiveAmount = chips.includes(amountMb)
    ? amountMb
    : (chips[chips.length - 1] ?? amountMb);
  const [dueLabel, setDueLabel] = useState("");

  const openConfirm = () => {
    // Date.now() is event-time only — render stays pure.
    if (info?.dueDays) {
      setDueLabel(
        formatDate(
          new Date(
            Date.now() + info.dueDays * 24 * 60 * 60 * 1000,
          ).toISOString(),
        ),
      );
    }
    setConfirmOpen(true);
  };

  const handleRepay = () => {
    repay.mutate(undefined, {
      onSuccess: (r) => {
        toast({
          title: r.repaidMb ? "Repayment applied" : "Nothing to repay with",
          description: r.repaidMb
            ? `${formatMb(r.repaidMb)} moved from your Data Bank${
                r.outstandingMb
                  ? ` — ${formatMb(r.outstandingMb)} still left`
                  : " — loan fully repaid"
              }.`
            : "Your Data Bank is empty. Save unused data or recharge to settle.",
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Couldn't repay",
          description:
            err instanceof ApiRequestError
              ? (ERROR_HINTS[err.code] ?? err.message)
              : "Please try again.",
        });
      },
    });
  };

  const handleBorrow = () => {
    borrow.mutate(
      { amountMb: effectiveAmount, idempotencyKey: crypto.randomUUID() },
      {
        onSuccess: (created) => {
          setConfirmOpen(false);
          toast({
            title: "Data Loan approved",
            description: `${formatMb(created.originalAmountMb)} added. Pay back by ${formatDate(created.dueAt)}. Free of charge.`,
          });
        },
        onError: (err) => {
          const hint =
            err instanceof ApiRequestError
              ? (ERROR_HINTS[err.code] ?? err.message)
              : "Please try again.";
          toast({
            variant: "destructive",
            title: "Couldn't borrow data",
            description: hint,
          });
        },
      },
    );
  };

  return (
    <>
      <Card className="relative overflow-hidden border-border bg-card shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />

        <CardHeader className="relative pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Zylo Data Loan
            </span>
            {loan ? (
              <Badge variant="outline" className={`text-xs ${STATUS_BADGE[loan.status].className}`}>
                {STATUS_BADGE[loan.status].label}
              </Badge>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
                <HandCoins className="h-3 w-3" />
                Free of charge
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking loan
              eligibility…
            </div>
          ) : loan ? (
            /* ------------------------- open loan ------------------------- */
            <>
              <div className="flex items-end gap-2">
                <span className="font-display text-4xl font-black tracking-tight text-foreground">
                  {formatMb(loan.outstandingAmountMb)}
                </span>
                <span className="pb-1 text-sm font-medium text-muted-foreground">
                  left of {formatMb(loan.originalAmountMb)} borrowed
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-[width] duration-500"
                    style={{
                      width: `${Math.min(100, ((loan.originalAmountMb - loan.outstandingAmountMb) / Math.max(1, loan.originalAmountMb)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    {formatMb(loan.originalAmountMb - loan.outstandingAmountMb)}{" "}
                    repaid
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Due {formatDate(loan.dueAt)}
                  </span>
                </div>
              </div>

              <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                {loan.status === "DUE"
                  ? "This loan is due — repaid automatically from new Data Bank savings, or settled on your next recharge."
                  : "Repaid automatically when you save data into your Data Bank. Recharging also settles it."}
              </p>

              <Button
                variant="outline"
                className="h-10 w-full gap-1.5 rounded-xl text-sm font-bold"
                disabled={repay.isPending}
                onClick={handleRepay}
              >
                {repay.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Repay now from Data Bank
              </Button>
            </>
          ) : info?.eligible ? (
            /* ------------------------- eligible -------------------------- */
            <>
              <div className="flex items-end gap-2">
                <span className="font-display text-4xl font-black tracking-tight text-foreground">
                  {formatMb(info.maxMb)}
                </span>
                <span className="pb-1 text-sm font-medium text-muted-foreground">
                  available to borrow
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Out of data? Borrow now and pay it back automatically from
                your Data Bank or your next recharge — no fees.
              </p>

              <div className="flex gap-2">
                {chips.map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant={amountMb === amt ? "default" : "outline"}
                    size="sm"
                    className="flex-1 font-bold"
                    onClick={() => setAmountMb(amt)}
                  >
                    {amt} MB
                  </Button>
                ))}
              </div>

              <Button
                className="h-11 w-full gap-1.5 rounded-xl text-sm font-bold shadow-sm"
                disabled={borrow.isPending || chips.length === 0}
                onClick={openConfirm}
              >
                {borrow.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                Borrow {effectiveAmount} MB
              </Button>
            </>
          ) : (
            /* ------------------------ not eligible ----------------------- */
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Data Loan isn&apos;t available on this number
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {eligibility.isError
                    ? eligibility.error instanceof ApiRequestError
                      ? eligibility.error.message
                      : "Couldn't check eligibility right now."
                    : (info?.message ??
                      "Loans need an active plan with Zylo Data Bank.")}
                </p>
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/80">
            Simulated. No real network data is used.
          </p>
        </CardContent>
      </Card>

      {/* Confirm borrow */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Confirm Data Loan</DialogTitle>
            <DialogDescription>
              Borrow {effectiveAmount} MB. Pay back by {dueLabel}. Free of charge.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            It&apos;s a loan, not free data — repaid automatically from data
            you save into your Data Bank, or settled on your next recharge.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={borrow.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBorrow}
              disabled={borrow.isPending}
              className="gap-1.5"
            >
              {borrow.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Borrow {effectiveAmount} MB
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DataLoanCard;
