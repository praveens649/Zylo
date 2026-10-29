import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileUp, Loader2, Plus, RefreshCcw, Router, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { wifiAdminApi, type AdminUnit } from "@/api/wifi.api";
import { formatDate } from "@/lib/format";
import { useWifiAction } from "../../_hooks/use-wifi";
import { ConfirmDialog, FormField, UnitStatusBadge, fieldCls } from "../wifi-ui";

export function UnitsTab() {
  const [deviceId, setDeviceId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const devices = useQuery({ queryKey: ["wifi", "admin", "devices"], queryFn: wifiAdminApi.devices });
  const units = useQuery({
    queryKey: ["wifi", "admin", "units", deviceId, status, search],
    queryFn: () => wifiAdminApi.units({ deviceId: deviceId || undefined, status: status || undefined, search: search || undefined }),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteFor, setDeleteFor] = useState<AdminUnit | null>(null);
  const [faultyFor, setFaultyFor] = useState<AdminUnit | null>(null);
  const [replaceFor, setReplaceFor] = useState<AdminUnit | null>(null);

  const [nu, setNu] = useState({ deviceId: "", serialNumber: "", macAddress: "" });
  const add = useWifiAction(
    () => wifiAdminApi.createUnit(nu),
    "Unit added",
    () => {
      setAddOpen(false);
      setNu({ deviceId: "", serialNumber: "", macAddress: "" });
    }
  );

  const [csv, setCsv] = useState("");
  const doImport = useWifiAction(
    () => wifiAdminApi.importUnits(nu.deviceId || deviceId, csv),
    (r) => `Imported ${r.importedCount} unit(s), ${r.errorCount} error(s)`,
    () => {
      setImportOpen(false);
      setCsv("");
    }
  );

  const del = useWifiAction((id: string) => wifiAdminApi.deleteUnit(id), "Unit deleted", () => setDeleteFor(null));
  const faulty = useWifiAction((id: string) => wifiAdminApi.markFaulty(id), "Unit marked faulty", () => setFaultyFor(null));
  const replace = useWifiAction((id: string) => wifiAdminApi.replaceUnit(id), "Replacement unit assigned", () => setReplaceFor(null));

  const rows = useMemo(() => units.data?.data ?? [], [units.data]);
  const deviceName = (id: string) => devices.data?.find((d) => d.id === id)?.name ?? id;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Router inventory</CardTitle>
          <CardDescription>Physical units identified by serial number and MAC address (masked).</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <FileUp className="mr-1.5 h-4 w-4" /> Import CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add unit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input className="w-48" placeholder="Search serial / MAC" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${fieldCls} w-44`} value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">All models</option>
            {(devices.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select className={`${fieldCls} w-40`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["IN_STOCK", "RESERVED", "ASSIGNED", "INSTALLED", "FAULTY", "RETURNED", "RETIRED"].map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>

        {units.isLoading ? (
          <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No units match the filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Serial</th>
                  <th className="py-2 pr-3">MAC</th>
                  <th className="py-2 pr-3">Model</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Warranty</th>
                  <th className="py-2 pr-3">Connection</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs">{u.serialNumber}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{u.macMasked ?? "—"}</td>
                    <td className="py-2.5 pr-3">{u.device.name}</td>
                    <td className="py-2.5 pr-3"><UnitStatusBadge status={u.status} /></td>
                    <td className="py-2.5 pr-3 text-xs">{formatDate(u.warrantyEndsAt)}</td>
                    <td className="py-2.5 pr-3 text-xs">
                      {u.connection ? `${u.connection.connectionNumber} · ${u.connection.user.name}` : "—"}
                    </td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1">
                        {u.status !== "FAULTY" && u.status !== "RETIRED" && (
                          <Button variant="ghost" size="icon" title="Mark faulty" onClick={() => setFaultyFor(u)}>
                            <Wrench className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        {u.status === "FAULTY" && u.connection && (
                          <Button variant="ghost" size="icon" title="Assign replacement" onClick={() => setReplaceFor(u)}>
                            <RefreshCcw className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {["IN_STOCK", "RETURNED", "RETIRED", "FAULTY"].includes(u.status) && !u.connection && (
                          <Button variant="ghost" size="icon" title="Delete" className="text-destructive" onClick={() => setDeleteFor(u)}>
                            <Trash2 className="h-4 w-4" />
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

      <AppDialog open={addOpen} onOpenChange={setAddOpen} size="default" title="Add router unit" icon={<Router className="h-5 w-5 text-primary" />}>
        <div className="space-y-3">
          <FormField label="Router model">
            <select className={fieldCls} value={nu.deviceId} onChange={(e) => setNu((x) => ({ ...x, deviceId: e.target.value }))}>
              <option value="">Choose a model</option>
              {(devices.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Serial number">
            <Input value={nu.serialNumber} onChange={(e) => setNu((x) => ({ ...x, serialNumber: e.target.value }))} placeholder="ZWF-AX-011" />
          </FormField>
          <FormField label="MAC address">
            <Input value={nu.macAddress} onChange={(e) => setNu((x) => ({ ...x, macAddress: e.target.value }))} placeholder="02:5B:02:00:00:0B" />
          </FormField>
          <Button className="w-full" disabled={add.isPending || !nu.deviceId || nu.serialNumber.trim().length < 3 || nu.macAddress.trim().length < 8} onClick={() => add.mutate(undefined)}>
            {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add unit
          </Button>
        </div>
      </AppDialog>

      <AppDialog open={importOpen} onOpenChange={setImportOpen} size="lg" title="Import units (CSV)" icon={<FileUp className="h-5 w-5 text-primary" />} description="Header row required: serialNumber,macAddress[,warrantyEndsAt,notes]">
        <div className="space-y-3">
          <FormField label="Router model">
            <select className={fieldCls} value={nu.deviceId || deviceId} onChange={(e) => setNu((x) => ({ ...x, deviceId: e.target.value }))}>
              <option value="">Choose a model</option>
              {(devices.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </FormField>
          <textarea className={`${fieldCls} min-h-40 font-mono text-xs`} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"serialNumber,macAddress,warrantyEndsAt\nZWF-AX-011,02:5B:02:00:00:0B,2027-10-29"} />
          <Button className="w-full" disabled={doImport.isPending || !(nu.deviceId || deviceId) || !csv.trim()} onClick={() => doImport.mutate(undefined)}>
            {doImport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Import into {deviceName(nu.deviceId || deviceId) || "model"}
          </Button>
        </div>
      </AppDialog>

      <ConfirmDialog open={!!deleteFor} onOpenChange={(o) => !o && setDeleteFor(null)} pending={del.isPending} title={`Delete unit ${deleteFor?.serialNumber}?`} description="Only unassigned units can be deleted." confirmLabel="Delete" onConfirm={() => deleteFor && del.mutate(deleteFor.id)} />
      <ConfirmDialog open={!!faultyFor} onOpenChange={(o) => !o && setFaultyFor(null)} pending={faulty.isPending} title={`Mark ${faultyFor?.serialNumber} as faulty?`} description="Faulty units are taken out of the assignable pool." confirmLabel="Mark faulty" onConfirm={() => faultyFor && faulty.mutate(faultyFor.id)} />
      <ConfirmDialog open={!!replaceFor} onOpenChange={(o) => !o && setReplaceFor(null)} pending={replace.isPending} title={`Replace ${replaceFor?.serialNumber}?`} description="The oldest in-stock unit of the same model is swapped onto the connection." confirmLabel="Replace" onConfirm={() => replaceFor && replace.mutate(replaceFor.id)} />
    </Card>
  );
}
