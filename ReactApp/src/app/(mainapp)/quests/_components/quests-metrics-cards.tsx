import { Coins, Calendar, ShieldCheck, Trophy, Sparkles, Star, Zap, Clock } from "lucide-react";
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

const BADGE_STYLES: Record<string, { label: string; color: string; border: string }> = {
  LEVEL_1_ROOKIE: {
    label: "Rookie",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    border: "border-amber-500/30",
  },
  LEVEL_2_DATA_EXPLORER: {
    label: "Data Explorer",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    border: "border-blue-500/30",
  },
  LEVEL_3_CYBER_MASTER: {
    label: "Cyber Master",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    border: "border-purple-500/30",
  },
  DIAMOND_VIP_SAVER: {
    label: "Diamond VIP",
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    border: "border-cyan-500/30",
  },
};

export function QuestsMetricsCards({
  wallet,
  planInfo,
  profile,
}: QuestsMetricsCardsProps) {
  const targetXp = wallet.packTargetXp || 1000;
  const progressPercent = Math.min(
    100,
    Math.round((wallet.packTotalEarned / targetXp) * 100)
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Card 1: Spendable Pack XP (Currency Vault) */}
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-amber-500/[0.04] shadow-sm hover:shadow-md transition-all">
        <div className="absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-0.5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Spendable Pack XP
            </CardTitle>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
              Live Wallet Currency
            </span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-500 border border-amber-500/30 shadow-xs">
            <Coins className="h-5 w-5" />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              {wallet.spendablePackXp.toLocaleString()}
            </span>
            <span className="text-xs font-extrabold uppercase text-amber-600 dark:text-amber-400">
              XP Ready
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Earned in plan: <strong className="text-foreground">{wallet.packTotalEarned} XP</strong></span>
              <span>Goal: {targetXp} XP</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/80">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 transition-all duration-700 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" /> Spend before plan resets
            </span>
            <span className="font-semibold text-foreground">{progressPercent}% of pack goal</span>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Plan Validity & Timeline */}
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-sm hover:shadow-md transition-all">
        <div className="absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-0.5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Plan Duration
            </CardTitle>
            <span className="text-[11px] text-primary font-semibold">
              Roadmap Timeline
            </span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <Calendar className="h-5 w-5" />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Week {planInfo.currentWeek}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">
              of {planInfo.totalWeeks} Total Weeks
            </span>
          </div>

          {/* Mini 4-dot week milestone progress */}
          <div className="flex items-center gap-2 pt-1">
            {Array.from({ length: planInfo.totalWeeks }).map((_, i) => {
              const weekNum = i + 1;
              const isPast = weekNum < planInfo.currentWeek;
              const isCurrent = weekNum === planInfo.currentWeek;
              return (
                <div key={weekNum} className="flex-1 space-y-1 text-center">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isPast
                        ? "bg-emerald-500 shadow-xs"
                        : isCurrent
                        ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)] animate-pulse"
                        : "bg-secondary"
                    }`}
                  />
                  <span className="text-[9px] font-bold text-muted-foreground">
                    W{weekNum}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
            <span className="truncate max-w-[150px] text-muted-foreground" title={planInfo.planName}>
              {planInfo.planName}
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {planInfo.daysRemaining} days remaining
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Permanent Level & Profile Badges */}
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-indigo-500/[0.04] shadow-sm hover:shadow-md transition-all sm:col-span-2 lg:col-span-1">
        <div className="absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-0.5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Permanent Prestige
            </CardTitle>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
              Never Resets On Expiry
            </span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 font-black text-white text-xs sm:text-sm shadow-xs">
              <Trophy className="h-3.5 w-3.5 text-amber-300" />
              <span>Level {profile.level}</span>
            </div>
            <span className="text-xs font-semibold text-foreground">
              Account Mastery
            </span>
          </div>

          {/* Badges showcase */}
          <div className="flex flex-wrap gap-1.5 min-h-[38px] pt-1">
            {profile.unlockedBadges.map((badgeCode) => {
              const meta = BADGE_STYLES[badgeCode] || {
                label: badgeCode.replace(/_/g, " "),
                color: "bg-secondary text-foreground border-border/80",
              };
              return (
                <Badge
                  key={badgeCode}
                  variant="outline"
                  className={`gap-1 text-[10px] font-bold py-0.5 px-2 rounded-lg border ${meta.color}`}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {meta.label}
                </Badge>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
            <span>🛡️ Lifetime Achievement</span>
            <span className="font-semibold text-foreground">{profile.unlockedBadges.length} Badges Owned</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
