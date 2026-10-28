import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Edit3, Loader2, Plus, Trash2 } from "lucide-react";
import { tvAdminApi, TV_KEYS } from "@/api/tv.api";
import type { TvPack, TvPlanType } from "@/api/tv.api";
import { AppDialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GenericTable from "@/components/ui/generic-table";
import { formatINR } from "@/lib/format";
import { useTvAction } from "../../_hooks/use-tv";
import { FormField, fieldCls } from "../tv-ui";

function PackDialog({ pack, onClose }: { pack: TvPack | null; onClose: () => void }) {
  const [name, setName] = useState(pack?.name ?? "");
  const [description, setDescription] = useState(pack?.description ?? "");
  const [type, setType] = useState<TvPlanType>(pack?.type ?? "BASE");
  const [price, setPrice] = useState(pack?.price?.toString() ?? "");
  const [validityDays, setValidityDays] = useState(pack?.validityDays?.toString() ?? "30");
  const [channels, setChannels] = useState(pack?.channelCount?.toString() ?? "");
  const [hd, setHd] = useState(pack?.hdChannelCount?.toString() ?? "0");
  const [languages, setLanguages] = useState(pack?.languages.join(", ") ?? "English");
  const [requires4k, setRequires4k] = useState(pack?.requires4kBox ?? false);
  const [isActive, setIsActive] = useState(pack?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(pack?.isFeatured ?? false);

  const save = useTvAction(
    () => {
      const body = {
        name: name.trim(), description: description.trim() || undefined, type, price: Number(price), validityDays: Number(validityDays),
        channelCount: Number(channels), hdChannelCount: Number(hd) || 0,
        languages: languages.split(",").map((l) => l.trim()).filter(Boolean),
        requires4kBox: requires4k, isActive, isFeatured,
      };
      return pack ? tvAdminApi.updatePlan(pack.id, body) : tvAdminApi.createPlan(body);
    },
    pack ? "Pack updated" : "Pack created",
    onClose
  );

  return (
    <AppDialog open onOpenChange={(o) => !o && onClose()} size="lg" title={pack ? "Edit TV pack" : "New TV pack"}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></FormField>
        <FormField label="Type">
          <select className={`${fieldCls} h-9`} value={type} onChange={(e) => setType(e.target.value as TvPlanType)}>
            <option value="BASE">Base pack</option><option value="ADD_ON">Add-on</option>
          </select>
        </FormField>
        <div className="md:col-span-2"><FormField label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></FormField></div>
        <FormField label="Price (₹)"><Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} /></FormField>
        <FormField label="Validity (days)"><Input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(e.target.value)} /></FormField>
        <FormField label="Channels"><Input type="number" min={0} value={channels} onChange={(e) => setChannels(e.target.value)} /></FormField>
        <FormField label="HD channels"><Input type="number" min={0} value={hd} onChange={(e) => setHd(e.target.value)} /></FormField>
        <div className="md:col-span-2"><FormField label="Languages" hint="Comma separated"><Input value={languages} onChange={(e) => setLanguages(e.target.value)} /></FormField></div>
        <div className="flex flex-wrap items-center gap-4 text-sm md:col-span-2">
          {([["Requires 4K box", requires4k, setRequires4k], ["Active", isActive, setIsActive], ["Featured", isFeatured, setIsFeatured]] as const).map(([l, v, set]) => (
            <label key={l} className="flex items-center gap-1.5"><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="accent-[hsl(var(--primary))]" />{l}</label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={save.isPending || name.trim().length < 2 || !price || !channels} onClick={() => save.mutate(undefined)}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
        </Button>
      </div>
    </AppDialog>
  );
}

export function PacksTab() {
  const q = useQuery({ queryKey: [...TV_KEYS.admin, "plans"], queryFn: tvAdminApi.plans });
  const [editing, setEditing] = useState<TvPack | null | undefined>(undefined);
  const del = useTvAction(tvAdminApi.deletePlan, (r) => (r.deleted ? "Pack deleted" : "Pack has history — disabled instead"));

  const columns = useMemo<ColumnDef<TvPack, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Pack", cell: ({ row }) => (<div><p className="text-sm font-semibold">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.languages.join(", ")}</p></div>) },
      { accessorKey: "type", header: "Type", cell: ({ row }) => <Badge variant={row.original.type === "BASE" ? "default" : "tertiary"}>{row.original.type === "BASE" ? "Base" : "Add-on"}</Badge> },
      { accessorKey: "price", header: "Price", cell: ({ row }) => `${formatINR(row.original.price)} / ${row.original.validityDays}d` },
      { id: "channels", header: "Channels", cell: ({ row }) => `${row.original.channelCount} (${row.original.hdChannelCount} HD)` },
      { id: "4k", header: "4K box", cell: ({ row }) => (row.original.requires4kBox ? <Badge variant="default">Required</Badge> : "—") },
      { id: "subs", header: "Subscribers", cell: ({ row }) => row.original._count?.subscriptions ?? 0 },
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
      <div className="flex justify-end"><Button onClick={() => setEditing(null)}><Plus className="mr-2 h-4 w-4" />New TV pack</Button></div>
      {q.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : <GenericTable columns={columns} data={q.data ?? []} sort pagination />}
      {editing !== undefined && <PackDialog pack={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
