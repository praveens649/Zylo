import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Ban, CalendarPlus, CheckCircle2, Loader2, PackageCheck, PackageOpen, Unplug, XCircle } from "lucide-react";
import { tvAdminApi, TV_KEYS } from "@/api/tv.api";
import type { AdminConnection, AdminInstallation, AdminOrder } from "@/api/tv.api";
import { AppDialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GenericTable from "@/components/ui/generic-table";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { useTvAction } from "../../_hooks/use-tv";
import { ConfirmDialog, ConnectionStatusBadge, FormField, SLOT_LABEL, StatusPill, fieldCls } from "../tv-ui";

function useAssign() {
  return useTvAction(tvAdminApi.assignUnit, "Unit assigned");
}

// ---------------------------------------------------------------- orders

export function OrdersTab() {
  const [status, setStatus] = useState("");
  const q = useQuery({ queryKey: [...TV_KEYS.admin, "orders", status], queryFn: () => tvAdminApi.orders(status || undefined) });
  const assign = useAssign();

  const columns = useMemo<ColumnDef<AdminOrder, unknown>[]>(
    () => [
      { accessorKey: "createdAt", header: "Date", cell: ({ row }) => formatDateTime(row.original.createdAt) },
      { id: "user", header: "Customer", cell: ({ row }) => (<div><p className="text-sm font-medium">{row.original.user.name}</p><p className="text-xs text-muted-foreground">{row.original.user.email}</p></div>) },
      { accessorKey: "type", header: "Type", cell: ({ row }) => <Badge variant="secondary">{row.original.type === "SET_TOP_BOX_ORDER" ? "Box + pack" : "Pack purchase"}</Badge> },
      { id: "items", header: "Items", cell: ({ row }) => [row.original.setTopBoxModel?.name, row.original.tvPlan?.name].filter(Boolean).join(" + ") },
      { id: "conn", header: "Connection", cell: ({ row }) => row.original.setTopBoxConnection?.connectionNumber ?? "—" },
      { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatINR(row.original.amount) },
      { id: "payment", header: "Payment", cell: ({ row }) => <StatusPill status={row.original.payment?.status ?? "PENDING"} /> },
      { accessorKey: "status", header: "Order", cell: ({ row }) => <StatusPill status={row.original.status} /> },
      {
        id: "actions", header: () => <span className="sr-only">Actions</span>, enableSorting: false,
        cell: ({ row }) => {
          const o = row.original;
          const c = o.setTopBoxConnection;
          return o.type === "SET_TOP_BOX_ORDER" && o.status === "COMPLETED" && c?.status === "PENDING_INSTALLATION" && !c.unitId ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => assign.mutate(c.id)} disabled={assign.isPending}><PackageCheck className="mr-1 h-3.5 w-3.5" />Assign unit</Button>
            </div>
          ) : null;
        },
      },
    ],
    [assign]
  );

  return (
    <div className="space-y-4">
      <select className={`${fieldCls} h-9 w-44`} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All orders</option>
        {["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {q.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : <GenericTable columns={columns} data={q.data?.data ?? []} sort pagination />}
    </div>
  );
}

// ---------------------------------------------------------- installations

function ScheduleDialog({ inst, onClose }: { inst: AdminInstallation; onClose: () => void }) {
  const [at, setAt] = useState("");
  const [name, setName] = useState(inst.technicianName ?? "");
  const [phone, setPhone] = useState(inst.technicianPhone ?? "");
  const save = useTvAction(() => tvAdminApi.schedule(inst.id, { scheduledAt: new Date(at).toISOString(), technicianName: name, technicianPhone: phone }), "Installation scheduled", onClose);
  return (
    <AppDialog open onOpenChange={(o) => !o && onClose()} title={`Schedule ${inst.connection.connectionNumber}`} description={`Customer prefers ${formatDate(inst.preferredDate)} — ${SLOT_LABEL[inst.preferredSlot]}`}>
      <div className="space-y-4">
        <FormField label="Visit date & time"><Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></FormField>
        <FormField label="Technician name"><Input value={name} onChange={(e) => setName(e.target.value)} /></FormField>
        <FormField label="Technician phone"><Input value={phone} inputMode="numeric" maxLength={10} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} /></FormField>
        <div className="flex justify-end">
          <Button disabled={save.isPending || !at || name.trim().length < 2 || !/^[6-9]\d{9}$/.test(phone)} onClick={() => save.mutate(undefined)}>Schedule</Button>
        </div>
      </div>
    </AppDialog>
  );
}

