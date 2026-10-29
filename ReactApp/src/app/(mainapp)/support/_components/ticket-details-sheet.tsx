"use client";

import { MessageSquareReply } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import type { SupportTicket } from "@/api/support.api";
import { formatDateTime } from "@/lib/format";
import {
  CATEGORY_LABELS,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "./ticket-ui";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

/** Read-only ticket detail — used on the customer's Support page. */
export function TicketDetailsSheet({
  ticket,
  onClose,
}: {
  ticket: SupportTicket | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!ticket} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {ticket && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display">
                {ticket.ticketNumber}
              </SheetTitle>
              <SheetDescription>{ticket.subject}</SheetDescription>
            </SheetHeader>

            <div className="mt-5 flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <TicketStatusBadge status={ticket.status} />
                <TicketPriorityBadge priority={ticket.priority} />
              </div>

              <div className="flex flex-col gap-2.5">
                <DetailRow
                  label="Category"
                  value={CATEGORY_LABELS[ticket.category]}
                />
                <DetailRow
                  label="Number"
                  value={ticket.sim?.phoneNumber.number ?? "—"}
                />
                <DetailRow
                  label="TV connection"
                  value={ticket.setTopBoxConnection?.connectionNumber ?? "—"}
                />
                <DetailRow
                  label="Created"
                  value={formatDateTime(ticket.createdAt)}
                />
                {ticket.resolvedAt && (
                  <DetailRow
                    label="Resolved"
                    value={formatDateTime(ticket.resolvedAt)}
                  />
                )}
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your message
                </p>
                <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
                  {ticket.description}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Support reply
                </p>
                {ticket.adminReply ? (
                  <div className="mt-2 flex gap-2.5 rounded-lg border border-primary/25 bg-primary/5 p-3">
                    <MessageSquareReply className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="whitespace-pre-wrap text-sm">
                      {ticket.adminReply}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 rounded-lg border border-dashed border-border/80 p-3 text-sm text-muted-foreground">
                    Our team hasn&apos;t replied yet — you&apos;ll be notified
                    when they do.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
