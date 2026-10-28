import { CheckCircle2, Clock, Hash, PhoneForwarded } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface InventoryStatsCardsProps {
  stats: {
    AVAILABLE: number;
    RESERVED: number;
    ASSIGNED: number;
  };
}

export function InventoryStatsCards({ stats }: InventoryStatsCardsProps) {
  const total = stats.AVAILABLE + stats.RESERVED + stats.ASSIGNED;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Numbers in Engine */}
      <Card className="border-border bg-card shadow-sm hover:border-primary/40 transition-all">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Generated
            </span>
            <div className="text-2xl font-bold font-display text-foreground mt-1">
              {total.toLocaleString()}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              In database pool
            </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Hash className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Available for Customer Onboarding */}
      <Card className="border-border bg-card shadow-sm hover:border-emerald-500/40 transition-all">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Available For Onboarding
            </span>
            <div className="text-2xl font-bold font-display text-emerald-600 mt-1">
              {stats.AVAILABLE.toLocaleString()}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Ready for users to select
            </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Reserved during Checkout Hold */}
      <Card className="border-border bg-card shadow-sm hover:border-amber-500/40 transition-all">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Reserved in Checkout
            </span>
            <div className="text-2xl font-bold font-display text-amber-600 mt-1">
              {stats.RESERVED.toLocaleString()}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              15-minute temporary holds
            </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Assigned / Active Lines */}
      <Card className="border-border bg-card shadow-sm hover:border-violet-500/40 transition-all">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">
              Assigned / Live SIMs
            </span>
            <div className="text-2xl font-bold font-display text-violet-600 mt-1">
              {stats.ASSIGNED.toLocaleString()}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Active customer connections
            </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
            <PhoneForwarded className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
