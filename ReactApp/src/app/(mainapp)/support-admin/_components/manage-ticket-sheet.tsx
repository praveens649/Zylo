"use client";

import { useState } from "react";
import { Loader2, Mail, Smartphone, Tv } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import type {
  SupportTicket,
  TicketPriority,
  TicketStatus,
} from "@/api/support.api";
import { formatDateTime } from "@/lib/format";
import { useUpdateTicket } from "../../support/_hooks/use-support";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TicketStatusBadge,
  fieldCls,
} from "../../support/_components/ticket-ui";

/** Mirrors ALLOWED_TRANSITIONS in the server's SupportService. */
const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "CLOSED", "OPEN"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["IN_PROGRESS"],
};

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

/** Rendered with key={ticket.id} so form state re-seeds per ticket. */
function ManageTicketForm({
  ticket,
  onClose,
}: {
  ticket: SupportTicket;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [reply, setReply] = useState(ticket.adminReply ?? "");

  const updateTicket = useUpdateTicket();

  const statusOptions = [ticket.status, ...ALLOWED_TRANSITIONS[ticket.status]];
  const dirty =
    status !== ticket.status ||
    priority !== ticket.priority ||
    reply.trim() !== (ticket.adminReply ?? "");

  const save = () => {
    if (!dirty || updateTicket.isPending) return;
    updateTicket.mutate(
      {
        id: ticket.id,
        payload: {
          ...(status !== ticket.status ? { status } : {}),
          ...(priority !== ticket.priority ? { priority } : {}),
          ...(reply.trim() !== (ticket.adminReply ?? "")
            ? { adminReply: reply.trim() }
            : {}),
        },
      },
      { onSuccess: onClose }
    );
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display">{ticket.ticketNumber}</SheetTitle>
        <SheetDescription>{ticket.subject}</SheetDescription>
      </SheetHeader>

      <div className="mt-5 flex flex-col gap-5">
        {/* Customer */}
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Customer
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            {ticket.user?.image ? (
              <img
                src={ticket.user.image}
                alt={ticket.user.name}
                className="h-8 w-8 rounded-full border border-primary/20 object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {ticket.user?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {ticket.user?.name ?? "Unknown"}
              </p>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                {ticket.user?.email ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-2.5">
          <MetaRow label="Category" value={CATEGORY_LABELS[ticket.category]} />
          <MetaRow
            label="Number"
            value={
              ticket.sim ? (
                <span className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                  {ticket.sim.phoneNumber.number}
                </span>
              ) : (
                "—"
              )
            }
          />
          <MetaRow
            label="TV connection"
            value={
              ticket.setTopBoxConnection ? (
                <span className="flex items-center gap-1.5">
                  <Tv className="h-3.5 w-3.5 text-muted-foreground" />
                  {ticket.setTopBoxConnection.connectionNumber}
                </span>
              ) : (
                "—"
              )
            }
          />
          <MetaRow label="Created" value={formatDateTime(ticket.createdAt)} />
          <MetaRow
            label="Current status"
            value={<TicketStatusBadge status={ticket.status} />}
          />
        </div>

        <Separator />

        {/* Issue */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Issue
          </p>
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
            {ticket.description}
          </p>
        </div>

        {/* Admin controls */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as TicketStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as TicketPriority)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-reply">Reply to customer</Label>
          <textarea
            id="admin-reply"
            className={`${fieldCls} min-h-[110px]`}
            placeholder="Explain the fix, ask for more details, or let them know next steps…"
            maxLength={2000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Saving notifies the customer when the reply or status changes.
          </p>
        </div>

        <div className="flex justify-end gap-2 pb-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!dirty || updateTicket.isPending}>
            {updateTicket.isPending && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Save changes
          </Button>
        </div>
      </div>
    </>
  );
}

export function ManageTicketSheet({
  ticket,
  onClose,
}: {
  ticket: SupportTicket | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!ticket} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {ticket && (
          <ManageTicketForm
            key={ticket.id}
            ticket={ticket}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
