import {
  CalendarDays,
  CheckCircle2,
  MessageSquare,
  Phone,
  Wifi,
  XCircle,
} from "lucide-react";
import type { InternationalPlan } from "@/api/travel-esim.api";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR } from "@/lib/format";
import { countryFlag, countryName } from "../../esim/_lib/countries";

interface EsimPlanDetailsDialogProps {
  plan: InternationalPlan | null;
  onOpenChange: (open: boolean) => void;
}

export function EsimPlanDetailsDialog({
  plan,
  onOpenChange,
}: EsimPlanDetailsDialogProps) {
  if (!plan) return null;

  const rows = [
    {
      icon: Wifi,
      label: "Data",
      value:
        plan.dataAllowanceMb >= 1024
          ? `${plan.dataAllowanceMb / 1024} GB`
          : `${plan.dataAllowanceMb} MB`,
    },
    {
      icon: CalendarDays,
      label: "Validity",
      value: `${plan.validityDays} days`,
    },
    {
      icon: Phone,
      label: "Calls",
      value: plan.callMinutes != null ? `${plan.callMinutes} mins` : "Data-only",
    },
    {
      icon: MessageSquare,
      label: "SMS",
      value: plan.smsCount != null ? `${plan.smsCount}` : "—",
    },
  ];

  return (
    <Dialog open={!!plan} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            {countryFlag(plan.destinationCountry)} {plan.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="border-sky-500/30 bg-sky-500/10 text-sky-500 text-xs"
          >
            {countryName(plan.destinationCountry)} ({plan.destinationCountry})
          </Badge>
          <Badge
            className={
              plan.isActive
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs"
                : "bg-muted text-muted-foreground border-border text-xs"
            }
          >
            {plan.isActive ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            {plan.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}

        <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="flex items-baseline justify-between border-b border-border/40 pb-3">
            <span className="text-xs font-semibold text-muted-foreground">
              Price
            </span>
            <span className="font-display text-2xl font-black text-foreground">
              {formatINR(plan.pricePaise / 100)}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5"
              >
                <r.icon className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    {r.label}
                  </p>
                  <p className="truncate text-xs font-semibold text-foreground">
                    {r.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>
            Purchases:{" "}
            <b className="text-foreground">{plan._count?.orders ?? 0}</b>
          </span>
          {plan.providerName && (
            <span>
              Provider: <b className="text-foreground">{plan.providerName}</b>
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
