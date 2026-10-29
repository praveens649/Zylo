import { useState } from "react";
import {
  Sparkles,
  Clock,
  Flame,
  CheckCircle2,
  HelpCircle,
  Trophy,
  ShieldCheck,
  Zap,
  Gift,
  Coins,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const [showGuideModal, setShowGuideModal] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-card via-card/95 to-primary/[0.07] p-6 shadow-md sm:p-8">
        {/* Decorative background glow & mesh particles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary font-bold">
                <Sparkles className="h-3 w-3" /> Zylo Pack Questverse
              </Badge>
              <Badge variant="secondary" className="gap-1 font-semibold">
                <Clock className="h-3 w-3 text-muted-foreground" /> {daysRemaining} Days Left in Plan
              </Badge>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-4 decoration-border transition-colors ml-1"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                How It Works
              </button>
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-foreground">
              Data Quests & Voucher Marketplace
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Complete weekly objectives to collect spendable Pack XP. Exchange XP for bonus data bank add-ons,
              recharge coupons, and permanent prestige badges before your plan cycle resets!
            </p>
          </div>

          {/* Gamified HUD: Automatic Check-in & Fire Streak Badges */}
          <div className="flex flex-col gap-3 sm:items-end shrink-0">
            {/* Automatic Daily Check-in Status */}
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 shadow-sm backdrop-blur-md">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 shadow-xs">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span>{checkedInToday ? "Daily Check-in Active" : "Active Today"}</span>
                <span className="text-[11px] font-medium text-emerald-600/90 dark:text-emerald-400">
                  +25 XP auto-awarded on login
                </span>
              </div>
            </div>

            {/* Fire Streak Card */}
            <div className="flex items-center gap-2.5 rounded-xl border border-orange-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3.5 py-2 text-xs font-semibold text-orange-700 dark:text-orange-400 shadow-xs">
              <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-orange-500/20 text-orange-500 animate-pulse">
                <Flame className="h-3.5 w-3.5" />
              </div>
              <span>
                Active Streak:{" "}
                <strong className="text-foreground font-black text-sm">
                  {streakDays} {streakDays === 1 ? "Day" : "Days"}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rules / Guide Modal Dialog */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Trophy className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold">Zylo Gamification Guide</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGuideModal(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3.5 text-xs text-muted-foreground">
              <div className="flex gap-3 rounded-xl border border-border/70 p-3 bg-muted/20">
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500 shrink-0 h-8 w-8 flex items-center justify-center">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-0.5">Automated Daily Check-in</h4>
                  <p>Simply log into Zylo each calendar day. You automatically receive +25 XP and maintain your active daily streak.</p>
                </div>
              </div>

              <div className="flex gap-3 rounded-xl border border-border/70 p-3 bg-muted/20">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500 shrink-0 h-8 w-8 flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-0.5">4-Week Adventure Roadmap</h4>
                  <p>Every active plan features 4 distinct weekly chapters. Complete data saving, transferring, and check-in tasks to unlock weekly milestones.</p>
                </div>
              </div>

              <div className="flex gap-3 rounded-xl border border-border/70 p-3 bg-muted/20">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500 shrink-0 h-8 w-8 flex items-center justify-center">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-0.5">Spendable XP vs. Cycle Expiry</h4>
                  <p>Pack XP is spendable currency for vouchers! Redeem it for bonus data and discount coupons before your recharge validity ends.</p>
                </div>
              </div>

              <div className="flex gap-3 rounded-xl border border-border/70 p-3 bg-muted/20">
                <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500 shrink-0 h-8 w-8 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-0.5">Permanent Profile Badges</h4>
                  <p>Levels and cosmetic badges are permanent account achievements that persist across all plan renewals forever!</p>
                </div>
              </div>
            </div>

            <Button
              className="w-full font-bold"
              onClick={() => setShowGuideModal(false)}
            >
              Got it, let's play!
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
