"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  LifeBuoy,
  RefreshCw,
  Wrench,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import type { SupportTicket } from "@/api/support.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import GenericTable from "@/components/ui/generic-table";
import { formatDateTime } from "@/lib/format";

import { useAdminTickets } from "../../support/_hooks/use-support";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "../../support/_components/ticket-ui";
import { ManageTicketSheet } from "./manage-ticket-sheet";

/** Multi-select faceted filter — the FacetedFilter stores string[] values. */
const inSelected = (
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: unknown
) =>
  !Array.isArray(filterValue) ||
  filterValue.length === 0 ||
  filterValue.includes(row.getValue(columnId));

export function AdminSupportView() {
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const { data, isPending, error, refetch } = useAdminTickets({});
  const tickets = useMemo(() => data?.data ?? [], [data]);

  const counts = useMemo(() => {
    const c = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 };
    for (const t of tickets) c[t.status] += 1;
    return c;
  }, [tickets]);

  const columns = useMemo<ColumnDef<SupportTicket, unknown>[]>(
    () => [
      {
        id: "ticket",
        accessorFn: (t) => `${t.ticketNumber} ${t.subject}`,
        header: "Ticket",
        cell: ({ row }) => (
          <div className="min-w-0 py-1">
            <p className="font-mono text-xs font-semibold text-muted-foreground">
              {row.original.ticketNumber}
            </p>
            <p className="mt-0.5 max-w-[280px] truncate text-sm font-medium">
              {row.original.subject}
            </p>
          </div>
        ),
      },
      {
        id: "customer",
        accessorFn: (t) => `${t.user?.name ?? ""} ${t.user?.email ?? ""}`,
        header: "Customer",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {row.original.user?.name ?? "—"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.user?.email ?? ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-sm">
            {CATEGORY_LABELS[row.original.category]}
          </span>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        filterFn: inSelected,
        cell: ({ row }) => (
          <TicketPriorityBadge priority={row.original.priority} />
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: inSelected,
        cell: ({ row }) => (
          <TicketStatusBadge status={row.original.status} />
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
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setSelected(row.original)}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Manage
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Support Desk
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review customer issues, reply, and move tickets through their
          lifecycle.
        </p>
      </div>

      {/* Summary cards */}
      {!isPending && !error && tickets.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Open", count: counts.OPEN, icon: LifeBuoy, cls: "text-amber-600" },
            { label: "In progress", count: counts.IN_PROGRESS, icon: Wrench, cls: "text-primary" },
            { label: "Resolved", count: counts.RESOLVED, icon: CheckCircle2, cls: "text-emerald-600" },
            { label: "Closed", count: counts.CLOSED, icon: Clock3, cls: "text-muted-foreground" },
          ].map(({ label, count, icon: Icon, cls }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className={`h-5 w-5 ${cls}`} />
                <div>
                  <p className="text-xl font-bold leading-none">{count}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading */}
      {isPending && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading tickets…
        </div>
      )}

      {/* Error */}
      {error && !isPending && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error instanceof Error
                ? error.message
                : "Failed to load tickets."}
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tickets table */}
      {!isPending && !error && (
        <GenericTable
          columns={columns}
          data={tickets}
          sort
          filter
          filterColumn="ticket"
          filterPlaceHolder="Search tickets…"
          filterWithSelect
          filterWithSelectFieldNames={["status", "priority"]}
          filterWithSelectFieldOptions={[
            Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
            Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          pagination
        />
      )}

      <ManageTicketSheet ticket={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default AdminSupportView;
