import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus, Repeat, Trash2, Upload } from "lucide-react";
import { tvAdminApi, TV_KEYS } from "@/api/tv.api";
import type { AdminUnit, UnitStatus } from "@/api/tv.api";
import { AppDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GenericTable from "@/components/ui/generic-table";
import { formatDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { useTvAction } from "../../_hooks/use-tv";
import { FormField, UnitStatusBadge, fieldCls } from "../tv-ui";

const STATUSES: UnitStatus[] = ["IN_STOCK", "RESERVED", "ASSIGNED", "INSTALLED", "FAULTY", "RETURNED", "RETIRED"];

function useModels() {
  return useQuery({ queryKey: [...TV_KEYS.admin, "models"], queryFn: tvAdminApi.models });
}

function AddUnitDialog({ onClose }: { onClose: () => void }) {
  const models = useModels();
  const [modelId, setModelId] = useState("");
  const [serialNumber, setSerial] = useState("");
  const [macAddress, setMac] = useState("");
  const [smartCardNumber, setCard] = useState("");
  const save = useTvAction(() => tvAdminApi.createUnit({ modelId: modelId || models.data![0].id, serialNumber, macAddress, smartCardNumber }), "Unit added", onClose);
  return (
    <AppDialog open onOpenChange={(o) => !o && onClose()} title="Add a unit">
      <div className="space-y-4">
        <FormField label="Box model">
          <select className={`${fieldCls} h-9`} value={modelId || models.data?.[0]?.id || ""} onChange={(e) => setModelId(e.target.value)}>
            {(models.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </FormField>
        <FormField label="Serial number"><Input value={serialNumber} onChange={(e) => setSerial(e.target.value)} /></FormField>
        <FormField label="MAC address"><Input value={macAddress} onChange={(e) => setMac(e.target.value)} placeholder="02:5A:01:00:00:0A" /></FormField>
        <FormField label="Smart card number"><Input value={smartCardNumber} onChange={(e) => setCard(e.target.value)} /></FormField>
        <div className="flex justify-end">
          <Button disabled={save.isPending || !models.data?.length || serialNumber.length < 3 || macAddress.length < 8 || smartCardNumber.length < 6} onClick={() => save.mutate(undefined)}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add unit
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const models = useModels();
  const [modelId, setModelId] = useState("");
  const [csv, setCsv] = useState("serialNumber,macAddress,smartCardNumber\n");
  const [report, setReport] = useState<string | null>(null);
  const run = useTvAction(
    () => tvAdminApi.importUnits(modelId || models.data![0].id, csv),
    (r) => `Imported ${r.importedCount} unit(s)${r.errorCount ? `, ${r.errorCount} skipped` : ""}`,
    (r) => (r.errorCount ? setReport(r.errors.map((e) => `Row ${e.row} ${e.serialNumber ?? ""}: ${e.error}`).join("\n")) : onClose())
  );
  return (
    <AppDialog open onOpenChange={(o) => !o && onClose()} size="lg" title="Bulk import units (CSV)" description="Header: serialNumber,macAddress,smartCardNumber[,warrantyEndsAt,notes]">
      <div className="space-y-4">
        <FormField label="Box model">
          <select className={`${fieldCls} h-9`} value={modelId || models.data?.[0]?.id || ""} onChange={(e) => setModelId(e.target.value)}>
            {(models.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </FormField>
        <div className="flex items-center gap-2">
          <input type="file" accept=".csv,text/csv" className="text-xs" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} />
        </div>
        <textarea className={`${fieldCls} min-h-[160px] font-mono text-xs`} value={csv} onChange={(e) => setCsv(e.target.value)} />
        {report && <pre className="max-h-32 overflow-auto rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs">{report}</pre>}
        <div className="flex justify-end">
          <Button disabled={run.isPending || !models.data?.length} onClick={() => run.mutate(undefined)}>
            {run.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}

export function UnitsTab() {
  const models = useModels();
  const [status, setStatus] = useState("");
  const [modelId, setModelId] = useState("");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"add" | "import" | null>(null);

  const q = useQuery({
    queryKey: [...TV_KEYS.admin, "units", status, modelId, search],
    queryFn: () => tvAdminApi.units({ status: status || undefined, modelId: modelId || undefined, search: search || undefined }),
  });
  const faulty = useTvAction(tvAdminApi.markFaulty, "Unit marked faulty");
  const replace = useTvAction(tvAdminApi.replaceUnit, "Replacement unit assigned");
  const del = useTvAction(tvAdminApi.deleteUnit, "Unit deleted");

  const columns = useMemo<ColumnDef<AdminUnit, unknown>[]>(
    () => [
      { accessorKey: "serialNumber", header: "Serial", cell: ({ row }) => (<div><p className="text-sm font-semibold">{row.original.serialNumber}</p><p className="text-xs text-muted-foreground">{row.original.macAddress}</p></div>) },
      { id: "model", header: "Model", cell: ({ row }) => row.original.model.name },
      { id: "card", header: "Smart card", cell: ({ row }) => row.original.smartCardMasked },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <UnitStatusBadge status={row.original.status} /> },
      { id: "conn", header: "Connection", cell: ({ row }) => (row.original.connection ? `${row.original.connection.connectionNumber} · ${row.original.connection.user.name}` : "—") },
      { id: "warranty", header: "Warranty", cell: ({ row }) => formatDate(row.original.warrantyEndsAt) },
      {
        id: "actions", header: () => <span className="sr-only">Actions</span>, enableSorting: false,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex justify-end gap-1">
              {["ASSIGNED", "INSTALLED"].includes(u.status) && (
                <Button size="sm" variant="ghost" onClick={() => confirm(`Mark ${u.serialNumber} as faulty?`) && faulty.mutate(u.id)}><AlertTriangle className="mr-1 h-3.5 w-3.5" />Faulty</Button>
              )}
              {u.status === "FAULTY" && u.connection && (
                <Button size="sm" variant="outline" onClick={() => replace.mutate(u.id)}><Repeat className="mr-1 h-3.5 w-3.5" />Replace</Button>
              )}
              {!u.connection && ["IN_STOCK", "RETIRED", "RETURNED", "FAULTY"].includes(u.status) && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Delete ${u.serialNumber}?`) && del.mutate(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              )}
            </div>
          );
        },
      },
    ],
    [faulty, replace, del]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Input className="h-9 w-56" placeholder="Search serial / MAC / card" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${fieldCls} h-9 w-40`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <select className={`${fieldCls} h-9 w-44`} value={modelId} onChange={(e) => setModelId(e.target.value)}>
            <option value="">All models</option>
            {(models.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialog("import")}><Upload className="mr-2 h-4 w-4" />Import CSV</Button>
          <Button onClick={() => setDialog("add")}><Plus className="mr-2 h-4 w-4" />Add unit</Button>
        </div>
      </div>
      {q.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
        <>
          <GenericTable columns={columns} data={q.data?.data ?? []} sort pagination />
          {q.data && q.data.meta && q.data.meta.total > q.data.data.length && (
            <p className="text-xs text-muted-foreground" onClick={() => toast({ title: "Narrow the filters to see the rest" })}>Showing the first {q.data.data.length} of {q.data.meta.total} units — use search or filters.</p>
          )}
        </>
      )}
      {dialog === "add" && <AddUnitDialog onClose={() => setDialog(null)} />}
      {dialog === "import" && <ImportDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
