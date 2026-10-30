"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Headphones, Loader2, Music2, Pencil, Plus, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ApiRequestError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { ConfirmDialog, FormField, fieldCls } from "../../wifi/_components/wifi-ui";
import {
  musicAdminApi,
  MUSIC_ADMIN_PLANS_KEY,
  MUSIC_ADMIN_SUBS_KEY,
  type AdminMusicPlan,
  type MusicPlanInput,
} from "@/api/music.api";

const errorMessage = (err: unknown, fallback = "Something went wrong") =>
  err instanceof ApiRequestError ? err.message : fallback;

const TABS = [
  { id: "plans", label: "Plans" },
  { id: "subscriptions", label: "Subscriptions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ------------------------------------------------------------ plans tab

const EMPTY: MusicPlanInput = {
  name: "",
  description: "",
  price: 0,
  currency: "inr",
  validityDays: 30,
  audioQuality: "standard",
  maxDevices: 1,
  isActive: true,
  sortOrder: 0,
};

function PlanForm({
  initial,
  busy,
  onSubmit,
}: {
  initial: MusicPlanInput;
  busy: boolean;
  onSubmit: (p: MusicPlanInput) => void;
}) {
  const [p, setP] = useState<MusicPlanInput>(initial);
  const set = <K extends keyof MusicPlanInput>(k: K, v: MusicPlanInput[K]) =>
    setP((x) => ({ ...x, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Name">
          <Input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Music Premium" />
        </FormField>
        <FormField label="Audio tier">
          <select
            className={fieldCls}
            value={p.audioQuality}
            onChange={(e) => set("audioQuality", e.target.value)}
          >
            <option value="standard">Standard</option>
            <option value="hd">HD</option>
            <option value="lossless">Lossless</option>
          </select>
        </FormField>
        <FormField label="Price ₹">
          <Input type="number" value={p.price} onChange={(e) => set("price", Number(e.target.value))} />
        </FormField>
        <FormField label="Validity (days)">
          <Input type="number" value={p.validityDays} onChange={(e) => set("validityDays", Number(e.target.value))} />
        </FormField>
        <FormField label="Max devices">
          <Input type="number" value={p.maxDevices} onChange={(e) => set("maxDevices", Number(e.target.value))} />
        </FormField>
        <FormField label="Sort order">
          <Input type="number" value={p.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
        </FormField>
      </div>
      <FormField label="Description">
        <textarea
          className={`${fieldCls} min-h-16`}
          value={p.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Ad-free listening on 3 devices"
        />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!p.isActive} onChange={(e) => set("isActive", e.target.checked)} />
        Active (purchasable by customers)
      </label>
      <Button
        className="w-full"
        disabled={busy || !p.name.trim() || (p.price ?? 0) < 0 || (p.validityDays ?? 0) < 1}
        onClick={() => onSubmit(p)}
      >
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save plan
      </Button>
    </div>
  );
}

function PlansTab() {
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: MUSIC_ADMIN_PLANS_KEY, queryFn: musicAdminApi.plans });
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState<AdminMusicPlan | null>(null);
  const [deleteFor, setDeleteFor] = useState<AdminMusicPlan | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: MUSIC_ADMIN_PLANS_KEY });
  const onErr = (e: unknown) => toast({ title: errorMessage(e), variant: "destructive" });

  const create = useMutation({
    mutationFn: (p: MusicPlanInput) => musicAdminApi.createPlan(p),
    onSuccess: () => {
      toast({ title: "Plan created" });
      refresh();
      setCreateOpen(false);
    },
    onError: onErr,
  });
  const update = useMutation({
    mutationFn: ({ id, ...p }: MusicPlanInput & { id: string }) => musicAdminApi.updatePlan(id, p),
    onSuccess: () => {
      toast({ title: "Plan updated" });
      refresh();
      setEditFor(null);
    },
    onError: onErr,
  });
  const del = useMutation({
    mutationFn: (id: string) => musicAdminApi.deletePlan(id),
    onSuccess: (r) => {
      toast({ title: r.deleted ? "Plan deleted" : "Plan has subscribers — deactivated instead" });
      refresh();
      setDeleteFor(null);
    },
    onError: onErr,
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      musicAdminApi.updatePlan(id, { isActive }),
    onSuccess: refresh,
    onError: onErr,
  });

  const rows = plans.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Music plans</CardTitle>
          <CardDescription>Catalog customers see on the /music page.</CardDescription>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New plan
        </Button>
      </CardHeader>
      <CardContent>
        {plans.isLoading ? (
          <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No plans yet — run <code>pnpm seed:music</code> or create one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Validity</th>
                  <th className="py-2 pr-3">Tier</th>
                  <th className="py-2 pr-3">Devices</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{p.name}</span>
                      <span className="block max-w-64 truncate text-xs text-muted-foreground">
                        {p.description}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">₹{Number(p.price).toLocaleString("en-IN")}</td>
                    <td className="py-2.5 pr-3">{p.validityDays}d</td>
                    <td className="py-2.5 pr-3">
                      <Badge variant="secondary">{p.audioQuality.toUpperCase()}</Badge>
                    </td>
                    <td className="py-2.5 pr-3">{p.maxDevices}</td>
                    <td className="py-2.5 pr-3">
                      <button
                        onClick={() => toggle.mutate({ id: p.id, isActive: !p.isActive })}
                        title="Click to toggle"
                      >
                        <Badge variant={p.isActive ? "success" : "secondary"}>
                          {p.isActive ? "ACTIVE" : "DISABLED"}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditFor(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteFor(p)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <AppDialog open={createOpen} onOpenChange={setCreateOpen} title="New music plan" size="sm">
        <PlanForm initial={EMPTY} busy={create.isPending} onSubmit={(p) => create.mutate(p)} />
      </AppDialog>

      <AppDialog open={!!editFor} onOpenChange={() => setEditFor(null)} title={`Edit — ${editFor?.name ?? ""}`} size="sm">
        {editFor && (
          <PlanForm
            initial={{
              name: editFor.name,
              description: editFor.description,
              price: Number(editFor.price),
              currency: editFor.currency,
              validityDays: editFor.validityDays,
              audioQuality: editFor.audioQuality,
              maxDevices: editFor.maxDevices,
              isActive: editFor.isActive,
              sortOrder: editFor.sortOrder,
            }}
            busy={update.isPending}
            onSubmit={(p) => update.mutate({ ...p, id: editFor.id })}
          />
        )}
      </AppDialog>

      <ConfirmDialog
        open={!!deleteFor}
        onOpenChange={() => setDeleteFor(null)}
        title={`Delete "${deleteFor?.name}"?`}
        description="Plans with subscribers are deactivated instead of deleted."
        confirmLabel="Delete"
        pending={del.isPending}
        onConfirm={() => deleteFor && del.mutate(deleteFor.id)}
      />
    </Card>
  );
}

// ------------------------------------------------------------ subscriptions tab

function SubscriptionsTab() {
  const subs = useQuery({ queryKey: MUSIC_ADMIN_SUBS_KEY, queryFn: musicAdminApi.subscriptions });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
        <CardDescription>Latest 200 music subscriptions across all customers.</CardDescription>
      </CardHeader>
      <CardContent>
        {subs.isLoading ? (
          <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />
        ) : (subs.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Start</th>
                  <th className="py-2">End</th>
                </tr>
              </thead>
              <tbody>
                {(subs.data ?? []).map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{s.user.name}</span>
                      <span className="block text-xs text-muted-foreground">{s.user.email}</span>
                    </td>
                    <td className="py-2.5 pr-3">{s.plan.name}</td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={s.status === "ACTIVE" ? "success" : "secondary"}>{s.status}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{formatDateTime(s.startDate)}</td>
                    <td className="py-2.5 text-xs">{formatDateTime(s.endDate)}</td>
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

// ------------------------------------------------------------ view

export function MusicAdminView() {
  const [tab, setTab] = useState<TabId>("plans");

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-violet-500/15 via-primary/10 to-pink-500/10 p-6 shadow-sm md:p-8">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Headphones className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Music Console
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage Zylo Music plans and see who&apos;s subscribed.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto rounded-xl border bg-muted/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.id === "plans" ? <Music2 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plans" && <PlansTab />}
      {tab === "subscriptions" && <SubscriptionsTab />}
    </div>
  );
}

export default MusicAdminView;
