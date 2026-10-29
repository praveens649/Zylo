import { useState } from "react";
import {
  CheckCircle2,
  Hash,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Timer,
} from "lucide-react";
import type { AdminEsimNumber } from "@/api/travel-esim.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { countryFlag, countryName, COUNTRIES } from "../../esim/_lib/countries";
import {
  useAdminEsimNumbers,
  useGenerateEsimNumbers,
} from "../_hooks/use-esim-plans";

interface EsimNumbersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function statusLabel(n: AdminEsimNumber) {
  if (n.status === "ASSIGNED") return { text: "Used", cls: "bg-slate-500/10 text-slate-400 border-slate-500/30" };
  if (n.status === "RESERVED") return { text: "Held", cls: "bg-amber-500/10 text-amber-500 border-amber-500/30" };
  return { text: "In stock", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" };
}

export function EsimNumbersDialog({
  open,
  onOpenChange,
}: EsimNumbersDialogProps) {
  const { toast } = useToast();
  const [country, setCountry] = useState<string>("SG");
  const { data, isPending, refetch } = useAdminEsimNumbers(country);

  const generate = useGenerateEsimNumbers(() => {
    toast({
      title: "Numbers generated",
      description: `10 new ${countryName(country)} numbers added to stock.`,
    });
  });

  const numbers = data?.numbers ?? [];
  const summary = data?.summary?.[country] ?? {
    total: 0,
    inStock: 0,
    held: 0,
    used: 0,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Hash className="h-4 w-4 text-sky-500" />
            eSIM Number Inventory
          </DialogTitle>
          <DialogDescription>
            Per-country numbers customers pick during eSIM purchase — held
            for 15 minutes on click, then returned to stock.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-9 w-56 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(COUNTRIES).map((c) => (
                <SelectItem key={c} value={c}>
                  {countryFlag(c)} {countryName(c)} ({c})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-semibold"
              disabled={generate.isPending}
              onClick={() => generate.mutate({ country, count: 10 })}
            >
              {generate.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              Generate 10
            </Button>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="border-border/60">
            Total: <b className="ml-1">{summary.total}</b>
          </Badge>
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            In stock: {summary.inStock}
          </Badge>
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">
            <Timer className="h-3 w-3 mr-1" />
            Held: {summary.held}
          </Badge>
          <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/30">
            <Lock className="h-3 w-3 mr-1" />
            Used: {summary.used}
          </Badge>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/60">
          {isPending ? (
            <div className="flex items-center justify-center gap-2 py-14 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading numbers…
            </div>
          ) : numbers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <p className="text-sm font-semibold text-foreground">
                No numbers for {countryName(country)}
              </p>
              <p className="text-xs text-muted-foreground">
                Click "Generate 10" to create demo stock.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/70 backdrop-blur">
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Number</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Hold expiry</th>
                </tr>
              </thead>
              <tbody>
                {numbers.map((n) => {
                  const s = statusLabel(n);
                  return (
                    <tr key={n.id} className="border-t border-border/40">
                      <td className="px-3 py-2 font-mono">{n.number}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {n.type === "PREMIUM" ? "Premium" : "Standard"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${s.cls}`}
                        >
                          {n.status === "AVAILABLE" && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {n.status === "RESERVED" && (
                            <Timer className="h-3 w-3 mr-1" />
                          )}
                          {n.status === "ASSIGNED" && (
                            <Lock className="h-3 w-3 mr-1" />
                          )}
                          {s.text}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">
                        {n.status === "RESERVED" && n.reservedUntil
                          ? new Date(n.reservedUntil).toLocaleTimeString(
                              "en-IN",
                              { hour: "2-digit", minute: "2-digit" }
                            )
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
