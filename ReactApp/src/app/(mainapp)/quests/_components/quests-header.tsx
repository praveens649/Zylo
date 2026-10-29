import { Sparkles, Clock, Flame, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuestsHeaderProps {
  daysRemaining: number;
  streakDays: number;
  checkedInToday?: boolean;
}

export function QuestsHeader({
  daysRemaining,
  streakDays,
  checkedInToday = true,
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

        {/* Automatic Daily Check-in & Streak Status Card */}
        <div className="flex flex-col gap-2.5 sm:items-end">
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm backdrop-blur-sm">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span>
              {checkedInToday
                ? "Daily Check-in Active (+25 XP earned today)"
                : "Active Today"}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs text-orange-700 dark:text-orange-400 border border-orange-500/20">
            <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
            <span>
              Active Streak:{" "}
              <strong className="text-foreground font-bold">
                {streakDays} {streakDays === 1 ? "Day" : "Days"}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
