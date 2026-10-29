import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Gauge, Loader2, Pencil, Plus, Trash2, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { wifiAdminApi, type PlanInput, type WifiPlan, type WifiPlanType } from "@/api/wifi.api";
import { formatINR } from "@/lib/format";
import { useWifiAction, errorMessage } from "../../_hooks/use-wifi";
import { ConfirmDialog, FormField, fieldCls } from "../wifi-ui";

const EMPTY: PlanInput = {
  name: "",
  description: "",
  type: "BASE",
  price: 0,
  validityDays: 30,
  speedMbps: 100,
  dataLimitGb: null,
  postFupSpeedMbps: null,
  requiresTriBand: false,
  features: [],
  isActive: true,
  isFeatured: false,
};

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

function PlanForm({
  initial,
  onSubmit,
  busy,
}: {
  initial: PlanInput;
  onSubmit: (p: PlanInput) => void;
  busy: boolean;
}) {
  const [p, setP] = useState<PlanInput>(initial);
  const set = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => setP((x) => ({ ...x, [k]: v }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Name">
          <Input value={p.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField label="Type">
          <select className={fieldCls} value={p.type} onChange={(e) => set("type", e.target.value as WifiPlanType)}>
            <option value="BASE">Base plan</option>
            <option value="ADD_ON">Add-on / booster</option>
          </select>
        </FormField>
        <FormField label="Price ₹">
          <Input type="number" value={p.price} onChange={(e) => set("price", Number(e.target.value))} />
        </FormField>
        <FormField label="Validity (days)">
          <Input type="number" value={p.validityDays} onChange={(e) => set("validityDays", Number(e.target.value))} />
        </FormField>
        <FormField label="Speed (Mbps)">
          <Input type="number" value={p.speedMbps} onChange={(e) => set("speedMbps", Number(e.target.value))} />
        </FormField>
        <FormField label="Data cap GB (blank = unlimited)">
          <Input type="number" value={p.dataLimitGb ?? ""} onChange={(e) => set("dataLimitGb", numOrNull(e.target.value))} />
        </FormField>
        <FormField label="Post-FUP speed Mbps (blank = none)">
          <Input type="number" value={p.postFupSpeedMbps ?? ""} onChange={(e) => set("postFupSpeedMbps", numOrNull(e.target.value))} />
        </FormField>
        <FormField label="Tri-band router required">
          <select className={fieldCls} value={p.requiresTriBand ? "yes" : "no"} onChange={(e) => set("requiresTriBand", e.target.value === "yes")}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </FormField>
      </div>
      <FormField label="Description">
        <textarea className={`${fieldCls} min-h-16`} value={p.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </FormField>
      <FormField label="Features (comma separated)">
        <Input
          value={p.features.join(", ")}
          onChange={(e) => set("features", e.target.value.split(",").map((f) => f.trim()).filter(Boolean))}
          placeholder="100 Mbps, Truly unlimited, OTT included"
        />
      </FormField>
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!p.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!p.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Featured
        </label>
      </div>
      <Button className="w-full" disabled={busy || !p.name.trim() || p.price <= 0 || p.speedMbps <= 0} onClick={() => onSubmit(p)}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save plan
      </Button>
    </div>
  );
}

export function PlansTab() {
  const plans = useQuery({ queryKey: ["wifi", "admin", "plans"], queryFn: wifiAdminApi.plans });
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState<WifiPlan | null>(null);
  const [deleteFor, setDeleteFor] = useState<WifiPlan | null>(null);

  const create = useWifiAction((p: PlanInput) => wifiAdminApi.createPlan(p), "Plan created", () => setCreateOpen(false));
  const update = useWifiAction(({ id, ...p }: PlanInput & { id: string }) => wifiAdminApi.updatePlan(id, p), "Plan updated", () => setEditFor(null));
  const del = useMutation({
    mutationFn: (id: string) => wifiAdminApi.deletePlan(id),
    onSuccess: (r) => {
      toast({ title: r.deleted ? "Plan deleted" : "Plan has subscriptions — deactivated instead" });
      plans.refetch();
      setDeleteFor(null);
    },
    onError: (e) => toast({ title: errorMessage(e), variant: "destructive" }),
  });

  const rows = plans.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Broadband plans</CardTitle>
          <CardDescription>Base plans renew every validity cycle; add-ons attach to an active base plan.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add plan
        </Button>
      </CardHeader>
      <CardContent>
        {plans.isLoading ? (
          <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No plans yet — run the WiFi seed or add one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Speed</th>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Validity</th>
                  <th className="py-2 pr-3">Subscriptions</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Wifi className="h-3.5 w-3.5 text-primary" /> {p.name}
                        {p.isFeatured && <Badge className="text-[10px]">Featured</Badge>}
                        {p.type === "ADD_ON" && <Badge variant="secondary" className="text-[10px]">Add-on</Badge>}
                        {p.requiresTriBand && <Badge variant="outline" className="text-[10px]">Tri-band</Badge>}
                      </span>
                      {p.description && <span className="text-xs text-muted-foreground">{p.description}</span>}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3.5 w-3.5 text-primary" /> {p.speedMbps} Mbps
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      {p.dataLimitGb ? `${p.dataLimitGb} GB` : "Unlimited"}
                      {p.postFupSpeedMbps ? <span className="block text-xs text-muted-foreground">then {p.postFupSpeedMbps} Mbps</span> : null}
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{formatINR(p.price)}</td>
                    <td className="py-2.5 pr-3">{p.validityDays}d</td>
                    <td className="py-2.5 pr-3">{p._count?.subscriptions ?? 0}</td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={p.isActive ? "success" : "outline"}>{p.isActive ? "Active" : "Disabled"}</Badge>
                    </td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditFor(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteFor(p)}>
                          <Trash2 className="h-4 w-4" />
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

      <AppDialog open={createOpen} onOpenChange={setCreateOpen} size="lg" title="New broadband plan" icon={<Wifi className="h-5 w-5 text-primary" />}>
        <PlanForm initial={EMPTY} busy={create.isPending} onSubmit={(p) => create.mutate(p)} />
      </AppDialog>

      <AppDialog open={!!editFor} onOpenChange={(o) => !o && setEditFor(null)} size="lg" title={`Edit ${editFor?.name ?? ""}`} icon={<Pencil className="h-5 w-5 text-primary" />}>
        {editFor && (
          <PlanForm
            key={editFor.id}
            initial={{
              name: editFor.name,
              description: editFor.description ?? "",
              type: editFor.type,
              price: Number(editFor.price),
              validityDays: editFor.validityDays,
              speedMbps: editFor.speedMbps,
              dataLimitGb: editFor.dataLimitGb,
              postFupSpeedMbps: editFor.postFupSpeedMbps,
              requiresTriBand: editFor.requiresTriBand,
              features: editFor.features,
              isActive: editFor.isActive,
              isFeatured: editFor.isFeatured,
            }}
            busy={update.isPending}
            onSubmit={(p) => update.mutate({ ...p, id: editFor.id })}
          />
        )}
      </AppDialog>

      <ConfirmDialog
        open={!!deleteFor}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        pending={del.isPending}
        title={`Delete ${deleteFor?.name}?`}
        description="Plans that have subscriptions or orders cannot be deleted — they will be deactivated instead."
        confirmLabel="Delete"
        onConfirm={() => deleteFor && del.mutate(deleteFor.id)}
      />
    </Card>
  );
}
