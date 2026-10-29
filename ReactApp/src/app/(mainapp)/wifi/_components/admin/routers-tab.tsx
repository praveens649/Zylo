import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Router, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { wifiAdminApi, type DeviceInput, type WifiDevice, type WifiBand } from "@/api/wifi.api";
import { formatINR } from "@/lib/format";
import { useWifiAction, errorMessage } from "../../_hooks/use-wifi";
import { BandBadge, ConfirmDialog, FormField, fieldCls } from "../wifi-ui";

const EMPTY: DeviceInput = {
  name: "",
  sku: "",
  description: "",
  band: "DUAL_BAND",
  wifiStandard: "Wi-Fi 6",
  maxDevices: 32,
  ethernetPorts: 4,
  isMesh: false,
  purchasePrice: 0,
  rentalPerMonth: null,
  securityDeposit: null,
  isActive: true,
  isFeatured: false,
};

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

function DeviceForm({
  initial,
  title,
  onSubmit,
  busy,
}: {
  initial: DeviceInput;
  title: string;
  onSubmit: (d: DeviceInput) => void;
  busy: boolean;
}) {
  const [d, setD] = useState<DeviceInput>(initial);
  const set = <K extends keyof DeviceInput>(k: K, v: DeviceInput[K]) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Name">
          <Input value={d.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField label="SKU">
          <Input value={d.sku} onChange={(e) => set("sku", e.target.value)} />
        </FormField>
        <FormField label="Band">
          <select className={fieldCls} value={d.band} onChange={(e) => set("band", e.target.value as WifiBand)}>
            <option value="SINGLE_BAND">Single-band (2.4 GHz)</option>
            <option value="DUAL_BAND">Dual-band</option>
            <option value="TRI_BAND">Tri-band</option>
          </select>
        </FormField>
        <FormField label="Wi-Fi standard">
          <select className={fieldCls} value={d.wifiStandard ?? "Wi-Fi 6"} onChange={(e) => set("wifiStandard", e.target.value)}>
            {["Wi-Fi 4", "Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Max devices">
          <Input type="number" value={d.maxDevices ?? 32} onChange={(e) => set("maxDevices", Number(e.target.value))} />
        </FormField>
        <FormField label="Ethernet ports">
          <Input type="number" value={d.ethernetPorts ?? 4} onChange={(e) => set("ethernetPorts", Number(e.target.value))} />
        </FormField>
        <FormField label="Purchase price ₹ (blank = not sold)">
          <Input type="number" value={d.purchasePrice ?? ""} onChange={(e) => set("purchasePrice", numOrNull(e.target.value))} />
        </FormField>
        <FormField label="Rental ₹/month (blank = not rentable)">
          <Input type="number" value={d.rentalPerMonth ?? ""} onChange={(e) => set("rentalPerMonth", numOrNull(e.target.value))} />
        </FormField>
        <FormField label="Security deposit ₹">
          <Input type="number" value={d.securityDeposit ?? ""} onChange={(e) => set("securityDeposit", numOrNull(e.target.value))} />
        </FormField>
        <FormField label="Mesh capable">
          <select className={fieldCls} value={d.isMesh ? "yes" : "no"} onChange={(e) => set("isMesh", e.target.value === "yes")}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </FormField>
      </div>
      <FormField label="Description">
        <textarea className={`${fieldCls} min-h-16`} value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </FormField>
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!d.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!d.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Featured
        </label>
      </div>
      <Button className="w-full" disabled={busy || !d.name.trim() || !d.sku.trim()} onClick={() => onSubmit(d)}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save router model
      </Button>
    </div>
  );
}

export function RoutersTab() {
  const devices = useQuery({ queryKey: ["wifi", "admin", "devices"], queryFn: wifiAdminApi.devices });
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState<WifiDevice | null>(null);
  const [deleteFor, setDeleteFor] = useState<WifiDevice | null>(null);

  const create = useWifiAction((d: DeviceInput) => wifiAdminApi.createDevice(d), "Router model created", () => setCreateOpen(false));
  const update = useWifiAction(({ id, ...d }: DeviceInput & { id: string }) => wifiAdminApi.updateDevice(id, d), "Router model updated", () => setEditFor(null));
  const del = useMutation({
    mutationFn: (id: string) => wifiAdminApi.deleteDevice(id),
    onSuccess: (r) => {
      toast({ title: r.deleted ? "Router model deleted" : "Router model has history — deactivated instead" });
      devices.refetch();
      setDeleteFor(null);
    },
    onError: (e) => toast({ title: errorMessage(e), variant: "destructive" }),
  });

  const rows = useMemo(() => devices.data ?? [], [devices.data]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Router models</CardTitle>
          <CardDescription>Hardware sold or rented with Zylo WiFi connections.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add model
        </Button>
      </CardHeader>
      <CardContent>
        {devices.isLoading ? (
          <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No router models yet — run the WiFi seed or add one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Model</th>
                  <th className="py-2 pr-3">Band</th>
                  <th className="py-2 pr-3">Buy</th>
                  <th className="py-2 pr-3">Rent</th>
                  <th className="py-2 pr-3">Units</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Router className="h-3.5 w-3.5 text-primary" /> {d.name}
                        {d.isFeatured && <Badge className="text-[10px]">Featured</Badge>}
                      </span>
                      <span className="text-xs text-muted-foreground">{d.sku} · {d.wifiStandard}</span>
                    </td>
                    <td className="py-2.5 pr-3"><BandBadge band={d.band} /></td>
                    <td className="py-2.5 pr-3">{d.purchasePrice ? formatINR(d.purchasePrice) : "—"}</td>
                    <td className="py-2.5 pr-3">{d.rentalPerMonth ? `${formatINR(d.rentalPerMonth)}/mo` : "—"}</td>
                    <td className="py-2.5 pr-3">{d._count?.units ?? 0}</td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={d.isActive ? "success" : "outline"}>{d.isActive ? "Active" : "Disabled"}</Badge>
                    </td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditFor(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteFor(d)}>
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

      <AppDialog open={createOpen} onOpenChange={setCreateOpen} size="lg" title="New router model" icon={<Router className="h-5 w-5 text-primary" />}>
        <DeviceForm initial={EMPTY} title="Model details" busy={create.isPending} onSubmit={(d) => create.mutate(d)} />
      </AppDialog>

      <AppDialog open={!!editFor} onOpenChange={(o) => !o && setEditFor(null)} size="lg" title={`Edit ${editFor?.name ?? ""}`} icon={<Pencil className="h-5 w-5 text-primary" />}>
        {editFor && (
          <DeviceForm
            key={editFor.id}
            initial={{
              name: editFor.name,
              sku: editFor.sku,
              description: editFor.description ?? "",
              band: editFor.band,
              wifiStandard: editFor.wifiStandard,
              maxDevices: editFor.maxDevices,
              ethernetPorts: editFor.ethernetPorts,
              isMesh: editFor.isMesh,
              purchasePrice: editFor.purchasePrice == null ? null : Number(editFor.purchasePrice),
              rentalPerMonth: editFor.rentalPerMonth == null ? null : Number(editFor.rentalPerMonth),
              securityDeposit: editFor.securityDeposit == null ? null : Number(editFor.securityDeposit),
              isActive: editFor.isActive,
              isFeatured: editFor.isFeatured,
            }}
            title="Model details"
            busy={update.isPending}
            onSubmit={(d) => update.mutate({ ...d, id: editFor.id })}
          />
        )}
      </AppDialog>

      <ConfirmDialog
        open={!!deleteFor}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        pending={del.isPending}
        title={`Delete ${deleteFor?.name}?`}
        description="Models that have units or orders cannot be deleted — they will be deactivated instead."
        confirmLabel="Delete"
        onConfirm={() => deleteFor && del.mutate(deleteFor.id)}
      />
    </Card>
  );
}
