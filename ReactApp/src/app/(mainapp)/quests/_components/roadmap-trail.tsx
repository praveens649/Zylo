import {
  CheckCircle2,
  Lock,
  Sparkles,
  Trophy,
  Gift,
  Zap,
  Star,
  Crown,
  ChevronRight,
  Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { QuestWeekGroup } from "@/api/quests.api";

interface RoadmapTrailProps {
  weeks: QuestWeekGroup[];
  displayedWeek: number;
  onSelectWeek: (weekNumber: number) => void;
}

// Lore & Titles for each weekly milestone in Zylo's Pack Adventure
const WEEK_METADATA: Record<
  number,
  { title: string; subtitle: string; icon: typeof Star; color: string; badge: string }
> = {
  1: {
    title: "The Vault Initiate",
    subtitle: "Deposit & Check-in Starter",
    icon: Sparkles,
    color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-500",
    badge: "Initiate Milestone",
  },
  2: {
    title: "Mid-Plan Momentum",
    subtitle: "Data Sharing & Streak Surge",
    icon: Zap,
    color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-500",
    badge: "Momentum Gate",
  },
  3: {
    title: "Consistency Champion",
    subtitle: "Master Saver & Power Sharer",
    icon: Flame,
    color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-500",
    badge: "Elite Trial",
  },
  4: {
    title: "Grand Cycle Legend",
    subtitle: "Final Pack Cleared & Voucher Jackpot",
    icon: Crown,
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-500",
    badge: "Grand Finale",
  },
};

export function RoadmapTrail({
  weeks,
  displayedWeek,
  onSelectWeek,
}: RoadmapTrailProps) {
  const currentWeekObj = weeks.find((w) => w.isCurrent) || weeks[0];
  const currentWeekNumber = currentWeekObj?.weekNumber ?? 1;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card via-card/95 to-primary/[0.03] p-5 shadow-sm sm:p-7">
      {/* Decorative Adventure Trail Background Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-70" />

      {/* Header bar of Roadmap */}
      <div className="relative mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Trophy className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Pack Adventure Roadmap
            </span>
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              Week {currentWeekNumber} Active
            </Badge>
          </div>
          <h3 className="text-lg font-extrabold tracking-tight sm:text-xl">
            4-Week Journey & Milestone Trail
          </h3>
          <p className="text-xs text-muted-foreground">
            Travel through weekly chapters. Complete all quests in each stage to claim XP bounties before cycle renewal.
          </p>
        </div>

        {/* Total Cycle Summary */}
        <div className="flex items-center gap-3 self-start rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2 text-xs sm:self-auto">
          <div className="flex items-center gap-1.5 font-medium">
            <Gift className="h-3.5 w-3.5 text-primary" />
            <span>Weekly Bounties:</span>
          </div>
          <span className="font-bold text-foreground">~250 XP / Week</span>
        </div>
      </div>

      {/* DESKTOP & TABLET HORIZONTAL ROADMAP TRAIL */}
      <div className="relative hidden md:block py-4">
        {/* Connecting Progress Track Line */}
        <div className="absolute top-[52px] left-8 right-8 h-1.5 -translate-y-1/2 rounded-full bg-secondary/80">
          {/* Active Progress Fill */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-amber-500 transition-all duration-700 shadow-[0_0_12px_rgba(var(--primary),0.5)]"
            style={{
              width: `${Math.max(
                0,
                Math.min(
                  100,
                  ((currentWeekNumber - 1) / Math.max(1, weeks.length - 1)) * 100
                )
              )}%`,
            }}
          />
        </div>

        {/* Milestone Nodes */}
        <div className="relative grid grid-cols-4 gap-4">
          {weeks.map((week) => {
            const isSelected = week.weekNumber === displayedWeek;
            const isCurrent = week.isCurrent;
            const isCompleted = week.isCompleted;
            const isLocked = week.isLocked;
            const completedCount = week.quests.filter((q) => q.isCompleted).length;
            const totalQuests = week.quests.length;
            const meta = WEEK_METADATA[week.weekNumber] || {
              title: `Chapter ${week.weekNumber}`,
              subtitle: `Week ${week.weekNumber} Objectives`,
              icon: Star,
              color: "from-primary/20 to-accent/10 border-primary/30 text-primary",
              badge: `Stage ${week.weekNumber}`,
            };
            const Icon = meta.icon;

            return (
              <button
                key={week.weekNumber}
                type="button"
                onClick={() => onSelectWeek(week.weekNumber)}
                className={`group relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all duration-300 focus:outline-none ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/15 ring-2 ring-primary/40 -translate-y-1"
                    : isCurrent
                    ? "border-amber-500/40 bg-card hover:border-amber-500/80 hover:bg-accent/40 shadow-sm"
                    : isCompleted
                    ? "border-emerald-500/40 bg-card hover:border-emerald-500/70 hover:bg-emerald-500/[0.04]"
                    : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100 hover:border-border hover:bg-card"
                }`}
              >
                {/* Node Orb on Track */}
                <div className="relative mb-3 flex h-16 w-16 items-center justify-center">
                  {/* Glowing Pulse Ring for Active Node */}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full bg-amber-500/30 animate-ping opacity-60" />
                  )}

                  {/* Outer Orb Ring */}
                  <div
                    className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all duration-300 ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md scale-105"
                        : isCompleted
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : isCurrent
                        ? "border-amber-500 bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400"
                        : "border-border/80 bg-muted text-muted-foreground/60"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-7 w-7" />
                    ) : isLocked ? (
                      <Lock className="h-6 w-6" />
                    ) : (
                      <Icon className="h-7 w-7 transition-transform group-hover:scale-110" />
                    )}
                  </div>

                  {/* Little Pill on Orb */}
                  <div className="absolute -bottom-1 rounded-full border border-border/80 bg-card px-2 py-0.5 text-[10px] font-bold shadow-sm">
                    {isCompleted ? (
                      <span className="text-emerald-600 dark:text-emerald-400">100%</span>
                    ) : isLocked ? (
                      <span className="text-muted-foreground">Locked</span>
                    ) : (
                      <span className="text-primary font-bold">
                        {completedCount}/{totalQuests}
                      </span>
                    )}
                  </div>
                </div>

                {/* Milestone Texts */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      Week {week.weekNumber}
                    </span>
                    {isCurrent && (
                      <Badge className="h-4 bg-amber-500 text-[9px] font-bold text-white px-1 py-0">
                        NOW
                      </Badge>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-foreground line-clamp-1">
                    {meta.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {meta.subtitle}
                  </p>
                </div>

                {/* Selection Footer Indicator */}
                <div className="mt-3 w-full border-t border-border/40 pt-2 flex items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <span>{isSelected ? "Viewing Quests" : "Click to view"}</span>
                  <ChevronRight className={`h-3 w-3 transition-transform ${isSelected ? "rotate-90 text-primary" : ""}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MOBILE VERTICAL CAMPAIGN ROADMAP (Under md) */}
      <div className="relative md:hidden space-y-3">
        {weeks.map((week, idx) => {
          const isSelected = week.weekNumber === displayedWeek;
          const isCurrent = week.isCurrent;
          const isCompleted = week.isCompleted;
          const isLocked = week.isLocked;
          const completedCount = week.quests.filter((q) => q.isCompleted).length;
          const totalQuests = week.quests.length;
          const meta = WEEK_METADATA[week.weekNumber] || {
            title: `Chapter ${week.weekNumber}`,
            subtitle: `Week ${week.weekNumber} Objectives`,
            icon: Star,
          };
          const Icon = meta.icon;

          return (
            <div key={week.weekNumber} className="relative">
              {/* Vertical connector line between nodes */}
              {idx < weeks.length - 1 && (
                <div
                  className={`absolute left-7 top-14 bottom-[-14px] w-1 -translate-x-1/2 rounded-full ${
                    isCompleted
                      ? "bg-emerald-500/60"
                      : isCurrent
                      ? "bg-gradient-to-b from-amber-500 to-border"
                      : "bg-border/60"
                  }`}
                />
              )}

              <button
                type="button"
                onClick={() => onSelectWeek(week.weekNumber)}
                className={`relative flex w-full items-center gap-3.5 rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                    : isCurrent
                    ? "border-amber-500/40 bg-card"
                    : isCompleted
                    ? "border-emerald-500/30 bg-card"
                    : "border-border/60 bg-muted/20 opacity-70"
                }`}
              >
                {/* Node Orb */}
                <div
                  className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                      : isCurrent
                      ? "border-amber-500 bg-amber-500/10 text-amber-500"
                      : "border-border bg-muted text-muted-foreground/60"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : isLocked ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Week {week.weekNumber}
                    </span>
                    {isCurrent && (
                      <Badge className="h-4 bg-amber-500 text-[9px] font-bold text-white px-1 py-0">
                        Active
                      </Badge>
                    )}
                    {isCompleted && (
                      <Badge variant="outline" className="h-4 border-emerald-500/40 bg-emerald-500/10 text-[9px] font-semibold text-emerald-600 px-1 py-0">
                        Cleared
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-foreground truncate">
                    {meta.title}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {completedCount} of {totalQuests} Quests Completed
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <Badge
                    variant={isSelected ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {isSelected ? "Viewing" : "Select"}
                  </Badge>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
