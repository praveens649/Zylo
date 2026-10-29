import {
  CalendarDays,
  MessageSquare,
  Phone,
  Signal,
  Sparkles,
  Wifi,
} from "lucide-react";
import type { InternationalPlan } from "@/api/travel-esim.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { countryFlag } from "../_lib/countries";

interface EsimPlanCardProps {
  plan: InternationalPlan;
  isPopular?: boolean;
  isSelected?: boolean;
  /** Trip length in days — shows a coverage hint when provided. */
  tripDays?: number | null;
  onSelect: (plan: InternationalPlan) => void;
}

function formatData(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${mb} MB`;
}

export function EsimPlanCard({
  plan,
  isPopular = false,
  isSelected = false,
  tripDays,
  onSelect,
}: EsimPlanCardProps) {
  const coversTrip =
    tripDays != null && tripDays > 0 && plan.validityDays >= tripDays;
  const partialCover =
    tripDays != null && tripDays > 0 && plan.validityDays < tripDays;
  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl ${
        isSelected
          ? "border-primary/70 bg-gradient-to-b from-primary/5 to-card shadow-md"
          : "border-border/60 bg-gradient-to-b from-card to-card/60 shadow-sm hover:border-primary/50"
      }`}
    >
      <div
        className={`h-1.5 w-full ${
          isPopular
            ? "bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500"
            : "bg-gradient-to-r from-primary to-primary/60"
        }`}
      />

      <div className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {isPopular && (
              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs font-semibold px-2 py-0.5">
                <Sparkles className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            )}
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary font-medium text-xs"
            >
              {countryFlag(plan.destinationCountry)}{" "}
              {plan.destinationCountry}
            </Badge>
            {coversTrip && (
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs font-semibold px-2 py-0.5">
                Covers your trip
              </Badge>
            )}
            {partialCover && (
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-amber-500 font-medium text-xs"
              >
                Covers {plan.validityDays} of {tripDays} days
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-2 border-b border-border/40 pb-4">
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
              {formatData(plan.dataAllowanceMb)}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {plan.name}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-2xl font-black tracking-tight text-foreground">
              {formatINR(plan.pricePaise / 100)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {plan.validityDays} days
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <Wifi className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                Data
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                {formatData(plan.dataAllowanceMb)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                Validity
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                {plan.validityDays} days
              </p>
            </div>
          </div>
          {plan.callMinutes != null && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
              <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Calls
                </p>
                <p className="truncate text-xs font-semibold text-foreground">
                  {plan.callMinutes} mins
                </p>
              </div>
            </div>
          )}
          {plan.smsCount != null && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
              <MessageSquare className="h-4 w-4 shrink-0 text-cyan-500" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                  SMS
                </p>
                <p className="truncate text-xs font-semibold text-foreground">
                  {plan.smsCount} SMS
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3.5 flex items-center gap-1.5 border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground">
          <Signal className="h-3 w-3 shrink-0" />
          {plan.callMinutes != null || plan.smsCount != null
            ? "Install before you travel — activates at your destination."
            : "Data-only eSIM — no calls or SMS. Install before you travel."}
        </p>
      </div>

      <div className="flex items-center justify-end border-t border-border/50 bg-muted/30 px-5 py-3">
        <Button
          size="sm"
          variant={isSelected ? "default" : "outline"}
          className={
            isSelected
              ? "h-8 px-4 text-xs font-bold"
              : "h-8 px-4 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10"
          }
          onClick={() => onSelect(plan)}
        >
          {isSelected ? "Selected" : "Select"}
        </Button>
      </div>
    </div>
  );
}
