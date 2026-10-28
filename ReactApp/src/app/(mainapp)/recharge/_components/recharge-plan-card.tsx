import {
  Zap,
  Phone,
  MessageSquare,
  Wifi,
  Sparkles,
  Building2,
  Database,
  ArrowRightLeft,
  Calendar,
  Loader2,
} from "lucide-react";
import type { Plan } from "@/api/plans.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";

interface RechargePlanCardProps {
  plan: Plan;
  onRecharge: (plan: Plan) => void;
  isPending?: boolean;
}

export function RechargePlanCard({
  plan,
  onRecharge,
  isPending = false,
}: RechargePlanCardProps) {
  const isBusiness = plan.type === "BUSINESS" || plan.businessOnly;
  const isPostpaid = plan.type === "POSTPAID";
  const isValidity = plan.type === "VALIDITY_ONLY" || plan.isValidityOnly;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/60 shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-xl">
      {/* Top Highlight bar */}
      <div
        className={`h-1.5 w-full ${
          plan.isFeatured
            ? "bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500"
            : isBusiness
            ? "bg-gradient-to-r from-blue-600 to-cyan-500"
            : isPostpaid
            ? "bg-gradient-to-r from-violet-600 to-purple-400"
            : isValidity
            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
            : "bg-gradient-to-r from-primary to-primary/60"
        }`}
      />

      <div className="flex flex-col p-5">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {plan.isFeatured && (
            <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs font-semibold px-2 py-0.5">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured Deal
            </Badge>
          )}
          <Badge
            variant="outline"
            className={
              isBusiness
                ? "border-blue-500/30 bg-blue-500/10 text-blue-500 font-medium text-xs"
                : isPostpaid
                ? "border-purple-500/30 bg-purple-500/10 text-purple-500 font-medium text-xs"
                : isValidity
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-medium text-xs"
                : "border-primary/30 bg-primary/10 text-primary font-medium text-xs"
            }
          >
            {plan.type}
          </Badge>
          {isBusiness && (
            <Badge
              variant="outline"
              className="border-slate-500/30 bg-slate-500/10 text-slate-400 text-xs"
            >
              <Building2 className="h-3 w-3 mr-1" />
              Biz Only
            </Badge>
          )}
        </div>

        {/* Title & Price */}
        <div className="mt-4 flex items-baseline justify-between gap-2 border-b border-border/40 pb-4">
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
              {plan.name}
            </h3>
            {plan.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {plan.description}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-2xl font-black tracking-tight text-foreground">
              {formatINR(plan.price)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {plan.validityDays} Days Validity
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <Wifi className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                Data
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                {plan.dataAllowanceGb
                  ? `${plan.dataAllowanceGb} GB ${isPostpaid ? "Pool" : "/ day"}`
                  : "No Data"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                Voice
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                {plan.callingBenefit || "Unlimited"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <Calendar className="h-4 w-4 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                Validity
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                {plan.validityDays} Days
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <MessageSquare className="h-4 w-4 shrink-0 text-cyan-500" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                SMS
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                {plan.smsCount ? `${plan.smsCount} / day` : "Standard SMS"}
              </p>
            </div>
          </div>
        </div>

        {/* Zylo Innovations Badges */}
        {(plan.dataBankEnabled ||
          plan.dataTransferEnabled ||
          plan.isValidityOnly) && (
          <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
            {plan.dataBankEnabled && (
              <Badge
                variant="outline"
                className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-[11px] py-0.5"
              >
                <Database className="h-3 w-3 mr-1" />
                Data Bank{" "}
                {plan.rolloverLimitMb
                  ? `${Math.round(plan.rolloverLimitMb / 1024)}GB`
                  : ""}
              </Badge>
            )}
            {plan.dataTransferEnabled && (
              <Badge
                variant="outline"
                className="bg-teal-500/10 text-teal-400 border-teal-500/30 text-[11px] py-0.5"
              >
                <ArrowRightLeft className="h-3 w-3 mr-1" />
                Peer Transfer
              </Badge>
            )}
            {plan.isValidityOnly && (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[11px] py-0.5"
              >
                <Zap className="h-3 w-3 mr-1" />
                Validity Pack
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-5 py-3">
        <span className="text-[11px] text-muted-foreground">
          {formatINR(plan.price)} • {plan.validityDays} days
        </span>
        <Button
          size="sm"
          className="h-8 px-4 text-xs font-bold shadow-sm"
          disabled={isPending}
          onClick={() => onRecharge(plan)}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5 mr-1.5" />
          )}
          Recharge
        </Button>
      </div>
    </div>
  );
}
