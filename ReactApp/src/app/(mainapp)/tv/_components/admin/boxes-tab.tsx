import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit3, Loader2, Plus, Trash2 } from "lucide-react";
import { tvAdminApi, TV_KEYS } from "@/api/tv.api";
import type { BoxResolution, TvBox } from "@/api/tv.api";
import { AppDialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GenericTable from "@/components/ui/generic-table";
import { useQuery } from "@tanstack/react-query";
import { formatINR } from "@/lib/format";
import { useTvAction } from "../../_hooks/use-tv";
import { FormField, ResolutionBadge, fieldCls } from "../tv-ui";

const num = (v: string) => (v.trim() === "" ? null : Number(v));

function BoxDialog({ box, onClose }: { box: TvBox | null; onClose: () => void }) {
  const [name, setName] = useState(box?.name ?? "");
  const [sku, setSku] = useState(box?.sku ?? "");
  const [description, setDescription] = useState(box?.description ?? "");
  const [resolution, setResolution] = useState<BoxResolution>(box?.resolution ?? "HD");
  const [isSmart, setIsSmart] = useState(box?.isSmart ?? false);
  const [hasRecording, setHasRecording] = useState(box?.hasRecording ?? false);
  const [storageGb, setStorageGb] = useState(box?.storageGb?.toString() ?? "");
  const [purchase, setPurchase] = useState(box?.purchasePrice?.toString() ?? "");
  const [rental, setRental] = useState(box?.rentalPerMonth?.toString() ?? "");
  const [deposit, setDeposit] = useState(box?.securityDeposit?.toString() ?? "");
  const [isActive, setIsActive] = useState(box?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(box?.isFeatured ?? false);

  const save = useTvAction(
    () => {
      const body = {
        name: name.trim(), sku: sku.trim(), description: description.trim() || undefined, resolution, isSmart, hasRecording,
        storageGb: num(storageGb), purchasePrice: num(purchase), rentalPerMonth: num(rental), securityDeposit: num(deposit),
        isActive, isFeatured,
      };
      return box ? tvAdminApi.updateModel(box.id, body) : tvAdminApi.createModel(body);
    },
    box ? "Box updated" : "Box created",
    onClose
  );

  return (
    <AppDialog open onOpenChange={(o) => !o && onClose()} size="lg" title={box ? "Edit box model" : "New box model"} description="Leave a price empty to hide that option (buy or rent).">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></FormField>
        <FormField label="SKU"><Input value={sku} onChange={(e) => setSku(e.target.value)} /></FormField>
        <div className="md:col-span-2"><FormField label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></FormField></div>
        <FormField label="Resolution">
          <select className={`${fieldCls} h-9`} value={resolution} onChange={(e) => setResolution(e.target.value as BoxResolution)}>
            <option value="HD">HD</option><option value="UHD_4K">4K UHD</option>
          </select>
        </FormField>
        <FormField label="Storage (GB)"><Input type="number" min={0} value={storageGb} onChange={(e) => setStorageGb(e.target.value)} /></FormField>
        <FormField label="Purchase price (₹)"><Input type="number" min={0} value={purchase} onChange={(e) => setPurchase(e.target.value)} /></FormField>
        <FormField label="Rental / month (₹)"><Input type="number" min={0} value={rental} onChange={(e) => setRental(e.target.value)} /></FormField>
        <FormField label="Security deposit (₹)"><Input type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} /></FormField>
        <div className="flex flex-wrap items-center gap-4 pt-5 text-sm">
          {([["Smart", isSmart, setIsSmart], ["Recording", hasRecording, setHasRecording], ["Active", isActive, setIsActive], ["Featured", isFeatured, setIsFeatured]] as const).map(([l, v, set]) => (
            <label key={l} className="flex items-center gap-1.5"><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="accent-[hsl(var(--primary))]" />{l}</label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={save.isPending || name.trim().length < 2 || sku.trim().length < 2} onClick={() => save.mutate(undefined)}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
        </Button>
      </div>
    </AppDialog>
  );
}

export function BoxesTab() {
  const q = useQuery({ queryKey: [...TV_KEYS.admin, "models"], queryFn: tvAdminApi.models });
  const [editing, setEditing] = useState<TvBox | null | undefined>(undefined);
  const del = useTvAction(tvAdminApi.deleteModel, (r) => (r.deleted ? "Box deleted" : "Box has history — disabled instead"));

  const columns = useMemo<ColumnDef<TvBox, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Box", cell: ({ row }) => (<div><p className="text-sm font-semibold">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.sku}</p></div>) },
      { accessorKey: "resolution", header: "Type", cell: ({ row }) => (<div className="flex gap-1"><ResolutionBadge resolution={row.original.resolution} />{row.original.isSmart && <Badge variant="tertiary">Smart</Badge>}</div>) },
      { id: "buy", header: "Buy", cell: ({ row }) => (row.original.purchasePrice !== null ? formatINR(row.original.purchasePrice) : "—") },
      { id: "rent", header: "Rent / deposit", cell: ({ row }) => (row.original.rentalPerMonth !== null ? `${formatINR(row.original.rentalPerMonth)} / ${formatINR(row.original.securityDeposit)}` : "—") },
      { id: "units", header: "Units / connections", cell: ({ row }) => `${row.original._count?.units ?? 0} / ${row.original._count?.connections ?? 0}` },
      { accessorKey: "isActive", header: "Status", cell: ({ row }) => <Badge variant={row.original.isActive ? "success" : "outline"}>{row.original.isActive ? "Active" : "Disabled"}</Badge> },
      {
        id: "actions", header: () => <span className="sr-only">Actions</span>, enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(row.original)}><Edit3 className="mr-1 h-3.5 w-3.5" />Edit</Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Delete ${row.original.name}?`) && del.mutate(row.original.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ),
      },
    ],
    [del]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setEditing(null)}><Plus className="mr-2 h-4 w-4" />New box model</Button></div>
      {q.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : <GenericTable columns={columns} data={q.data ?? []} sort pagination />}
      {editing !== undefined && <BoxDialog box={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
