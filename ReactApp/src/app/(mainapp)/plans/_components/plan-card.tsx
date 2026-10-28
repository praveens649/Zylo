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
  MoreVertical,
  Edit3,
  Copy,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Plan } from "@/api/plans.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlanCardProps {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onView: (plan: Plan) => void;
  onDuplicate: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onToggleStatus: (plan: Plan) => void;
  isToggling?: boolean;
}

export function PlanCard({
  plan,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  onToggleStatus,
  isToggling = false,
}: PlanCardProps) {
  const isBusiness = plan.type === "BUSINESS" || plan.businessOnly;
  const isPostpaid = plan.type === "POSTPAID";
  const isValidity = plan.type === "VALIDITY_ONLY" || plan.isValidityOnly;

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl ${
        plan.isActive
          ? "border-border/60 bg-gradient-to-b from-card to-card/60 shadow-sm hover:border-primary/50"
          : "border-border/40 bg-muted/20 opacity-80"
      }`}
    >
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
        {/* Top Badges & Options */}
        <div className="flex items-start justify-between gap-2">
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

          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleStatus(plan)}
              disabled={isToggling}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all border ${
                plan.isActive
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }`}
              title="Click to toggle active state"
            >
              {plan.isActive ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Inactive
                </span>
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onView(plan)}>
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(plan)}>
                  <Edit3 className="h-3.5 w-3.5 mr-2" />
                  Edit plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(plan)}>
                  <Copy className="h-3.5 w-3.5 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(plan)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Plan Title & Price Header */}
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
              ₹{Number(plan.price).toLocaleString("en-IN")}
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
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Data</p>
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
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Voice</p>
              <p className="truncate text-xs font-semibold text-foreground">
                {plan.callingBenefit || "Unlimited"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <Calendar className="h-4 w-4 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Validity</p>
              <p className="truncate text-xs font-semibold text-foreground">
                {plan.validityDays} Days
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <MessageSquare className="h-4 w-4 shrink-0 text-cyan-500" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">SMS</p>
              <p className="truncate text-xs font-semibold text-foreground">
                {plan.smsCount ? `${plan.smsCount} / day` : "Standard SMS"}
              </p>
            </div>
          </div>
        </div>

        {/* Zylo Innovations Badges */}
        <div className="mt-3.5 flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
          {plan.dataBankEnabled && (
            <Badge
              variant="outline"
              className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-[11px] py-0.5"
            >
              <Database className="h-3 w-3 mr-1" />
              Data Bank {plan.rolloverLimitMb ? `${Math.round(plan.rolloverLimitMb / 1024)}GB` : ""}
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
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-5 py-3">
        <span className="text-[11px] text-muted-foreground">
          {plan._count?.orders ?? 0} Orders • {plan._count?.planSubscriptions ?? 0} Subs
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 hover:bg-background"
            onClick={() => onEdit(plan)}
          >
            <Edit3 className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2.5 font-medium border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => onView(plan)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Inspect
          </Button>
        </div>
      </div>
    </div>
  );
}
