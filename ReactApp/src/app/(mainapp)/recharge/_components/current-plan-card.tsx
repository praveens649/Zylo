import {
  Wifi,
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  Zap,
  Hourglass,
  BadgeCheck,
} from "lucide-react";
import type { RechargeSim } from "@/api/recharge.api";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatINR, money } from "@/lib/format";

function daysLeft(endDate: string | null) {
  if (!endDate) return null;
  return Math.max(
    0,
    Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000)
  );
}

function daysUntil(startDate: string | null) {
  if (!startDate) return null;
  return Math.ceil((new Date(startDate).getTime() - Date.now()) / 86_400_000);
}

export function CurrentPlanCard({ sim }: { sim: RechargeSim }) {
  const current = sim.currentPlan;
  const remaining = daysLeft(current?.endDate ?? null);
  const totalDays = current?.plan.validityDays ?? 0;
  const pct =
    remaining != null && totalDays > 0
      ? Math.min(100, Math.max(0, (remaining / totalDays) * 100))
      : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/60 shadow-sm">
      <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary/60" />

      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Current Plan
          </h2>
          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5">
            {sim.number}
          </Badge>
        </div>

        {!current ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                No active plan
              </p>
              <p className="text-xs text-muted-foreground">
                Recharge below to activate a plan on this number.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-baseline justify-between gap-2 border-b border-border/40 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
                  {current.plan.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(current.startDate)} →{" "}
                  {formatDate(current.endDate)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-2xl font-black tracking-tight text-foreground">
                  {formatINR(current.plan.price)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {current.plan.validityDays} Days Validity
                </div>
              </div>
            </div>

            {/* Validity progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {remaining != null ? (
                    <>
                      <span className="font-bold text-foreground">
                        {remaining}
                      </span>{" "}
                      day{remaining === 1 ? "" : "s"} left
                    </>
                  ) : (
                    "Ongoing"
                  )}
                </span>
                <span className="text-muted-foreground">
                  of {totalDays} days
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
                <Wifi className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Data
                  </p>
                  <p className="truncate text-xs font-semibold text-foreground">
                    {current.plan.dataAllowanceGb
                      ? `${money(current.plan.dataAllowanceGb)} GB`
                      : "No Data"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
                <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Voice
                  </p>
                  <p className="truncate text-xs font-semibold text-foreground">
                    {current.plan.callingBenefit || "Unlimited"}
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
                    {current.plan.smsCount
                      ? `${current.plan.smsCount} / day`
                      : "Standard"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
                <Calendar className="h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Expires
                  </p>
                  <p className="truncate text-xs font-semibold text-foreground">
                    {formatDate(current.endDate)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Queued plans — start after the current plan ends */}
        {sim.upcomingPlans.length > 0 && (
          <div className="mt-5 border-t border-border/40 pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Hourglass className="h-3.5 w-3.5" />
                Queued — activates automatically
              </p>
              <Badge
                variant="outline"
                className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[11px] font-semibold"
              >
                {sim.upcomingPlans.length}{" "}
                {sim.upcomingPlans.length === 1 ? "plan" : "plans"} in line
              </Badge>
            </div>

            {/* Queue timeline */}
            <div className="relative mt-4 flex flex-col gap-3">
              <div className="absolute bottom-4 left-[15px] top-4 w-px bg-gradient-to-b from-indigo-500/60 via-indigo-500/25 to-transparent" />

              {sim.upcomingPlans.map((sub, index) => {
                const startsIn = daysUntil(sub.startDate);
                return (
                  <div key={sub.id} className="relative flex gap-3">
                    {/* Timeline node */}
                    <div
                      className={`z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                        index === 0
                          ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-400"
                          : "border-border/70 bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {index === 0 ? (
                        <Zap className="h-3.5 w-3.5" />
                      ) : (
                        <span className="text-[11px] font-bold">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Queued plan card */}
                    <div
                      className={`flex-1 overflow-hidden rounded-xl border transition-all ${
                        index === 0
                          ? "border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent shadow-sm"
                          : "border-border/50 bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {sub.plan.name}
                            </p>
                            {index === 0 && (
                              <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30 text-[10px] font-bold px-1.5 py-0">
                                NEXT UP
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {formatDate(sub.startDate)} →{" "}
                            {formatDate(sub.endDate)}
                            <span className="text-muted-foreground/70">
                              • {sub.plan.validityDays} days
                            </span>
                          </p>
                          {startsIn != null && (
                            <p className="mt-1 text-[11px] font-medium text-indigo-400/90">
                              {index === 0
                                ? startsIn > 0
                                  ? `Activates in ${startsIn} day${startsIn === 1 ? "" : "s"}`
                                  : "Activating now"
                                : `Begins ${formatDate(sub.startDate)}`}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-display text-base font-black text-foreground">
                            {formatINR(sub.plan.price)}
                          </div>
                          <div className="flex items-center justify-end gap-1 text-[10px] font-semibold text-indigo-400/80">
                            <BadgeCheck className="h-3 w-3" />
                            Paid
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
              No days lost — each queued plan starts the moment the previous
              one ends.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
