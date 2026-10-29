import {
  Calendar,
  Database,
  Send,
  Coins,
  CheckCircle2,
  Lock,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QuestWeekGroup } from "@/api/quests.api";

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
  const activeWeekGroup = weeks.find((w) => w.weekNumber === displayedWeek) || weeks[0];
  const completedCount = weeks.reduce((acc, w) => acc + w.quests.filter((q) => q.isCompleted).length, 0);
  const totalCount = weeks.reduce((acc, w) => acc + w.quests.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Weekly Quest Progression</h2>
          <p className="text-sm text-muted-foreground">
            Complete each week's specific objectives to unlock XP rewards before the week concludes.
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto gap-1">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          {completedCount} of {totalCount} Quests Completed
        </Badge>
      </div>

      {/* Week Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {weeks.map((week) => {
          const isSelected = week.weekNumber === displayedWeek;
          return (
            <button
              key={week.weekNumber}
              type="button"
              onClick={() => onSelectWeek(week.weekNumber)}
              className={`relative flex min-w-[130px] flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
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

      {/* Selected Week's Quest Cards */}
      {activeWeekGroup && (
        <div className="grid gap-4 md:grid-cols-3">
          {activeWeekGroup.quests.map((quest) => {
            const isLocked = activeWeekGroup.isLocked;
            return (
              <Card
                key={quest.id}
                className={`relative flex flex-col justify-between border-border/70 transition-all ${
                  quest.isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                    : isLocked
                    ? "opacity-60 bg-muted/30"
                    : "hover:border-primary/40 hover:shadow-sm"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {quest.metric === "DAILY_CHECK_IN" ? (
                        <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
                          <Calendar className="h-4 w-4" />
                        </div>
                      ) : quest.metric === "DATA_BANK_SAVED_MB" ? (
                        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                          <Database className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500">
                          <Send className="h-4 w-4" />
                        </div>
                      )}
                      <Badge
                        variant={quest.isCompleted ? "default" : isLocked ? "secondary" : "outline"}
                        className={`text-[10px] font-semibold ${
                          quest.isCompleted ? "bg-emerald-600 text-white" : ""
                        }`}
                      >
                        {quest.isCompleted ? "Completed" : isLocked ? "Locked" : "In Progress"}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="gap-1 font-bold text-amber-600 dark:text-amber-400">
                      <Coins className="h-3 w-3" />
                      +{quest.xpReward} XP
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold mt-2">{quest.title}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {quest.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>
                        {quest.progress} / {quest.targetValue}{" "}
                        {quest.metric === "DAILY_CHECK_IN" ? "days" : "MB"}
                      </span>
                      <span>{quest.progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full transition-all duration-300 ${
                          quest.isCompleted ? "bg-emerald-500" : "bg-primary"
                        }`}
                        style={{ width: `${quest.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
