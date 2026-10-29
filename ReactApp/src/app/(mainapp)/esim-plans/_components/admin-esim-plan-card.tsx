import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  Eye,
  MessageSquare,
  MoreVertical,
  Phone,
  Power,
  Trash2,
  Wifi,
  XCircle,
} from "lucide-react";
import type { InternationalPlan } from "@/api/travel-esim.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatINR } from "@/lib/format";
import { countryFlag, countryName } from "../../esim/_lib/countries";

interface AdminEsimPlanCardProps {
  plan: InternationalPlan;
  onEdit: (plan: InternationalPlan) => void;
  onView: (plan: InternationalPlan) => void;
  onToggle: (plan: InternationalPlan) => void;
  onDelete: (plan: InternationalPlan) => void;
  isToggling?: boolean;
}

function formatData(mb: number) {
  return mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`;
}

export function AdminEsimPlanCard({
  plan,
  onEdit,
  onView,
  onToggle,
  onDelete,
  isToggling = false,
}: AdminEsimPlanCardProps) {
  const hasVoice = plan.callMinutes != null || plan.smsCount != null;

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl ${
        plan.isActive
          ? "border-border/60 bg-gradient-to-b from-card to-card/60 shadow-sm hover:border-primary/50"
          : "border-border/40 bg-muted/20 opacity-80"
      }`}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />

      <div className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="border-sky-500/30 bg-sky-500/10 text-sky-500 font-medium text-xs"
            >
              {countryFlag(plan.destinationCountry)}{" "}
              {countryName(plan.destinationCountry)}
            </Badge>
            {!hasVoice && (
              <Badge
                variant="outline"
                className="border-slate-500/30 bg-slate-500/10 text-slate-400 text-xs"
              >
                Data-only
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggle(plan)}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onView(plan)}>
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(plan)}>
                  <Edit3 className="h-3.5 w-3.5 mr-2" />
                  Edit plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggle(plan)}>
                  <Power className="h-3.5 w-3.5 mr-2" />
                  {plan.isActive ? "Deactivate" : "Activate"}
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
              {formatINR(plan.pricePaise / 100)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {plan.validityDays} Days Validity
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
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                Calls
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                {plan.callMinutes != null
                  ? `${plan.callMinutes} mins`
                  : "—"}
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
                {plan.smsCount != null ? `${plan.smsCount}` : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center border-t border-border/50 bg-muted/30 px-5 py-3">
        <span className="text-[11px] text-muted-foreground">
          {plan._count?.orders ?? 0} purchases
        </span>
      </div>
    </div>
  );
}
