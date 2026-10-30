"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CirclePlay,
  HandCoins,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  SmartphoneCharging,
  Wrench,
} from "lucide-react";

import { ApiRequestError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

import type {
  AdminLoan,
  DataLoanStatus,
  DataLoanTransactionType,
} from "@/api/loans.api";
import {
  useAdminLoanDetail,
  useAdminLoans,
  useAdminLoanSummary,
  useCancelLoan,
  useRunNightlyJob,
} from "../_hooks/use-admin-loans";

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

const OPEN_STATUSES: DataLoanStatus[] = ["ACTIVE", "PARTIALLY_REPAID", "DUE"];

const TXN_META: Record<DataLoanTransactionType, { label: string; icon: typeof Landmark }> = {
  LOAN_ISSUED: { label: "Borrowed", icon: HandCoins },
  BANK_REPAYMENT: { label: "Data Bank repayment", icon: Landmark },
  RECHARGE_REPAYMENT: { label: "Settled by recharge", icon: SmartphoneCharging },
  ADJUSTMENT: { label: "Adjustment", icon: Wrench },
};

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof HandCoins;
  accent: string;
}) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-2xl font-black text-foreground">
            {value}
          </p>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Detail dialog — full loan, ledger, customer/SIM context, cancel action. */
function LoanDetailDialog({
  loanId,
  onClose,
}: {
  loanId: string | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const detail = useAdminLoanDetail(loanId);
  const cancel = useCancelLoan();
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const loan = detail.data;
  const isOpen = loan ? OPEN_STATUSES.includes(loan.status) : false;

  const handleCancel = () => {
    if (!loanId) return;
    cancel.mutate(
      { id: loanId, reason: reason.trim() },
      {
        onSuccess: () => {
          toast({ title: "Loan cancelled", description: "The loan was written off and the customer was notified." });
          setConfirming(false);
          setReason("");
          onClose();
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Cancel failed",
            description: err instanceof ApiRequestError ? err.message : "Please try again.",
          });
        },
      },
    );
  };

  return (
    <Dialog open={Boolean(loanId)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            Loan {loan ? formatMb(loan.originalAmountMb) : ""}
            {loan && (
              <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[loan.status]}`}>
                {STATUS_LABEL[loan.status]}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {loan
              ? `${loan.user.name} · ${loan.user.email} · ${loan.sim.phoneNumber.number}`
              : "Loading…"}
          </DialogDescription>
        </DialogHeader>

        {detail.isPending ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading loan…
          </p>
        ) : loan ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Borrowed", value: formatMb(loan.originalAmountMb) },
                { label: "Outstanding", value: formatMb(loan.outstandingAmountMb) },
                { label: "Borrowed at", value: formatDate(loan.borrowedAt) },
                { label: "Due", value: formatDate(loan.dueAt) },
              ].map((f) => (
                <div key={f.label} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-bold text-foreground">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ledger
              </p>
              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                {(loan.transactions ?? []).map((txn) => {
                  const meta = TXN_META[txn.type] ?? TXN_META.ADJUSTMENT;
                  const Icon = meta.icon;
                  return (
                    <div key={txn.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">
                          {meta.label} <span className="font-semibold">{formatMb(txn.amountMb)}</span>
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
            </div>

            {isOpen && !confirming && (
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirming(true)}
              >
                Cancel this loan
              </Button>
            )}

            {isOpen && confirming && (
              <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cancel-reason" className="text-xs font-medium">
                    Reason — sent to the customer
                  </Label>
                  <Input
                    id="cancel-reason"
                    placeholder="e.g. Issued twice by mistake"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirming(false)}
                    disabled={cancel.isPending}
                  >
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    disabled={reason.trim().length < 3 || cancel.isPending}
                    onClick={handleCancel}
                  >
                    {cancel.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirm cancellation
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">Loan not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function LoansAdminView() {
  const { toast } = useToast();
  const [status, setStatus] = useState<DataLoanStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [asOf, setAsOf] = useState("");

  const summary = useAdminLoanSummary();
  const list = useAdminLoans({
    status: status === "ALL" ? undefined : status,
    search: search || undefined,
    page,
    limit: 15,
  });
  const runNightly = useRunNightlyJob();

  const loans = useMemo(() => list.data?.data ?? [], [list.data]);
  const meta = list.data?.meta;
  const s = summary.data;

  const handleRunJob = () => {
    const iso = asOf ? new Date(`${asOf}T00:00:00+05:30`).toISOString() : undefined;
    runNightly.mutate(iso, {
      onSuccess: (r) => {
        toast({
          title: "Nightly job finished",
          description: `Scanned ${r.scanned} loan(s): ${r.dueLoans} due, ${r.repaidLoans} repaid (${r.repaidMb} MB)${r.errors ? `, ${r.errors} error(s)` : ""}.`,
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Job failed",
          description: err instanceof ApiRequestError ? err.message : "Please try again.",
        });
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/10 p-6 shadow-sm md:p-8">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="border-primary/30 bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <HandCoins className="mr-1 h-3.5 w-3.5" />
              Simulated lending — no real network data
            </Badge>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Zylo Data Loans
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Every loan issued to customers, its repayment ledger, due-date
              processing, and admin write-offs.
            </p>
          </div>

          {s?.demoJobsEnabled && (
            <div className="flex shrink-0 items-end gap-2 rounded-xl border border-border/60 bg-background/70 p-3">
              <div className="space-y-1">
                <Label htmlFor="job-date" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Run as of (IST)
                </Label>
                <DatePicker
                  id="job-date"
                  value={asOf}
                  onChange={setAsOf}
                  className="h-8 w-40 text-xs"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={runNightly.isPending}
                onClick={handleRunJob}
              >
                {runNightly.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CirclePlay className="h-3.5 w-3.5" />
                )}
                Run nightly job
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Open loans"
          value={String(s?.openCount ?? "—")}
          hint="Active, partly repaid or due"
          icon={HandCoins}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <SummaryCard
          label="Due loans"
          value={String(s?.dueCount ?? "—")}
          hint="Past their pay-back date"
          icon={CalendarClock}
          accent="bg-amber-500/10 text-amber-600"
        />
        <SummaryCard
          label="Outstanding"
          value={s ? formatMb(s.totalOutstandingMb) : "—"}
          hint="Across all open loans"
          icon={Landmark}
          accent="bg-sky-500/10 text-sky-600"
        />
        <SummaryCard
          label="Repaid this month"
          value={s ? formatMb(s.repaidThisMonthMb) : "—"}
          hint="IST month to date"
          icon={RefreshCw}
          accent="bg-primary/10 text-primary"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer email, name or number…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as DataLoanStatus | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {(Object.keys(STATUS_LABEL) as DataLoanStatus[]).map((st) => (
              <SelectItem key={st} value={st}>
                {STATUS_LABEL[st]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              All loans
            </span>
            {meta && (
              <span className="text-[11px] text-muted-foreground">
                {meta.total} record{meta.total === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {list.isError ? (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {list.error instanceof ApiRequestError
                ? list.error.message
                : "Couldn't load loans."}
            </div>
          ) : list.isPending ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading loans…
            </p>
          ) : loans.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No loans match these filters.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Borrowed</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan: AdminLoan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {loan.user.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {loan.user.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {loan.sim.phoneNumber.number}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatMb(loan.originalAmountMb)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatMb(loan.outstandingAmountMb)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[loan.status]}`}>
                          {STATUS_LABEL[loan.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(loan.dueAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailId(loan.id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {meta && meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    Page {meta.page} of {meta.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <LoanDetailDialog loanId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

export default LoansAdminView;
