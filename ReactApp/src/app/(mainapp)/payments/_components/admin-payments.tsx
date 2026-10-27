"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  IndianRupee,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";

import type {
  Payment,
  PaymentType,
  PaymentStatus,
} from "@/api/payments.api";
import { formatINR, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GenericTable from "@/components/ui/generic-table";

import { usePayments } from "../_hooks/use-payments";

/* ------------------------------------------------------------------ */
/*  Style maps                                                        */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-500/90 text-white border-amber-400/40",
  SUCCEEDED: "bg-emerald-500/90 text-white border-emerald-400/40",
  FAILED: "bg-destructive/90 text-destructive-foreground border-destructive/40",
  REFUNDED: "bg-muted/90 text-muted-foreground border-border/40",
  CANCELLED: "bg-muted/90 text-muted-foreground border-border/40",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  SUCCEEDED: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

const TYPE_LABELS: Record<PaymentType, string> = {
  ONE_TIME: "One-Time",
  SUBSCRIPTION: "Subscription",
};

const TYPE_ICONS: Record<PaymentType, React.ReactNode> = {
  ONE_TIME: <CreditCard className="h-3.5 w-3.5" />,
  SUBSCRIPTION: <RefreshCw className="h-3.5 w-3.5" />,
};

/* ------------------------------------------------------------------ */
/*  Summary cards                                                     */
/* ------------------------------------------------------------------ */

function SummaryCards({ payments }: { payments: Payment[] }) {
  const stats = useMemo(() => {
    let total = 0;
    let succeeded = 0;
    let pending = 0;
    let failed = 0;

    for (const p of payments) {
      const amt = typeof p.amount === "number" ? p.amount : Number(p.amount);
      total += amt;
      if (p.status === "SUCCEEDED") succeeded += amt;
      else if (p.status === "PENDING") pending += amt;
      else if (p.status === "FAILED") failed += amt;
    }
    return { total, succeeded, pending, failed, count: payments.length };
  }, [payments]);

  const cards = [
    {
      label: "Total Collected",
      value: formatINR(stats.succeeded),
      icon: <Wallet className="h-5 w-5 text-emerald-500" />,
      accent: "text-emerald-600",
    },
    {
      label: "Pending",
      value: formatINR(stats.pending),
      icon: <Receipt className="h-5 w-5 text-amber-500" />,
      accent: "text-amber-600",
    },
    {
      label: "Failed",
      value: formatINR(stats.failed),
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      accent: "text-red-600",
    },
    {
      label: "Total Payments",
      value: stats.count.toString(),
      icon: <ArrowDownUp className="h-5 w-5 text-primary" />,
      accent: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="glass-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60">
              {c.icon}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">
                {c.label}
              </p>
              <p className={`text-lg font-bold tracking-tight ${c.accent}`}>
                {c.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table columns                                                     */
/* ------------------------------------------------------------------ */

function usePaymentColumns() {
  return useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        accessorKey: "user",
        header: "Customer",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {row.original.user?.name ?? "Unknown"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.user?.email ?? "—"}
            </p>
          </div>
        ),
        filterFn: (row, _id, filterValue: string) => {
          const q = filterValue.toLowerCase();
          return (
            (row.original.user?.name ?? "").toLowerCase().includes(q) ||
            (row.original.user?.email ?? "").toLowerCase().includes(q) ||
            (row.original.description ?? "").toLowerCase().includes(q) ||
            (row.original.stripePaymentIntentId ?? "")
              .toLowerCase()
              .includes(q)
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="gap-1.5 text-xs font-medium"
          >
            {TYPE_ICONS[row.original.type]}
            {TYPE_LABELS[row.original.type]}
          </Badge>
        ),
        filterFn: (row, _id, filterValue: string[]) =>
          filterValue.includes(row.original.type),
      },
      {
        id: "reference",
        header: "Reference",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {p.description || (p.type === "SUBSCRIPTION" ? "Subscription" : "Payment")}
              </p>
              <p className="truncate text-xs text-muted-foreground font-mono">
                {p.stripePaymentIntentId || p.stripeCheckoutSessionId || "—"}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="flex items-center gap-0.5 font-display text-sm font-bold text-primary">
            <IndianRupee className="h-3.5 w-3.5" />
            {formatINR(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            className={`${STATUS_STYLES[row.original.status]} text-xs`}
          >
            {row.original.status === "SUCCEEDED" && (
              <CheckCircle2 className="mr-1 h-3 w-3" />
            )}
            {STATUS_LABELS[row.original.status]}
          </Badge>
        ),
        filterFn: (row, _id, filterValue: string[]) =>
          filterValue.includes(row.original.status),
      },
      {
        accessorKey: "paidAt",
        header: "Paid At",
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {row.original.paidAt
              ? formatDateTime(row.original.paidAt)
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
    ],
    []
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: {
  label: string;
  value: PaymentStatus;
  icon?: React.ComponentType<{ className?: string }>;
}[] = [
  { label: "Paid", value: "SUCCEEDED", icon: CheckCircle2 },
  { label: "Pending", value: "PENDING", icon: Receipt },
  { label: "Failed", value: "FAILED", icon: XCircle },
  { label: "Refunded", value: "REFUNDED", icon: RefreshCw },
  { label: "Cancelled", value: "CANCELLED", icon: XCircle },
];

const TYPE_OPTIONS: {
  label: string;
  value: PaymentType;
  icon?: React.ComponentType<{ className?: string }>;
}[] = [
  { label: "One-Time", value: "ONE_TIME", icon: CreditCard },
  { label: "Subscription", value: "SUBSCRIPTION", icon: RefreshCw },
];

export function AdminPayments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus>(
    "ALL"
  );
  const [typeFilter, setTypeFilter] = useState<"ALL" | PaymentType>("ALL");

  const { data, isPending, error, refetch } = usePayments({ limit: 100 });

  const columns = usePaymentColumns();

  const payments = useMemo(() => {
    const all = Array.isArray(data?.data) ? data.data : [];
    const q = search.trim().toLowerCase();

    return all.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && p.type !== typeFilter) return false;

      if (q) {
        const matchesSearch =
          (p.user?.name ?? "").toLowerCase().includes(q) ||
          (p.user?.email ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.stripePaymentIntentId ?? "").toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [data, search, statusFilter, typeFilter]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Payments
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Payment transaction history — track, filter, and review all payments.
        </p>
      </div>

      {/* Summary cards */}
      {!isPending && !error && <SummaryCards payments={payments} />}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="payments-search"
            className="pl-9"
            placeholder="Search customer, reference, payment ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as "ALL" | PaymentStatus)
          }
        >
          <SelectTrigger id="payments-status-filter" className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(v) =>
            setTypeFilter(v as "ALL" | PaymentType)
          }
        >
          <SelectTrigger id="payments-type-filter" className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs"
          onClick={() => {
            setSearch("");
            setStatusFilter("ALL");
            setTypeFilter("ALL");
          }}
        >
          Clear filters
        </Button>
      </div>

      {/* Loading state */}
      {isPending && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading payments…
        </div>
      )}

      {/* Error state */}
      {error && !isPending && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error instanceof Error
                ? error.message
                : "Failed to load payments."}
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isPending && !error && payments.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 py-16 text-center">
          <Wallet className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No payments found</p>
          <p className="text-xs text-muted-foreground">
            {search || statusFilter !== "ALL" || typeFilter !== "ALL"
              ? "Try a different search or filter."
              : "Payment records will appear here."}
          </p>
        </div>
      )}

      {/* Payments table */}
      {!isPending && !error && payments.length > 0 && (
        <GenericTable
          columns={columns}
          data={payments}
          sort
          pagination
        />
      )}
    </div>
  );
}
