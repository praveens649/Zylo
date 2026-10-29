import { Coins, Calendar, ShieldCheck, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuestsMetricsCardsProps {
  wallet: {
    spendablePackXp: number;
    packTotalEarned: number;
    packTargetXp: number;
  };
  planInfo: {
    isPlanActive: boolean;
    planName: string;
    validityDays: number;
    totalWeeks: number;
    currentWeek: number;
    daysRemaining: number;
  };
  profile: {
    level: number;
    unlockedBadges: string[];
  };
}

export function QuestsMetricsCards({
  wallet,
  planInfo,
  profile,
}: QuestsMetricsCardsProps) {
  const targetXp = wallet.packTargetXp || 1000;
  const progressPercent = Math.min(100, Math.round((wallet.packTotalEarned / targetXp) * 100));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Card 1: Spendable Pack XP (Currency) */}
      <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-card to-amber-500/5 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Spendable Pack XP (Currency)
          </CardTitle>
          <div className="rounded-full bg-amber-500/10 p-2 text-amber-500">
            <Coins className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {wallet.spendablePackXp.toLocaleString()}
            </span>
            <span className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">
              XP Available
            </span>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Earned this plan: {wallet.packTotalEarned} XP</span>
              <span>Target: {targetXp} XP</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            ⚡ Spendable currency resets to 0 when your {planInfo.validityDays}-day plan expires.
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Plan Validity & Current Week */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Plan Duration
          </CardTitle>
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Calendar className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Week {planInfo.currentWeek} of {planInfo.totalWeeks}
            </span>
            <Badge variant="outline" className="text-xs">
              {planInfo.validityDays} Days Plan
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {planInfo.planName}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
            <span className="text-muted-foreground">Cycle Status:</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active ({planInfo.daysRemaining} days remaining)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Permanent Level & Profile Badges */}
      <Card className="border-border/70 shadow-sm sm:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Permanent Profile Badges
          </CardTitle>
          <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600 text-white font-bold hover:bg-indigo-700">
              Level {profile.level}
            </Badge>
            <span className="text-sm font-medium">Permanent Account Status</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.unlockedBadges.map((badgeCode) => (
              <Badge
                key={badgeCode}
                variant="secondary"
                className="gap-1 bg-secondary/80 text-[11px] font-medium"
              >
                <Trophy className="h-3 w-3 text-amber-500" />
                {badgeCode.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            🛡️ Badges and levels NEVER reset — they remain in your profile across all recharges.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
