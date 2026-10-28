"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  IndianRupee,
  Loader2,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  XCircle,
  Zap,
} from "lucide-react";

import type { Order, OrderStatus, OrderType } from "@/api/orders.api";
import type { PaymentStatus } from "@/api/payments.api";
import { formatINR, formatDateTime, money } from "@/lib/format";
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

import { useOrders } from "../_hooks/use-orders";

/* ------------------------------------------------------------------ */
/*  Style maps                                                        */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-500/90 text-white border-amber-400/40",
  PROCESSING: "bg-sky-500/90 text-white border-sky-400/40",
  COMPLETED: "bg-emerald-500/90 text-white border-emerald-400/40",
  FAILED: "bg-destructive/90 text-destructive-foreground border-destructive/40",
  CANCELLED: "bg-muted/90 text-muted-foreground border-border/40",
  REFUNDED: "bg-muted/90 text-muted-foreground border-border/40",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const TYPE_LABELS: Record<OrderType, string> = {
  SIM_PURCHASE: "SIM Purchase",
  PLAN_PURCHASE: "Plan Purchase",
  RECHARGE: "Recharge",
};

const TYPE_ICONS: Record<OrderType, React.ReactNode> = {
  SIM_PURCHASE: <Phone className="h-3.5 w-3.5" />,
  PLAN_PURCHASE: <Package className="h-3.5 w-3.5" />,
  RECHARGE: <Zap className="h-3.5 w-3.5" />,
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  SUCCEEDED: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

/* ------------------------------------------------------------------ */
/*  Summary cards                                                     */
/* ------------------------------------------------------------------ */

function SummaryCards({ orders }: { orders: Order[] }) {
  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let failed = 0;
    let revenue = 0;

    for (const o of orders) {
      if (o.status === "COMPLETED") {
        completed += 1;
        revenue += money(o.amount);
      } else if (o.status === "PENDING" || o.status === "PROCESSING") {
        inProgress += 1;
      } else if (o.status === "FAILED") {
        failed += 1;
      }
    }
    return { completed, inProgress, failed, revenue, count: orders.length };
  }, [orders]);

  const cards = [
    {
      label: "Total Orders",
      value: stats.count.toString(),
      icon: <ClipboardList className="h-5 w-5 text-muted-foreground" />,
      accent: "text-foreground",
    },
    {
      label: "Completed",
      value: stats.completed.toString(),
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      accent: "text-emerald-600",
    },
    {
      label: "In Progress",
      value: stats.inProgress.toString(),
      icon: <RefreshCw className="h-5 w-5 text-amber-500" />,
      accent: "text-amber-600",
    },
    {
      label: "Failed",
      value: stats.failed.toString(),
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      accent: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
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

function useOrderColumns() {
  return useMemo<ColumnDef<Order, unknown>[]>(
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
            (row.original.plan?.name ?? "").toLowerCase().includes(q) ||
            (row.original.phoneNumber?.number ?? "").includes(q) ||
            row.original.id.toLowerCase().includes(q)
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline" className="gap-1.5 text-xs font-medium">
            {TYPE_ICONS[row.original.type]}
            {TYPE_LABELS[row.original.type]}
          </Badge>
        ),
        filterFn: (row, _id, filterValue: string[]) =>
          filterValue.includes(row.original.type),
      },
      {
        id: "details",
        header: "Details",
        cell: ({ row }) => {
          const o = row.original;
          const detail =
            o.plan?.name ?? o.phoneNumber?.number ?? "—";
          return (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{detail}</p>
              <p className="truncate text-xs text-muted-foreground font-mono">
                #{o.id.slice(0, 8)}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="flex items-center gap-0.5 font-display text-sm font-bold text-foreground">
            <IndianRupee className="h-3.5 w-3.5" />
            {formatINR(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={`${STATUS_STYLES[row.original.status]} text-xs`}>
            {row.original.status === "COMPLETED" && (
              <CheckCircle2 className="mr-1 h-3 w-3" />
            )}
            {STATUS_LABELS[row.original.status]}
          </Badge>
        ),
        filterFn: (row, _id, filterValue: string[]) =>
          filterValue.includes(row.original.status),
      },
      {
        id: "payment",
        header: "Payment",
        cell: ({ row }) => {
          const status = row.original.payment?.status as
            | PaymentStatus
            | undefined;
          if (!status) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <Badge
              variant="outline"
              className="gap-1 text-xs font-medium"
            >
              <CreditCard className="h-3 w-3" />
              {PAYMENT_STATUS_LABELS[status] ?? status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Placed",
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
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
  value: OrderStatus;
  icon?: React.ComponentType<{ className?: string }>;
}[] = [
  { label: "Completed", value: "COMPLETED", icon: CheckCircle2 },
  { label: "Pending", value: "PENDING", icon: ClipboardList },
  { label: "Processing", value: "PROCESSING", icon: RefreshCw },
  { label: "Failed", value: "FAILED", icon: XCircle },
  { label: "Cancelled", value: "CANCELLED", icon: XCircle },
  { label: "Refunded", value: "REFUNDED", icon: RefreshCw },
];

const TYPE_OPTIONS: {
  label: string;
  value: OrderType;
  icon?: React.ComponentType<{ className?: string }>;
}[] = [
  { label: "SIM Purchase", value: "SIM_PURCHASE", icon: Phone },
  { label: "Plan Purchase", value: "PLAN_PURCHASE", icon: Package },
  { label: "Recharge", value: "RECHARGE", icon: Zap },
];

export function AdminOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | OrderType>("ALL");

  const { data, isPending, error, refetch } = useOrders({ limit: 100 });

  const columns = useOrderColumns();

  const orders = useMemo(() => {
    const all = Array.isArray(data?.data) ? data.data : [];
    const q = search.trim().toLowerCase();

    return all.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && o.type !== typeFilter) return false;

      if (q) {
        const matchesSearch =
          (o.user?.name ?? "").toLowerCase().includes(q) ||
          (o.user?.email ?? "").toLowerCase().includes(q) ||
          (o.plan?.name ?? "").toLowerCase().includes(q) ||
          (o.phoneNumber?.number ?? "").includes(q) ||
          o.id.toLowerCase().includes(q);
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
          Order History
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All orders placed by customers — track status, fulfilment, and payment.
        </p>
      </div>

      {/* Summary cards */}
      {!isPending && !error && <SummaryCards orders={orders} />}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="orders-search"
            className="pl-9"
            placeholder="Search customer, plan, number, order ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "ALL" | OrderStatus)}
        >
          <SelectTrigger id="orders-status-filter" className="h-9 w-40">
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
          onValueChange={(v) => setTypeFilter(v as "ALL" | OrderType)}
        >
          <SelectTrigger id="orders-type-filter" className="h-9 w-44">
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
          Loading orders…
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
                : "Failed to load orders."}
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isPending && !error && orders.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 py-16 text-center">
          <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No orders found</p>
          <p className="text-xs text-muted-foreground">
            {search || statusFilter !== "ALL" || typeFilter !== "ALL"
              ? "Try a different search or filter."
              : "Orders placed by customers will appear here."}
          </p>
        </div>
      )}

      {/* Orders table */}
      {!isPending && !error && orders.length > 0 && (
        <GenericTable columns={columns} data={orders} sort pagination />
      )}
    </div>
  );
}
