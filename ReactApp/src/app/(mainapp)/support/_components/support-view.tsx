"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  LifeBuoy,
  Plus,
  RefreshCw,
  Ticket as TicketIcon,
} from "lucide-react";

import type { SupportTicket, TicketStatus } from "@/api/support.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

import { useMyTickets } from "../_hooks/use-support";
import { NewTicketDialog } from "./new-ticket-dialog";
import { TicketDetailsSheet } from "./ticket-details-sheet";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  TicketStatusBadge,
} from "./ticket-ui";

const STATUS_FILTERS: { value: TicketStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: STATUS_LABELS.OPEN },
  { value: "IN_PROGRESS", label: STATUS_LABELS.IN_PROGRESS },
  { value: "RESOLVED", label: STATUS_LABELS.RESOLVED },
  { value: "CLOSED", label: STATUS_LABELS.CLOSED },
];

export function SupportView() {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const { data, isPending, error, refetch } = useMyTickets(
    statusFilter === "ALL" ? undefined : statusFilter
  );
  const tickets = useMemo(() => data?.data ?? [], [data]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Support
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Raise an issue and track its progress — replies from our team show
            up on the ticket.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          New ticket
        </Button>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              statusFilter === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isPending && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
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

      {/* Ticket list */}
      {!isPending && !error && (
        <>
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LifeBuoy className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                {statusFilter === "ALL"
                  ? "No tickets yet"
                  : `No ${STATUS_FILTERS.find((f) => f.value === statusFilter)?.label.toLowerCase()} tickets`}
              </h3>
              <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                Facing an issue with your SIM, recharge, or Zylo TV? Raise a
                ticket and we&apos;ll take it from there.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New ticket
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className="group rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-muted-foreground">
                      <TicketIcon className="h-3.5 w-3.5" />
                      {ticket.ticketNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {CATEGORY_LABELS[ticket.category]}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      {ticket.adminReply && (
                        <span className="text-xs font-medium text-primary">
                          Replied
                        </span>
                      )}
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {ticket.subject}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {ticket.description}
                  </p>
                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    {ticket.sim?.phoneNumber.number && (
                      <span>{ticket.sim.phoneNumber.number}</span>
                    )}
                    <span className="ml-auto">
                      {formatDateTime(ticket.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {isPending === false && !error && tickets.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {data?.meta
            ? `Showing ${tickets.length} of ${data.meta.total} tickets`
            : `${tickets.length} tickets`}
        </p>
      )}

      <NewTicketDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <TicketDetailsSheet ticket={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default SupportView;
