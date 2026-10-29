import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Database,
  Send,
  Coins,
  CheckCircle2,
  Lock,
  Zap,
  ArrowRight,
  Sparkles,
  Trophy,
  Flame,
  LayoutGrid,
  MapPin,
  Check,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QuestWeekGroup } from "@/api/quests.api";
import { RoadmapTrail } from "./roadmap-trail";

interface WeeklyQuestsSectionProps {
  weeks: QuestWeekGroup[];
  displayedWeek: number;
  onSelectWeek: (weekNumber: number) => void;
}

export function WeeklyQuestsSection({
  weeks,
  displayedWeek,
  onSelectWeek,
}: WeeklyQuestsSectionProps) {
  const [viewMode, setViewMode] = useState<"ROADMAP" | "TABS">("ROADMAP");

  const activeWeekGroup = weeks.find((w) => w.weekNumber === displayedWeek) || weeks[0];
  const completedCount = weeks.reduce(
    (acc, w) => acc + w.quests.filter((q) => q.isCompleted).length,
    0
  );
  const totalCount = weeks.reduce((acc, w) => acc + w.quests.length, 0);

  const activeWeekCompletedCount =
    activeWeekGroup?.quests.filter((q) => q.isCompleted).length || 0;
  const activeWeekTotalCount = activeWeekGroup?.quests.length || 0;
  const activeWeekTotalXp =
    activeWeekGroup?.quests.reduce((acc, q) => acc + q.xpReward, 0) || 0;

  return (
    <div className="space-y-6">
      {/* 1. Header with View Mode Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Campaign Quests & Progression
            </h2>
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Zap className="mr-1 h-3 w-3 text-amber-500" />
              {completedCount}/{totalCount} Completed
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Follow the 4-week adventure roadmap. Complete weekly tasks to earn spendable XP for marketplace perks.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-xl border border-border/70 bg-card p-1 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("ROADMAP")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "ROADMAP"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Adventure Trail</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("TABS")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "TABS"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Grid Tabs</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Campaign Roadmap Trail OR Tabs */}
      {viewMode === "ROADMAP" ? (
        <RoadmapTrail
          weeks={weeks}
          displayedWeek={displayedWeek}
          onSelectWeek={onSelectWeek}
        />
      ) : (
        /* Classic Fast Tabs */
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {weeks.map((week) => {
            const isSelected = week.weekNumber === displayedWeek;
            return (
              <button
                key={week.weekNumber}
                type="button"
                onClick={() => onSelectWeek(week.weekNumber)}
                className={`relative flex min-w-[140px] flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                    : "border-border/70 bg-card hover:border-border hover:bg-accent/40"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Week {week.weekNumber}
                  </span>
                  {week.isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : week.isLocked ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                  ) : week.isCurrent ? (
                    <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
                  ) : null}
                </div>
                <span className="text-xs font-semibold">
                  {week.isCurrent
                    ? "Active Now"
                    : week.isLocked
                    ? "Upcoming"
                    : week.isCompleted
                    ? "Completed"
                    : "Past Week"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Selected Week's Objective Stage Banner */}
      {activeWeekGroup && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-gradient-to-r from-card via-muted/30 to-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                  activeWeekGroup.isCompleted
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                    : activeWeekGroup.isCurrent
                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                W{activeWeekGroup.weekNumber}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    Week {activeWeekGroup.weekNumber} Quest Log
                  </h3>
                  {activeWeekGroup.isCurrent && (
                    <Badge className="bg-amber-500 text-[10px] text-white">
                      Current Stage
                    </Badge>
                  )}
                  {activeWeekGroup.isCompleted && (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold">
                      Stage Mastered
                    </Badge>
                  )}
                  {activeWeekGroup.isLocked && (
                    <Badge variant="secondary" className="text-[10px]">
                      Locked
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Earn up to <strong className="text-foreground">+{activeWeekTotalXp} XP</strong> from this week's objectives.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
              <span className="text-muted-foreground">Progress:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">
                  {activeWeekCompletedCount} / {activeWeekTotalCount} Done
                </span>
                <div className="h-2 w-20 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${
                        activeWeekTotalCount > 0
                          ? (activeWeekCompletedCount / activeWeekTotalCount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Locked Notice if applicable */}
          {activeWeekGroup.isLocked && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
              <div className="rounded-full bg-muted p-2">
                <Lock className="h-4 w-4" />
              </div>
              <p>
                <strong>Stage Locked:</strong> Week {activeWeekGroup.weekNumber} quests will activate automatically when your pack cycle enters this week. You can preview the quest objectives below!
              </p>
            </div>
          )}

          {/* Quest Cards Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            {activeWeekGroup.quests.map((quest) => {
              const isLocked = activeWeekGroup.isLocked;
              return (
                <Card
                  key={quest.id}
                  className={`group relative flex flex-col justify-between overflow-hidden border transition-all duration-300 ${
                    quest.isCompleted
                      ? "border-emerald-500/40 bg-gradient-to-b from-card via-card to-emerald-500/[0.04] shadow-xs"
                      : isLocked
                      ? "border-border/60 bg-muted/30 opacity-70"
                      : "border-border/80 bg-gradient-to-b from-card via-card to-primary/[0.02] hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  {/* Top glowing accent for active in-progress quests */}
                  {!quest.isCompleted && !isLocked && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
                  )}
                  {quest.isCompleted && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
                  )}

                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {quest.metric === "DAILY_CHECK_IN" ? (
                          <div className="rounded-xl bg-orange-500/10 p-2.5 text-orange-500 shadow-xs border border-orange-500/20">
                            <Calendar className="h-4 w-4" />
                          </div>
                        ) : quest.metric === "DATA_BANK_SAVED_MB" ? (
                          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-500 shadow-xs border border-blue-500/20">
                            <Database className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-500 shadow-xs border border-purple-500/20">
                            <Send className="h-4 w-4" />
                          </div>
                        )}
                        <Badge
                          variant={
                            quest.isCompleted
                              ? "default"
                              : isLocked
                              ? "secondary"
                              : "outline"
                          }
                          className={`text-[10px] font-bold ${
                            quest.isCompleted
                              ? "bg-emerald-600 text-white hover:bg-emerald-600"
                              : ""
                          }`}
                        >
                          {quest.isCompleted ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" /> Completed
                            </span>
                          ) : isLocked ? (
                            "Locked"
                          ) : (
                            "In Progress"
                          )}
                        </Badge>
                      </div>

                      {/* XP Reward Pill */}
                      <Badge
                        variant="secondary"
                        className="gap-1 font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 bg-amber-500/10"
                      >
                        <Coins className="h-3.5 w-3.5 text-amber-500" />
                        +{quest.xpReward} XP
                      </Badge>
                    </div>

                    <CardTitle className="text-base font-bold mt-3 leading-snug">
                      {quest.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 leading-relaxed">
                      {quest.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    {/* Progress Bar & Numerical Counter */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                        <span>
                          {quest.progress} / {quest.targetValue}{" "}
                          {quest.metric === "DAILY_CHECK_IN" ? "days" : "MB"}
                        </span>
                        <span className={quest.isCompleted ? "text-emerald-600 font-bold" : ""}>
                          {quest.progressPercent}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80">
                        <div
                          className={`h-full transition-all duration-500 ${
                            quest.isCompleted
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : "bg-gradient-to-r from-primary to-amber-500"
                          }`}
                          style={{ width: `${quest.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Direct Link / Action */}
                    {!isLocked && (
                      <div className="pt-1">
                        {quest.isCompleted ? (
                          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="flex items-center gap-1.5">
                              <Trophy className="h-3.5 w-3.5" />
                              Bounty Claimed
                            </span>
                            <span className="font-bold">+{quest.xpReward} XP</span>
                          </div>
                        ) : quest.metric === "DATA_BANK_SAVED_MB" ||
                          quest.metric === "DATA_BANK_REDEEMED_MB" ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="w-full justify-between h-8 text-xs font-semibold group-hover:border-primary/50 group-hover:bg-primary/5"
                          >
                            <Link to="/data-bank">
                              <span>Open Data Bank</span>
                              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          </Button>
                        ) : quest.metric === "DATA_TRANSFERRED_MB" ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="w-full justify-between h-8 text-xs font-semibold group-hover:border-primary/50 group-hover:bg-primary/5"
                          >
                            <Link to="/data-bank">
                              <span>Transfer Data to Friend</span>
                              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          </Button>
                        ) : (
                          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                            <span>Auto checks in upon daily login</span>
                            <Flame className="h-3.5 w-3.5 text-orange-500" />
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
