"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  Check,
  CircleDashed,
  Clock,
  CreditCard,
  LifeBuoy,
  Loader2,
  MapPin,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Tv,
} from "lucide-react";
import { tvApi } from "@/api/tv.api";
import type { InstallationSlot, TvConnection, TvInstallation, TvPack } from "@/api/tv.api";
import { AppDialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { goToCheckout, useTvAction, useTvConnections, useTvPlans } from "../_hooks/use-tv";
import {
  ConfirmDialog,
  ConnectionStatusBadge,
  FormField,
  isoDay,
  ResolutionBadge,
  SLOT_LABEL,
  TvHero,
  fieldCls,
} from "./tv-ui";

type Dialog = "addon" | "pause" | "reschedule" | "support" | null;

function Tracker({ c }: { c: TvConnection }) {
  const inst = c.installations[0];
  const steps = [
    { label: "Order placed", done: true },
    { label: "Payment confirmed", done: c.orders.find((o) => o.type === "SET_TOP_BOX_ORDER")?.status === "COMPLETED" },
    { label: "Box assigned", done: !!c.unit },
    { label: "Visit scheduled", done: !!inst && ["SCHEDULED", "RESCHEDULED", "COMPLETED"].includes(inst.status) },
    { label: "Installed", done: inst?.status === "COMPLETED" },
    { label: "Live", done: c.status !== "PENDING_INSTALLATION" && c.status !== "CANCELLED" },
  ];
  const next = steps.findIndex((s) => !s.done);
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2 text-xs">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
              s.done ? "border-emerald-500 bg-emerald-500 text-white" : i === next ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {s.done ? <Check className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
          </span>
          <span className={s.done ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

function AddOnDialog({ c, onClose }: { c: TvConnection; onClose: () => void }) {
  const plans = useTvPlans();
  const buy = useTvAction((id: string) => tvApi.addOn(c.id, id), "Redirecting to payment…", (r) => goToCheckout(r.url));
  const owned = new Map(
    c.subscriptions.filter((s) => s.status === "ACTIVE").map((s) => [s.tvPlan.id, s] as const)
  );
  const list = (plans.data ?? []).filter((p) => p.type === "ADD_ON");
  const baseEnd = c.planExpiredAt ? new Date(c.planExpiredAt) : null;
  return (
    <AppDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Add an extra pack"
      description={`Add-ons run on top of your base pack and end with it${baseEnd ? ` (${formatDate(c.planExpiredAt)})` : ""}.`}
    >
      {plans.isPending && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
      <div className="space-y-2">
        {list.map((p: TvPack) => {
          const blocked = p.requires4kBox && c.model.resolution !== "UHD_4K";
          const active = owned.get(p.id);
          // Already capped at the base end — extending adds zero days.
          const maxed =
            !!active?.endDate && !!baseEnd && new Date(active.endDate).getTime() >= baseEnd.getTime();
          const effectiveDays = baseEnd ? (c.daysLeft ?? 0) : p.validityDays;
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{p.name} {active && <Badge variant="success">Active</Badge>}</p>
                <p className="text-xs text-muted-foreground">
                  {p.channelCount} channels · ends {baseEnd ? formatDate(c.planExpiredAt) : `in ${p.validityDays} days`} with your base pack
                  {effectiveDays < p.validityDays && !active ? ` (${effectiveDays} day(s) left)` : ""}
                  {blocked && " · needs a 4K box"}
                </p>
              </div>
              <Button size="sm" disabled={blocked || maxed || buy.isPending} onClick={() => buy.mutate(p.id)}>
                {maxed ? "Runs full term" : active ? "Extend" : "Add"} · {formatINR(p.price)}
              </Button>
            </div>
          );
        })}
      </div>
    </AppDialog>
  );
}

function PauseDialog({ c, onClose }: { c: TvConnection; onClose: () => void }) {
  const [days, setDays] = useState(Math.min(7, c.pauseDaysRemaining));
  const pause = useTvAction((d: number) => tvApi.pause(c.id, d), "Connection paused", onClose);
  return (
    <AppDialog open onOpenChange={(o) => !o && onClose()} title="Pause Zylo TV" description="Going away? Your pack is extended by the days you stay paused. Limit: 30 days per year.">
      <div className="space-y-4">
        <p className="text-sm">You have <strong>{c.pauseDaysRemaining}</strong> pause day(s) left this year.</p>
        <FormField label={`Pause for ${days} day(s)`}>
          <input type="range" min={1} max={Math.max(1, c.pauseDaysRemaining)} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pause.isPending || c.pauseDaysRemaining < 1} onClick={() => pause.mutate(days)}>
            {pause.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Pause for {days} day(s)
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}

function RescheduleDialog({ inst, onClose }: { inst: TvInstallation; onClose: () => void }) {
  const [date, setDate] = useState(inst.preferredDate.slice(0, 10) >= isoDay(1) ? inst.preferredDate.slice(0, 10) : isoDay(2));
  const [slot, setSlot] = useState<InstallationSlot>(inst.preferredSlot);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const save = useTvAction(() => tvApi.reschedule(inst.id, new Date(date).toISOString(), slot), "Installation rescheduled", onClose);
  const cancel = useTvAction(() => tvApi.cancelInstallation(inst.id), "Installation cancelled", onClose);
  return (
    <>
      <AppDialog open onOpenChange={(o) => !o && onClose()} title="Reschedule installation">
        <div className="space-y-4">
          <FormField label="New date"><Input type="date" min={isoDay(1)} max={isoDay(60)} value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
          <FormField label="Time slot">
            <select className={`${fieldCls} h-9`} value={slot} onChange={(e) => setSlot(e.target.value as InstallationSlot)}>
              {Object.entries(SLOT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" className="text-destructive" disabled={cancel.isPending} onClick={() => setConfirmCancel(true)}>
              Cancel installation
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate(undefined)}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </div>
        </div>
      </AppDialog>
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel installation and order?"
        description="This cancels the visit and the whole TV order. If you already paid, our team will process your refund."
        confirmLabel="Cancel order"
        pending={cancel.isPending}
        onConfirm={() => cancel.mutate(undefined)}
      />
    </>
  );
}

function SupportDialog({ c, onClose }: { c: TvConnection; onClose: () => void }) {
  const [subject, setSubject] = useState(`Issue with ${c.connectionNumber}`);
  const [description, setDescription] = useState("");
  const send = useTvAction(() => tvApi.createTicket(c.id, subject, description), (t) => `Ticket ${t.ticketNumber} created`, onClose);
  return (
    <AppDialog open onOpenChange={(o) => !o && onClose()} title="Contact support" description={`Linked to ${c.connectionNumber}`}>
      <div className="space-y-4">
        <FormField label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></FormField>
        <FormField label="Describe the problem">
          <textarea className={`${fieldCls} min-h-[100px]`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <div className="flex justify-end">
          <Button disabled={send.isPending || subject.trim().length < 3 || description.trim().length < 5} onClick={() => send.mutate(undefined)}>
            {send.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit ticket
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}

/** Unpaid orders: pay again, re-check with Stripe, or cancel. */
function PendingPayments({ c }: { c: TvConnection }) {
  const pending = c.orders.filter((o) => o.status === "PENDING");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const pay = useTvAction(
    (id: string) => tvApi.payOrder(id),
    (r) => (r.alreadyPaid ? "Payment already received" : "Redirecting to payment…"),
    (r) => !r.alreadyPaid && goToCheckout(r.url)
  );
  const check = useTvAction(
    (id: string) => tvApi.syncOrder(id),
    (r) => (r.paid ? "Payment confirmed — thank you!" : "Payment not completed yet")
  );
  const cancel = useTvAction((id: string) => tvApi.cancelOrder(id), "Order cancelled", () => setCancelling(null));

  if (pending.length === 0) return null;
  return (
    <div className="space-y-2">
      {pending.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 text-amber-600" />
            <div className="text-sm">
              <p className="font-semibold">
                Payment pending · {formatINR(o.amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {o.type === "SET_TOP_BOX_ORDER"
                  ? o.setTopBoxModelId
                    ? "Box and first pack"
                    : "Monthly box rent"
                  : o.tvPlan?.name ?? "Pack"}{" "}
                — complete the payment to continue.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pay.isPending} onClick={() => pay.mutate(o.id)}>
              {pay.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CreditCard className="mr-1.5 h-3.5 w-3.5" />}
              Pay now
            </Button>
            <Button size="sm" variant="outline" disabled={check.isPending} onClick={() => check.mutate(o.id)}>
              {check.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
              I've paid — check
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" disabled={cancel.isPending} onClick={() => setCancelling(o.id)}>
              Cancel
            </Button>
          </div>
        </div>
      ))}
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancel this unpaid order?"
        description="The order is cancelled and its checkout link stops working. You can place a fresh order anytime."
        confirmLabel="Cancel order"
        pending={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling)}
      />
    </div>
  );
}

function ConnectionCard({ c }: { c: TvConnection }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const renew = useTvAction(() => tvApi.renew(c.id), "Redirecting to payment…", (r) => goToCheckout(r.url));
  const resume = useTvAction(() => tvApi.resume(c.id), "Welcome back — Zylo TV resumed");

  const inst = c.installations[0];
  const live = ["ACTIVE", "GRACE_PERIOD", "SUSPENDED"].includes(c.status);
  const progress = c.currentPack ? Math.min(100, Math.round((c.daysLeft / c.currentPack.validityDays) * 100)) : 0;
  const addOns = c.subscriptions.filter((s) => s.tvPlan.type === "ADD_ON" && ["ACTIVE", "PAUSED", "PENDING"].includes(s.status));
  const canReschedule = inst && ["REQUESTED", "SCHEDULED", "RESCHEDULED", "FAILED"].includes(inst.status);

  return (
    <Card className="overflow-hidden">
      <div className={`h-1.5 ${c.status === "ACTIVE" ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-amber-500 to-rose-400"}`} />
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Tv className="h-6 w-6" /></div>
            <div>
              <p className="font-display text-lg font-bold">{c.connectionNumber}</p>
              <p className="text-xs text-muted-foreground">{c.model.name} · {c.ownership === "RENTAL" ? "Rented" : "Owned"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <ResolutionBadge resolution={c.model.resolution} />
            <ConnectionStatusBadge status={c.status} />
          </div>
        </div>

        <PendingPayments c={c} />

        {c.status === "PENDING_INSTALLATION" && <Tracker c={c} />}

        {c.status === "GRACE_PERIOD" && (
          <p className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" /> Pack expired. Renew by {formatDate(c.gracePeriodEndsAt)} to avoid suspension.
          </p>
        )}
        {c.status === "SUSPENDED" && (
          <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> Service suspended. Renew your pack to restore it.
          </p>
        )}
        {c.status === "PAUSED" && (
          <p className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
            Paused until <strong>{formatDate(c.pauseEndsAt)}</strong>. Your pack will be extended by the days paused.
          </p>
        )}
        {c.status === "DISCONNECTED" && c.returnDueAt && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">Please return your rented box by {formatDate(c.returnDueAt)}.</p>
        )}

        {(live || c.status === "PAUSED") && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Current pack</p>
              <p className="mt-1 font-display text-lg font-bold">{c.currentPack?.name ?? "No active pack"}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-teal-400" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-sm"><strong>{c.daysLeft}</strong> day(s) left · ends {formatDate(c.planExpiredAt)}</p>
              {addOns.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {addOns.map((s) => <Badge key={s.id} variant="tertiary">{s.tvPlan.name}</Badge>)}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Your box</p>
              <p className="mt-1">Serial: <strong>{c.unit?.serialNumber ?? "—"}</strong></p>
              <p>Smart card: <strong>{c.unit?.smartCardMasked ?? "—"}</strong></p>
              {c.ownership === "RENTAL" && (
                <p className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${c.rentOverdue ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {c.rentOverdue
                    ? "Rent due — pay the pending order below"
                    : `Rent ${c.model.rentalPerMonth != null ? `${formatINR(c.model.rentalPerMonth)}/mo` : ""} on autopay${c.rentPaidUntil ? ` · covered till ${formatDate(c.rentPaidUntil)}` : ""}`}
                </p>
              )}
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{c.addressLine}, {c.city} {c.postalCode}</p>
            </div>
          </div>
        )}

        {inst && inst.status !== "COMPLETED" && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 p-3 text-sm">
            <div className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-semibold">Installation · {inst.status.replaceAll("_", " ").toLowerCase()}</p>
                <p className="text-xs text-muted-foreground">
                  {inst.scheduledAt ? `Visit ${formatDateTime(inst.scheduledAt)}` : `Requested ${formatDate(inst.preferredDate)}, ${SLOT_LABEL[inst.preferredSlot]}`}
                  {inst.technicianName && ` · ${inst.technicianName} (${inst.technicianPhone})`}
                  {inst.failureReason && ` · ${inst.failureReason}`}
                </p>
              </div>
            </div>
            {canReschedule && <Button size="sm" variant="outline" onClick={() => setDialog("reschedule")}>Reschedule / cancel</Button>}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {live && (
            <Button size="sm" disabled={renew.isPending} onClick={() => renew.mutate(undefined)}>
              {renew.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}Renew pack
            </Button>
          )}
          {c.status === "ACTIVE" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setDialog("addon")}><Plus className="mr-1.5 h-3.5 w-3.5" />Add-on</Button>
              <Button size="sm" variant="outline" onClick={() => setDialog("pause")}><PauseCircle className="mr-1.5 h-3.5 w-3.5" />Pause</Button>
            </>
          )}
          {c.status === "PAUSED" && (
            <Button size="sm" variant="outline" disabled={resume.isPending} onClick={() => resume.mutate(undefined)}>
              <PlayCircle className="mr-1.5 h-3.5 w-3.5" />Resume now
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setDialog("support")}><LifeBuoy className="mr-1.5 h-3.5 w-3.5" />Support</Button>
        </div>

        {dialog === "addon" && <AddOnDialog c={c} onClose={() => setDialog(null)} />}
        {dialog === "pause" && <PauseDialog c={c} onClose={() => setDialog(null)} />}
        {dialog === "reschedule" && inst && <RescheduleDialog inst={inst} onClose={() => setDialog(null)} />}
        {dialog === "support" && <SupportDialog c={c} onClose={() => setDialog(null)} />}
      </CardContent>
    </Card>
  );
}

export function MyTv() {
  const q = useTvConnections();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const list = (q.data ?? []).filter((c) => c.status !== "CANCELLED");
  const checked = useRef(new Set<string>());

  // Opening My TV re-checks unpaid orders with Stripe, so a payment that finished
  // (but whose webhook/redirect never arrived) is picked up automatically.
  useEffect(() => {
    const ids = (q.data ?? [])
      .flatMap((c) => c.orders.filter((o) => o.status === "PENDING").map((o) => o.id))
      .filter((id) => !checked.current.has(id));
    if (ids.length === 0) return;
    ids.forEach((id) => checked.current.add(id));
    void Promise.allSettled(ids.map((id) => tvApi.syncOrder(id))).then((rs) => {
      if (rs.some((r) => r.status === "fulfilled" && r.value.paid)) {
        qc.invalidateQueries({ queryKey: ["tv", "connections"] });
      }
    });
  }, [q.data, qc]);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <TvHero
        badge="Zylo TV"
        title="My TV"
        subtitle="Track your installation, renew packs, add extra channels or pause while you travel."
        right={<Button asChild className="shrink-0"><Link to="/tv"><Plus className="mr-2 h-4 w-4" />New connection</Link></Button>}
      />
      {params.get("payment") === "cancelled" && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Payment wasn't completed. Your order is saved below — press <strong>Pay now</strong> whenever you're ready.
        </p>
      )}
      {q.isPending && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
      {q.isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            Could not load your connections.
            <Button size="sm" variant="outline" onClick={() => q.refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}
      {!q.isPending && !q.isError && list.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Tv className="h-7 w-7" /></div>
          <h3 className="mt-4 font-display text-lg font-bold">No Zylo TV connection yet</h3>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">Order a set-top box and your first channel pack to get started.</p>
          <Button asChild className="mt-5"><Link to="/tv">Browse Zylo TV</Link></Button>
        </div>
      )}
      <div className="grid gap-5">{list.map((c) => <ConnectionCard key={c.id} c={c} />)}</div>
    </div>
  );
}

export default MyTv;
