import { Sparkles, Clock, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface QuestsHeaderProps {
  daysRemaining: number;
  streakDays: number;
  isCheckInPending: boolean;
  onCheckIn: () => void;
}

export function QuestsHeader({
  daysRemaining,
  streakDays,
  isCheckInPending,
  onCheckIn,
}: QuestsHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card/90 to-primary/5 p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="h-3 w-3" /> Pack-Bound Gamification
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" /> {daysRemaining} Days Left in Plan
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Data Quests & Voucher Marketplace
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Complete weekly tasks to accumulate spendable XP currency. Use your XP to unlock bonus data,
            recharge discount coupons, and permanent profile badges before your plan cycle resets!
          </p>
        </div>

        {/* Daily Check-In Action Button */}
        <div className="flex flex-col gap-2 sm:items-end">
          <Button
            size="lg"
            onClick={onCheckIn}
            disabled={isCheckInPending}
            className="group relative gap-2 bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white shadow-md hover:from-amber-600 hover:to-orange-600"
          >
            <Flame className="h-5 w-5 animate-pulse text-yellow-200" />
            <span>{isCheckInPending ? "Checking in..." : "Daily Check-in (+25 XP)"}</span>
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span>
              Active Streak: <strong className="text-foreground">{streakDays} Days</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
