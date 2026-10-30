import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  Package,
  PackageCheck,
  Search,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { AppDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { wifiAdminApi, type AdminConnection, type AdminInstallation } from "@/api/wifi.api";
import { formatINR, formatDate, formatDateTime } from "@/lib/format";
import { useWifiAction } from "../../_hooks/use-wifi";
import { ConfirmDialog, ConnectionStatusBadge, FormField, SLOT_LABEL, StatusPill, fieldCls } from "../wifi-ui";

const fmt = formatDateTime;

// ------------------------------------------------------------------- orders

export function OrdersTab() {
  const [status, setStatus] = useState("");
  const orders = useQuery({
    queryKey: ["wifi", "admin", "orders", status],
    queryFn: () => wifiAdminApi.orders(status || undefined),
  });
  const rows = orders.data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">WiFi orders</CardTitle>
        <CardDescription>Router+plan orders and plan purchases/renewals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <select className={`${fieldCls} w-48`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {orders.isLoading ? (
          <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Items</th>
                  <th className="py-2 pr-3">Connection</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Payment</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{o.user.name}</span>
                      <span className="block text-xs text-muted-foreground">{o.user.email}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={o.type === "WIFI_ORDER" ? "default" : "secondary"}>
                        {o.type === "WIFI_ORDER" ? "Router + plan" : "Plan"}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {o.wifiDevice?.name && <span className="block">{o.wifiDevice.name}</span>}
                      {o.wifiPlan?.name && <span className="block text-muted-foreground">{o.wifiPlan.name}</span>}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs">
                      {o.wifiConnection ? (
                        <>
                          {o.wifiConnection.connectionNumber}
                          <span className="block"><ConnectionStatusBadge status={o.wifiConnection.status} /></span>
                        </>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{formatINR(o.amount)}</td>
                    <td className="py-2.5 pr-3">{o.payment ? <StatusPill status={o.payment.status} /> : "—"}</td>
                    <td className="py-2.5 pr-3"><StatusPill status={o.status} /></td>
                    <td className="py-2.5 text-xs">{fmt(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------- connections

export function ConnectionsTab() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const conns = useQuery({
    queryKey: ["wifi", "admin", "connections", status, search],
    queryFn: () => wifiAdminApi.connections({ status: status || undefined, search: search || undefined }),
  });
  const [disconnectFor, setDisconnectFor] = useState<AdminConnection | null>(null);
  const [returnFor, setReturnFor] = useState<AdminConnection | null>(null);
  const assign = useWifiAction((id: string) => wifiAdminApi.assignUnit(id), "Unit assigned");
  const disconnect = useWifiAction((id: string) => wifiAdminApi.disconnect(id), "Connection disconnected", () => setDisconnectFor(null));
  const confirmReturn = useWifiAction((id: string) => wifiAdminApi.confirmReturn(id), "Rental return confirmed", () => setReturnFor(null));
  const rows = conns.data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connections</CardTitle>
        <CardDescription>Assign a router unit before the installation can be completed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="w-56 pl-8" placeholder="Number, name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${fieldCls} w-52`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["PENDING_INSTALLATION", "ACTIVE", "PAUSED", "GRACE_PERIOD", "SUSPENDED", "DISCONNECTED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
            ))}
          </select>
        </div>
        {conns.isLoading ? (
          <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No connections match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Connection</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Router / unit</th>
                  <th className="py-2 pr-3">Plans</th>
                  <th className="py-2 pr-3">Valid till</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs">{c.connectionNumber}<span className="block text-muted-foreground">{c.ownership.toLowerCase()}</span></td>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{c.user.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.user.email} · {c.city}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {c.device.name}
                      {c.unit ? (
                        <span className="block text-muted-foreground">S/N {c.unit.serialNumber} · {c.unit.status.toLowerCase()}</span>
                      ) : (
                        <span className="block text-amber-600">no unit assigned</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {c.subscriptions.map((s) => (
                        <span key={s.id} className="block">{s.wifiPlan.name} ({s.status.toLowerCase()})</span>
                      ))}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{fmt(c.planExpiredAt)}</td>
                    <td className="py-2.5 pr-3"><ConnectionStatusBadge status={c.status} /></td>
                    <td className="py-2.5">
                      <div className="flex flex-col items-end gap-1">
                        {c.status === "PENDING_INSTALLATION" && !c.unit && (
                          <Button size="sm" variant="outline" disabled={assign.isPending} onClick={() => assign.mutate(c.id)}>
                            <Package className="mr-1.5 h-3.5 w-3.5" /> Assign unit
                          </Button>
                        )}
                        {["ACTIVE", "PAUSED", "GRACE_PERIOD", "SUSPENDED"].includes(c.status) && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDisconnectFor(c)}>
                            Disconnect
                          </Button>
                        )}
                        {c.status === "DISCONNECTED" && c.ownership === "RENTAL" && c.returnDueAt && (
                          <Button size="sm" variant="outline" disabled={confirmReturn.isPending} onClick={() => setReturnFor(c)}>
                            Confirm router return
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <ConfirmDialog open={!!disconnectFor} onOpenChange={(o) => !o && setDisconnectFor(null)} pending={disconnect.isPending} title={`Disconnect ${disconnectFor?.connectionNumber}?`} description="The connection and all its subscriptions are cancelled. Rented routers get a return-by date." confirmLabel="Disconnect" onConfirm={() => disconnectFor && disconnect.mutate(disconnectFor.id)} />
      <ConfirmDialog open={!!returnFor} onOpenChange={(o) => !o && setReturnFor(null)} pending={confirmReturn.isPending} title={`Confirm router return for ${returnFor?.connectionNumber}?`} description="The unit goes back to the returned pool and the deposit hold is released." confirmLabel="Confirm return" onConfirm={() => returnFor && confirmReturn.mutate(returnFor.id)} />
    </Card>
  );
}

// ----------------------------------------------------------- installations

export function InstallationsTab() {
  const [status, setStatus] = useState("");
  const insts = useQuery({
    queryKey: ["wifi", "admin", "installations", status],
    queryFn: () => wifiAdminApi.installations(status || undefined),
  });
  const [scheduleFor, setScheduleFor] = useState<AdminInstallation | null>(null);
  const [failFor, setFailFor] = useState<AdminInstallation | null>(null);
  const [completeFor, setCompleteFor] = useState<AdminInstallation | null>(null);
  const complete = useWifiAction((id: string) => wifiAdminApi.complete(id), "Installation completed — connection is live", () => setCompleteFor(null));
  const rows = insts.data?.data ?? [];

  const open = (i: AdminInstallation) => ["REQUESTED", "SCHEDULED", "RESCHEDULED", "FAILED"].includes(i.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Installations</CardTitle>
        <CardDescription>Schedule technician visits. Completing the visit activates the connection.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <select className={`${fieldCls} w-48`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["REQUESTED", "SCHEDULED", "RESCHEDULED", "COMPLETED", "FAILED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {insts.isLoading ? (
          <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No installations match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Connection / customer</th>
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Visit</th>
                  <th className="py-2 pr-3">Technician</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="font-mono text-xs">{i.connection.connectionNumber}</span>
                      <span className="block text-xs text-muted-foreground">{i.connection.user.name} · {i.connection.contactPhone}</span>
                      <span className="block text-xs text-muted-foreground">{i.connection.device.name}{!i.connection.unitId ? " · no unit" : ""}</span>
                    </td>
                    <td className="max-w-52 py-2.5 pr-3 text-xs">
                      {i.connection.addressLine}, {i.connection.city}, {i.connection.state} — {i.connection.postalCode}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {i.scheduledAt ? <span className="block">Scheduled: {fmt(i.scheduledAt)}</span> : null}
                      <span className="block text-muted-foreground">Preferred: {formatDate(i.preferredDate)} · {SLOT_LABEL[i.preferredSlot]}</span>
                      {i.customerNotes && <span className="block text-muted-foreground">“{i.customerNotes}”</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {i.technicianName ? `${i.technicianName} · ${i.technicianPhone ?? ""}` : "—"}
                      {i.failureReason && <span className="block text-destructive">{i.failureReason}</span>}
                    </td>
                    <td className="py-2.5 pr-3"><StatusPill status={i.status} /></td>
                    <td className="py-2.5">
                      {open(i) && (
                        <div className="flex flex-col items-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => setScheduleFor(i)}>Schedule</Button>
                          <Button size="sm" variant="outline" className="text-emerald-700" disabled={!i.connection.unitId || i.connection.status !== "PENDING_INSTALLATION"} onClick={() => setCompleteFor(i)}>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setFailFor(i)}>
                            <XCircle className="mr-1 h-3.5 w-3.5" /> Fail
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <ScheduleDialog inst={scheduleFor} onClose={() => setScheduleFor(null)} />
      <FailDialog inst={failFor} onClose={() => setFailFor(null)} />
      <ConfirmDialog open={!!completeFor} onOpenChange={(o) => !o && setCompleteFor(null)} pending={complete.isPending} title="Complete this installation?" description="The router is marked installed, the connection activates and the plan starts billing." confirmLabel="Complete & activate" onConfirm={() => completeFor && complete.mutate(completeFor.id)} />
    </Card>
  );
}

function ScheduleDialog({ inst, onClose }: { inst: AdminInstallation | null; onClose: () => void }) {
  const [at, setAt] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const act = useWifiAction(
    () => wifiAdminApi.schedule(inst!.id, { scheduledAt: new Date(at).toISOString(), technicianName: name, technicianPhone: phone }),
    "Visit scheduled",
    onClose
  );
  return (
    <AppDialog open={!!inst} onOpenChange={(o) => !o && onClose()} size="sm" title={`Schedule visit — ${inst?.connection.connectionNumber ?? ""}`} icon={<PackageCheck className="h-5 w-5 text-primary" />}>
      <div className="space-y-3">
        <FormField label="Scheduled at">
          <DatePicker withTime min={new Date().toISOString().slice(0, 10)} value={at} onChange={setAt} className="h-9" />
        </FormField>
        <FormField label="Technician name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Technician phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={10} />
        </FormField>
        <Button className="w-full" disabled={act.isPending || !at || name.trim().length < 2 || !/^[6-9]\d{9}$/.test(phone)} onClick={() => act.mutate(undefined)}>
          {act.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Schedule
        </Button>
      </div>
    </AppDialog>
  );
}

function FailDialog({ inst, onClose }: { inst: AdminInstallation | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const act = useWifiAction(() => wifiAdminApi.fail(inst!.id, reason), "Marked as failed", onClose);
  return (
    <AppDialog open={!!inst} onOpenChange={(o) => !o && onClose()} size="sm" title="Installation failed" icon={<XCircle className="h-5 w-5 text-destructive" />} description="The customer can reschedule from My WiFi.">
      <div className="space-y-3">
        <FormField label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer not home" />
        </FormField>
        <Button className="w-full" variant="destructive" disabled={act.isPending || reason.trim().length < 3} onClick={() => act.mutate(undefined)}>
          {act.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Mark failed
        </Button>
      </div>
    </AppDialog>
  );
}