function FailDialog({ inst, onClose }: { inst: AdminInstallation; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const save = useTvAction(() => tvAdminApi.fail(inst.id, reason), "Marked as failed", onClose);
  return (
    <AppDialog open onOpenChange={(o) => !o && onClose()} title="Installation failed" description="The customer will be asked to reschedule.">
      <div className="space-y-4">
        <FormField label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer not available" /></FormField>
        <div className="flex justify-end"><Button variant="destructive" disabled={save.isPending || reason.trim().length < 3} onClick={() => save.mutate(undefined)}>Mark failed</Button></div>
      </div>
    </AppDialog>
  );
}

export function InstallationsTab() {
  const [status, setStatus] = useState("");
  const q = useQuery({ queryKey: [...TV_KEYS.admin, "installations", status], queryFn: () => tvAdminApi.installations(status || undefined) });
  const [dialog, setDialog] = useState<{ kind: "schedule" | "fail"; inst: AdminInstallation } | null>(null);
  const assign = useAssign();
  const complete = useTvAction(tvAdminApi.complete, "Installation completed — connection is live");

  const columns = useMemo<ColumnDef<AdminInstallation, unknown>[]>(
    () => [
      { id: "conn", header: "Connection", cell: ({ row }) => (<div><p className="text-sm font-semibold">{row.original.connection.connectionNumber}</p><p className="text-xs text-muted-foreground">{row.original.connection.model.name}</p></div>) },
      { id: "cust", header: "Customer", cell: ({ row }) => (<div><p className="text-sm">{row.original.connection.user.name}</p><p className="text-xs text-muted-foreground">{row.original.connection.contactPhone}</p></div>) },
      { id: "addr", header: "Address", cell: ({ row }) => <span className="text-xs">{row.original.connection.addressLine}, {row.original.connection.city} {row.original.connection.postalCode}</span> },
      { id: "pref", header: "Preferred", cell: ({ row }) => (<span className="text-xs">{formatDate(row.original.preferredDate)}<br />{SLOT_LABEL[row.original.preferredSlot]}</span>) },
      { id: "sched", header: "Scheduled", cell: ({ row }) => (row.original.scheduledAt ? (<span className="text-xs">{formatDateTime(row.original.scheduledAt)}<br />{row.original.technicianName}</span>) : "—") },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusPill status={row.original.status} /> },
      { id: "unit", header: "Unit", cell: ({ row }) => (row.original.connection.unitId ? <Badge variant="success">Assigned</Badge> : <Badge variant="warning">None</Badge>) },
      {
        id: "actions", header: () => <span className="sr-only">Actions</span>, enableSorting: false,
        cell: ({ row }) => {
          const i = row.original;
          const open = ["REQUESTED", "SCHEDULED", "RESCHEDULED"].includes(i.status);
          return (
            <div className="flex flex-wrap justify-end gap-1">
              {open && !i.connection.unitId && <Button size="sm" variant="outline" onClick={() => assign.mutate(i.connection.id)}><PackageOpen className="mr-1 h-3.5 w-3.5" />Assign unit</Button>}
              {open && <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "schedule", inst: i })}><CalendarPlus className="mr-1 h-3.5 w-3.5" />Schedule</Button>}
              {open && <Button size="sm" disabled={!i.connection.unitId || complete.isPending} onClick={() => complete.mutate(i.id)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Complete</Button>}
              {open && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDialog({ kind: "fail", inst: i })}><XCircle className="h-3.5 w-3.5" /></Button>}
            </div>
          );
        },
      },
    ],
    [assign, complete]
  );

  return (
    <div className="space-y-4">
      <select className={`${fieldCls} h-9 w-48`} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All installations</option>
        {["REQUESTED", "SCHEDULED", "RESCHEDULED", "COMPLETED", "FAILED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {q.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : <GenericTable columns={columns} data={q.data?.data ?? []} sort pagination />}
      {dialog?.kind === "schedule" && <ScheduleDialog inst={dialog.inst} onClose={() => setDialog(null)} />}
      {dialog?.kind === "fail" && <FailDialog inst={dialog.inst} onClose={() => setDialog(null)} />}
    </div>
  );
}

// ------------------------------------------------------------ connections

export function ConnectionsTab() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: [...TV_KEYS.admin, "connections", status, search],
    queryFn: () => tvAdminApi.connections({ status: status || undefined, search: search || undefined }),
  });
  const [disconnecting, setDisconnecting] = useState<AdminConnection | null>(null);
  const assign = useAssign();
  const disconnect = useTvAction(tvAdminApi.disconnect, "Connection disconnected", () => setDisconnecting(null));
  const ret = useTvAction(tvAdminApi.confirmReturn, "Return confirmed");

  const columns = useMemo<ColumnDef<AdminConnection, unknown>[]>(
    () => [
      { accessorKey: "connectionNumber", header: "Connection", cell: ({ row }) => (<div><p className="text-sm font-semibold">{row.original.connectionNumber}</p><p className="text-xs text-muted-foreground">{row.original.model.name} · {row.original.ownership === "RENTAL" ? "Rental" : "Owned"}</p></div>) },
      { id: "user", header: "Customer", cell: ({ row }) => (<div><p className="text-sm">{row.original.user.name}</p><p className="text-xs text-muted-foreground">{row.original.user.email}</p></div>) },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <ConnectionStatusBadge status={row.original.status} /> },
      { id: "packs", header: "Packs", cell: ({ row }) => (<div className="flex flex-wrap gap-1">{row.original.subscriptions.map((s) => <Badge key={s.id} variant={s.tvPlan.type === "BASE" ? "default" : "tertiary"}>{s.tvPlan.name}</Badge>)}</div>) },
      { id: "unit", header: "Unit", cell: ({ row }) => (row.original.unit ? `${row.original.unit.serialNumber} (${row.original.unit.smartCardMasked})` : "—") },
      { id: "exp", header: "Expires", cell: ({ row }) => formatDate(row.original.planExpiredAt) },
      {
        id: "actions", header: () => <span className="sr-only">Actions</span>, enableSorting: false,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex justify-end gap-1">
              {c.status === "PENDING_INSTALLATION" && !c.unit && <Button size="sm" variant="outline" onClick={() => assign.mutate(c.id)}>Assign unit</Button>}
              {["ACTIVE", "PAUSED", "GRACE_PERIOD", "SUSPENDED"].includes(c.status) && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDisconnecting(c)}><Unplug className="mr-1 h-3.5 w-3.5" />Disconnect</Button>
              )}
              {c.status === "DISCONNECTED" && c.ownership === "RENTAL" && c.unit && c.returnDueAt && (
                <Button size="sm" variant="outline" onClick={() => ret.mutate(c.id)}><Ban className="mr-1 h-3.5 w-3.5" />Confirm return</Button>
              )}
            </div>
          );
        },
      },
    ],
    [assign, disconnect, ret]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input className="h-9 w-56" placeholder="Search number / customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={`${fieldCls} h-9 w-52`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["PENDING_INSTALLATION", "ACTIVE", "PAUSED", "GRACE_PERIOD", "SUSPENDED", "DISCONNECTED", "CANCELLED"].map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
        </select>
      </div>
      {q.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : <GenericTable columns={columns} data={q.data?.data ?? []} sort pagination />}
      <ConfirmDialog
        open={!!disconnecting}
        onOpenChange={(o) => !o && setDisconnecting(null)}
        title={`Disconnect ${disconnecting?.connectionNumber}?`}
        description={
          disconnecting?.ownership === "RENTAL"
            ? `This ends ${disconnecting.user.name}'s TV service and all packs immediately, and marks the rented box for return.`
            : `This ends ${disconnecting?.user.name}'s TV service and all packs immediately.`
        }
        confirmLabel="Disconnect"
        pending={disconnect.isPending}
        onConfirm={() => disconnecting && disconnect.mutate(disconnecting.id)}
      />
    </div>
  );
}
