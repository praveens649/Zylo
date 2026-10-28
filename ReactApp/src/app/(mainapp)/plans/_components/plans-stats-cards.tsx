import {
  Layers,
  Sparkles,
  Database,
  ArrowRightLeft,
  Smartphone,
  Building2,
  CheckCircle2,
} from "lucide-react";
import type { PlanStats } from "@/api/plans.api";
import { Card, CardContent } from "@/components/ui/card";

interface PlansStatsCardsProps {
  stats?: PlanStats;
  isLoading?: boolean;
}

export function PlansStatsCards({ stats, isLoading }: PlansStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Plans */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-primary/10 blur-2xl" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Catalog Plans
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold tracking-tight text-foreground">
              {isLoading ? "—" : stats?.total ?? 0}
            </span>
            <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {stats?.active ?? 0} Active
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{stats?.inactive ?? 0} Inactive / Draft</span>
            <span>•</span>
            <span className="text-amber-500 font-medium">{stats?.featured ?? 0} Featured</span>
          </div>
        </CardContent>
      </Card>

      {/* Prepaid & Postpaid breakdown */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-purple-500/10 blur-2xl" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Consumer vs Business
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <Smartphone className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div>
              <span className="font-display text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? "—" : stats?.prepaid ?? 0}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">Prepaid</span>
            </div>
            <span className="text-muted-foreground/40 font-light">|</span>
            <div>
              <span className="font-display text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? "—" : stats?.postpaid ?? 0}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">Postpaid</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 text-blue-500" />
            <span>{stats?.business ?? 0} Dedicated Business Packs</span>
          </div>
        </CardContent>
      </Card>

      {/* Zylo Innovation Features */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10 blur-2xl" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Zylo Data Bank Packs
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold tracking-tight text-indigo-500">
              {isLoading ? "—" : stats?.dataBank ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">with Auto Rollover</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowRightLeft className="h-3 w-3 text-teal-500" />
            <span>{stats?.dataTransfer ?? 0} Peer Data Transfer Enabled</span>
          </div>
        </CardContent>
      </Card>

      {/* Validity & Special Packs */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-emerald-500/10 blur-2xl" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Validity & Special
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold tracking-tight text-emerald-500">
              {isLoading ? "—" : stats?.validityOnly ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">Validity Boosters</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <span>Designed for low-cost SIM preservation</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
