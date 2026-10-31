import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CalendarClock,
  CircleHelp,
  CreditCard,
  Gauge,
  Loader2,
  MapPin,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCw,
  Router,
  Wifi,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { AppDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatINR, formatDate } from "@/lib/format";
import type { InstallationSlot, WifiConnection, WifiInstallation, WifiPlan } from "@/api/wifi.api";
import { wifiApi } from "@/api/wifi.api";
import { useWifiAction, useWifiConnections, useWifiPlans, errorMessage, goToCheckout } from "../_hooks/use-wifi";
import { ConfirmDialog, ConnectionStatusBadge, FormField, SLOT_LABEL, WifiHero, fieldCls, isoDay } from "./wifi-ui";
import { WifiTabSwitch } from "./wifi-tab-switch";

function Info({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- tracker

function OrderTracker({ conn }: { conn: WifiConnection }) {
  const pendingInstall = conn.installations.find((i) => !["COMPLETED", "CANCELLED"].includes(i.status));
  const steps = [
    { label: "Payment confirmed", done: true },
    { label: "Router assigned", done: !!conn.unit },
    { label: "Installation completed", done: conn.status === "ACTIVE" || !!conn.activatedAt },
    { label: "Connection live", done: !!conn.activatedAt },
  ];
  const failed = pendingInstall?.status === "FAILED";
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${s.done ? "bg-primary text-primary-foreground" : "border text-muted-foreground"}`}>
            {s.done ? "✓" : i + 1}
          </span>
          <span className={s.done ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
        </div>
      ))}
      {pendingInstall && (
        <p className="pt-1 text-xs text-muted-foreground">
          Visit {pendingInstall.scheduledAt ? `scheduled for ${formatDate(pendingInstall.scheduledAt)}` : `preferred ${formatDate(pendingInstall.preferredDate)}`} ·{" "}
          {SLOT_LABEL[pendingInstall.preferredSlot]}
          {pendingInstall.technicianName ? ` · ${pendingInstall.technicianName}` : ""}
          {failed && pendingInstall.failureReason ? ` — failed: ${pendingInstall.failureReason}` : ""}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------ action dialogs

function PauseDialog({ conn }: { conn: WifiConnection }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(3);
  const act = useWifiAction(() => wifiApi.pause(conn.id, days), `Paused for ${days} day(s)`);
  const max = conn.pauseDaysRemaining;
  return (
    <>
      <Button variant="outline" size="sm" disabled={max <= 0} onClick={() => setOpen(true)}>
        <PauseCircle className="mr-1.5 h-4 w-4" /> Pause
      </Button>
      <AppDialog open={open} onOpenChange={setOpen} size="sm" title="Pause your WiFi" icon={<PauseCircle className="h-5 w-5 text-primary" />} description={`Plan validity is extended by the days actually paused. ${max} pause day(s) left this year.`}>
        <div className="space-y-3">
          <FormField label={`Pause for (${max} days max)`}>
            <input type="range" min={1} max={Math.max(1, max)} value={Math.min(days, Math.max(1, max))} onChange={(e) => setDays(Number(e.target.value))} className="w-full" />
            <span className="text-sm font-semibold">{Math.min(days, Math.max(1, max))} day(s)</span>
          </FormField>
          <Button className="w-full" disabled={act.isPending || max <= 0} onClick={() => act.mutate(undefined, { onSuccess: () => setOpen(false) })}>
            {act.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm pause
          </Button>
        </div>
      </AppDialog>
    </>
  );
}

function RescheduleDialog({ inst }: { inst: WifiInstallation }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(inst.preferredDate.slice(0, 10));
  const [slot, setSlot] = useState<InstallationSlot>(inst.preferredSlot);
  const act = useWifiAction(
    () => wifiApi.reschedule(inst.id, new Date(`${date}T09:00:00`).toISOString(), slot),
    "Installation rescheduled"
  );
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarClock className="mr-1.5 h-4 w-4" /> Reschedule
      </Button>
      <AppDialog open={open} onOpenChange={setOpen} size="sm" title="Reschedule installation" icon={<CalendarClock className="h-5 w-5 text-primary" />}>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date">
            <DatePicker min={isoDay(0)} max={isoDay(60)} value={date} onChange={setDate} className="h-9" />
          </FormField>
          <FormField label="Slot">
            <select className={fieldCls} value={slot} onChange={(e) => setSlot(e.target.value as InstallationSlot)}>
              {(Object.keys(SLOT_LABEL) as InstallationSlot[]).map((s) => (
                <option key={s} value={s}>
                  {SLOT_LABEL[s]}
                </option>
              ))}
            </select>
          </FormField>
          <Button className="col-span-2" disabled={act.isPending || !date} onClick={() => act.mutate(undefined, { onSuccess: () => setOpen(false) })}>
            {act.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
          </Button>
        </div>
      </AppDialog>
    </>
  );
}

function RenewDialog({ conn, plans }: { conn: WifiConnection; plans: WifiPlan[] }) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(conn.currentPlan?.id ?? "");
  const act = useMutation({
    mutationFn: () => wifiApi.renew(conn.id, planId || undefined),
    onSuccess: (d) => goToCheckout(d.url),
    onError: (err) => toast({ title: errorMessage(err), variant: "destructive" }),
  });
  const basePlans = plans.filter((p) => p.type === "BASE" && (!p.requiresTriBand || conn.device.band === "TRI_BAND"));
  const chosen = plans.find((p) => p.id === planId);
  return (
    <>
      <Button size="sm" className="bg-gradient-to-r from-primary to-teal-500" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-1.5 h-4 w-4" /> {conn.status === "ACTIVE" ? "Renew / change plan" : "Renew now"}
      </Button>
      <AppDialog open={open} onOpenChange={setOpen} size="default" title="Renew your broadband plan" icon={<RefreshCw className="h-5 w-5 text-primary" />} description={conn.status === "ACTIVE" ? "The new validity is added on top of your remaining days." : "Service resumes as soon as payment is confirmed."}>
        <div className="space-y-3">
          {basePlans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanId(p.id)}
              className={`flex w-full items-center justify-between rounded-lg border-2 p-3 text-left ${planId === p.id ? "border-primary bg-primary/5" : ""}`}
            >
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Gauge className="h-3.5 w-3.5 text-primary" /> {p.speedMbps} Mbps — {p.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {p.dataLimitGb ? `${p.dataLimitGb} GB` : "Unlimited"} · {p.validityDays} days
                </span>
              </span>
              <span className="font-semibold">{formatINR(p.price)}</span>
            </button>
          ))}
          <Button className="w-full" disabled={act.isPending || !planId} onClick={() => act.mutate()}>
            {act.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Pay {chosen ? formatINR(chosen.price) : ""} &amp; renew
          </Button>
        </div>
      </AppDialog>
    </>
  );
}

function AddOnDialog({ conn, plans }: { conn: WifiConnection; plans: WifiPlan[] }) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const act = useMutation({
    mutationFn: () => wifiApi.addOn(conn.id, planId),
    onSuccess: (d) => goToCheckout(d.url),
    onError: (err) => toast({ title: errorMessage(err), variant: "destructive" }),
  });
  const activeAddOns = conn.subscriptions.filter((s) => s.status === "ACTIVE" && s.wifiPlan.type === "ADD_ON").map((s) => s.wifiPlan.id);
  const available = plans.filter((p) => p.type === "ADD_ON" && !activeAddOns.includes(p.id) && (!p.requiresTriBand || conn.device.band === "TRI_BAND"));
  const chosen = plans.find((p) => p.id === planId);
  return (
    <>
      <Button variant="outline" size="sm" disabled={conn.status !== "ACTIVE"} onClick={() => setOpen(true)}>
        <Zap className="mr-1.5 h-4 w-4" /> Add booster
      </Button>
      <AppDialog open={open} onOpenChange={setOpen} size="default" title="Add a booster" icon={<Zap className="h-5 w-5 text-primary" />} description="Boosters renew together with your base plan.">
        {available.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">All boosters are already active on this connection.</p>
        ) : (
          <div className="space-y-3">
            {available.map((p) => (
              <button key={p.id} type="button" onClick={() => setPlanId(p.id)} className={`flex w-full items-center justify-between rounded-lg border-2 p-3 text-left ${planId === p.id ? "border-primary bg-primary/5" : ""}`}
                >
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.description ?? `${p.validityDays} days`}</span>
                </span>
                <span className="font-semibold">{formatINR(p.price)}</span>
              </button>
            ))}
            <Button className="w-full" disabled={act.isPending || !planId} onClick={() => act.mutate()}>
              {act.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Pay {chosen ? formatINR(chosen.price) : ""} &amp; activate
            </Button>
          </div>
        )}
      </AppDialog>
    </>
  );
}

function SupportDialog({ conn }: { conn: WifiConnection }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const act = useWifiAction(
    () => wifiApi.createTicket(conn.id, subject, description),
    (d) => `Ticket ${d.ticketNumber} created`
  );
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CircleHelp className="mr-1.5 h-4 w-4" /> Support
      </Button>
      <AppDialog open={open} onOpenChange={setOpen} size="default" title="Raise a support ticket" icon={<CircleHelp className="h-5 w-5 text-primary" />} description={`Our team will reach out about ${conn.connectionNumber}.`}>
        <div className="space-y-3">
          <FormField label="Subject">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Slow speed in the evening" />
          </FormField>
          <FormField label="Describe the issue">
            <textarea className={`${fieldCls} min-h-24`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <Button className="w-full" disabled={act.isPending || subject.trim().length < 3 || description.trim().length < 5} onClick={() => act.mutate(undefined, { onSuccess: () => setOpen(false) })}>
            {act.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit ticket
          </Button>
        </div>
      </AppDialog>
    </>
  );
}

function CancelInstallDialog({ inst }: { inst: WifiInstallation }) {
  const [open, setOpen] = useState(false);
  const act = useWifiAction(() => wifiApi.cancelInstallation(inst.id), "Installation cancelled");
  return (
    <>
      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setOpen(true)}>
        <Ban className="mr-1.5 h-4 w-4" /> Cancel
      </Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} pending={act.isPending} title="Cancel this installation?" description="The WiFi order linked to it is cancelled as well. Our team will process your refund." confirmLabel="Yes, cancel" onConfirm={() => act.mutate(undefined, { onSuccess: () => setOpen(false) })} />
    </>
  );
}

// ------------------------------------------------------------- pending orders

function PendingOrderCard({ conn }: { conn: WifiConnection }) {
  const qc = useQueryClient();
  const pending = conn.orders.filter((o) => o.status === "PENDING");
  const [checking, setChecking] = useState(false);
  const [cancelFor, setCancelFor] = useState<string | null>(null);
  const [synced, setSynced] = useState<Record<string, string>>({});

  const refresh = () => qc.invalidateQueries({ queryKey: ["wifi", "connections"] });

  const pay = useMutation({
    mutationFn: (orderId: string) => wifiApi.payOrder(orderId),
    onSuccess: (d) => (d.url ? window.location.assign(d.url) : refresh()),
    onError: (err) => toast({ title: errorMessage(err), variant: "destructive" }),
  });
  const cancel = useMutation({
    mutationFn: (orderId: string) => wifiApi.cancelOrder(orderId),
    onSuccess: () => {
      setCancelFor(null);
      toast({ title: "Order cancelled" });
      refresh();
    },
    onError: (err) => toast({ title: errorMessage(err), variant: "destructive" }),
  });

  if (pending.length === 0) return null;

  const sync = async () => {
    setChecking(true);
    try {
      for (const o of pending) {
        const r = await wifiApi.syncOrder(o.id);
        if (!r.paid) setSynced((m) => ({ ...m, [o.id]: r.sessionStatus ?? "unpaid" }));
      }
      await refresh();
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4 text-amber-600" /> Unpaid WiFi orders
        </CardTitle>
        <CardDescription>Complete the payment to continue fulfilment, or cancel orders you no longer need.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-3 text-sm">
            <div>
              <p className="font-medium">{o.wifiPlan?.name ?? (o.type === "WIFI_ORDER" ? "Router + plan" : "Order")}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(o.createdAt)} · {formatINR(o.amount)}
                {synced[o.id] ? ` · Stripe: ${synced[o.id]}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={cancel.isPending} onClick={() => setCancelFor(o.id)}>
                Cancel
              </Button>
              <Button size="sm" disabled={pay.isPending} onClick={() => pay.mutate(o.id)}>
                {pay.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Pay now
              </Button>
            </div>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={checking} onClick={sync}>
          <RotateCw className={`mr-1.5 h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} /> Check payment status
        </Button>
        <ConfirmDialog
          open={!!cancelFor}
          onOpenChange={(o) => !o && setCancelFor(null)}
          pending={cancel.isPending}
          title="Cancel this unpaid order?"
          description="The Stripe session will be expired and the order closed."
          confirmLabel="Yes, cancel"
          onConfirm={() => cancelFor && cancel.mutate(cancelFor)}
        />
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ main view

export function MyWifi({
  onSwitchTab,
  currentTab = "my",
  connectionCount,
}: {
  onSwitchTab?: (tab: "browse" | "my") => void;
  currentTab?: "browse" | "my";
  connectionCount?: number;
} = {}) {
  const navigate = useNavigate();
  const { data, isLoading } = useWifiConnections();
  const plans = useWifiPlans();
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (params.get("payment") === "cancelled") {
      toast({ title: "Checkout was cancelled — your order is unpaid and can be paid again below." });
      params.delete("payment");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const connections = useMemo(() => data ?? [], [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const live = connections.find((c) => !["CANCELLED", "DISCONNECTED"].includes(c.status));

  return (
    <div className="space-y-6">
      <WifiHero
        badge="MY CONNECTIONS"
        title="My Zylo WiFi"
        subtitle="Manage your broadband connection — renew your plan, pause when away, track installations and raise support tickets."
        right={
          <WifiTabSwitch
            tab={currentTab}
            onChange={onSwitchTab}
            count={connectionCount ?? connections.length}
          />
        }
      />

      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Wifi className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No Zylo WiFi connections yet.</p>
            <Button
              onClick={() => (onSwitchTab ? onSwitchTab("browse") : navigate("/wifi?tab=browse"))}
            >
              Get connected
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {connections.map((conn) => (
            <Card key={conn.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Router className="h-4 w-4 text-primary" /> {conn.connectionNumber}
                      <ConnectionStatusBadge status={conn.status} />
                      <Badge variant="outline">{conn.ownership === "RENTAL" ? "Rented router" : "Purchased router"}</Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 pt-1">
                      <MapPin className="h-3 w-3" /> {conn.addressLine}, {conn.city} — {conn.postalCode}
                    </CardDescription>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{conn.device.name}</p>
                    <p className="text-xs text-muted-foreground">{conn.unit ? `S/N ${conn.unit.serialNumber}` : "Router not assigned yet"}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {conn.status === "PENDING_INSTALLATION" && <OrderTracker conn={conn} />}

                {conn.currentPlan && (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Current plan</p>
                      <p className="font-display text-lg font-bold">
                        {conn.currentPlan.speedMbps} Mbps · {conn.currentPlan.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{conn.currentPlan.dataLimitGb ? `${conn.currentPlan.dataLimitGb} GB data` : "Unlimited data"}</p>
                    </div>
                    {conn.status !== "CANCELLED" && conn.status !== "DISCONNECTED" && (
                      <div className="min-w-40 flex-1">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>Validity</span>
                          <span>{conn.daysLeft} day(s) left</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-teal-500" style={{ width: `${Math.min(100, (conn.daysLeft / (conn.currentPlan.validityDays || 30)) * 100)}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Valid till {formatDate(conn.planExpiredAt)}</p>
                      </div>
                    )}
                  </div>
                )}

                {conn.status === "PAUSED" && (
                  <Info>Paused until {formatDate(conn.pauseEndsAt)}. Your plan validity is being extended.</Info>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {["ACTIVE", "GRACE_PERIOD", "SUSPENDED"].includes(conn.status) && <RenewDialog conn={conn} plans={plans.data ?? []} />}
                  {conn.status === "ACTIVE" && <PauseDialog conn={conn} />}
                  {conn.status === "PAUSED" && <ResumeButton conn={conn} />}
                  <AddOnDialog conn={conn} plans={plans.data ?? []} />
                  {conn.status !== "CANCELLED" && <SupportDialog conn={conn} />}
                  {conn.status === "PENDING_INSTALLATION" && conn.installations.filter((i) => ["REQUESTED", "SCHEDULED", "RESCHEDULED", "FAILED"].includes(i.status)).map((i) => (
                    <span key={i.id} className="flex items-center gap-1">
                      <RescheduleDialog inst={i} />
                      <CancelInstallDialog inst={i} />
                    </span>
                  ))}
                </div>

                {conn.subscriptions.filter((s) => ["ACTIVE", "PAUSED", "PENDING"].includes(s.status)).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {conn.subscriptions
                      .filter((s) => ["ACTIVE", "PAUSED", "PENDING"].includes(s.status))
                      .map((s) => (
                        <Badge key={s.id} variant={s.status === "ACTIVE" ? "success" : "secondary"} className="text-[11px]">
                          {s.wifiPlan.name} {s.status === "PENDING" ? "(activates on installation)" : s.status === "PAUSED" ? "(paused)" : `· till ${formatDate(s.endDate)}`}
                        </Badge>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {live ? <PendingOrderCard conn={live} /> : connections.length > 0 ? <PendingOrderCard conn={connections[0]} /> : null}
        </div>
      )}
    </div>
  );
}

function ResumeButton({ conn }: { conn: WifiConnection }) {
  const act = useWifiAction(() => wifiApi.resume(conn.id), "Connection resumed");
  return (
    <Button variant="outline" size="sm" disabled={act.isPending} onClick={() => act.mutate(undefined)}>
      {act.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-1.5 h-4 w-4" />} Resume now
    </Button>
  );
}

export default MyWifi;
