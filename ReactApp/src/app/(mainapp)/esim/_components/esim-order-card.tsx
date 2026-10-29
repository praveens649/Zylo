import { CalendarDays, Eye, Phone, Plane, Wifi } from "lucide-react";
import type { TravelEsimOrder, TravelEsimStatus } from "@/api/travel-esim.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR } from "@/lib/format";
import { countryFlag, countryName } from "../_lib/countries";

const STATUS_STYLE: Record<TravelEsimStatus, string> = {
  READY_TO_ACTIVATE: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
  ACTIVATED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  COMPLETED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  PAID: "border-teal-500/30 bg-teal-500/10 text-teal-400",
  PROCESSING: "border-teal-500/30 bg-teal-500/10 text-teal-400",
  PENDING_PAYMENT: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  CANCELLED: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  FAILED: "border-destructive/30 bg-destructive/10 text-destructive",
  REFUNDED: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

const STATUS_LABEL: Record<TravelEsimStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  READY_TO_ACTIVATE: "Ready to install",
  ACTIVATED: "Activated",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

interface EsimOrderCardProps {
  order: TravelEsimOrder;
  onView: (order: TravelEsimOrder) => void;
}

export function EsimOrderCard({ order, onView }: EsimOrderCardProps) {
  const dataLabel =
    order.plan.dataAllowanceMb >= 1024
      ? `${order.plan.dataAllowanceMb / 1024} GB`
      : `${order.plan.dataAllowanceMb} MB`;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/60 p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
          {countryFlag(order.destinationCountry)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-foreground">
              {countryName(order.destinationCountry)} — {order.plan.name}
            </p>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold px-1.5 py-0 ${STATUS_STYLE[order.status]}`}
            >
              {STATUS_LABEL[order.status]}
            </Badge>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Wifi className="h-3 w-3" /> {dataLabel} •{" "}
              {order.plan.validityDays} days
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(order.departureDate)} →{" "}
              {formatDate(order.returnDate)}
            </span>
            <span className="flex items-center gap-1">
              <Plane className="h-3 w-3" />
              {order.travellerName}
            </span>
            {order.number && (
              <span className="flex items-center gap-1 font-mono">
                <Phone className="h-3 w-3" />
                {order.number}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="font-display text-base font-black text-foreground">
          {formatINR(order.amountPaise / 100)}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => onView(order)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          View eSIM
        </Button>
      </div>
    </div>
  );
}
