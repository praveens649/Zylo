import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Sparkles,
  Lock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  X,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ORDERED_BADGES,
  type BadgeDefinition,
} from "@/lib/badges";

interface ProfileBadgesShowcaseProps {
  unlockedBadges?: string[];
  level?: number;
}

export function ProfileBadgesShowcase({
  unlockedBadges = ["LEVEL_1_ROOKIE"],
  level = 1,
}: ProfileBadgesShowcaseProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);

  const unlockedSet = new Set(unlockedBadges);
  const unlockedCount = ORDERED_BADGES.filter((b) => unlockedSet.has(b.code)).length;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Trophy className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">
              Prestige Medallions & Avatar Crests
            </h2>
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-600 dark:text-amber-400">
              {unlockedCount} of {ORDERED_BADGES.length} Unlocked
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Permanent account trophies earned through Data Quests. These never expire across plan renewals!
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold self-start sm:self-auto">
          <Link to="/quests">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Questverse</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </Link>
        </Button>
      </div>

      {/* 4-Medallion Prestige Pedestal Showcase */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {ORDERED_BADGES.map((badge) => {
          const isUnlocked = unlockedSet.has(badge.code);

          return (
            <button
              key={badge.code}
              type="button"
              onClick={() => setSelectedBadge(badge)}
              className={`group relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border p-4 text-center transition-all duration-300 focus:outline-none ${
                isUnlocked
                  ? `border-border/80 bg-gradient-to-b from-card via-card to-muted/30 hover:${badge.glowColor} hover:-translate-y-1.5 hover:border-primary/60 cursor-pointer`
                  : "border-border/50 bg-muted/20 opacity-70 hover:opacity-90 hover:border-border cursor-pointer"
              }`}
            >
              {/* Decorative Subtle Background Aura for Unlocked */}
              {isUnlocked && (
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${badge.accentBg} opacity-60`}
                />
              )}

              {/* Rarity Tag */}
              <div className="relative z-10 mb-2 flex w-full items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${badge.rarityColor}`}
                >
                  {badge.rarity}
                </span>

                {isUnlocked ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* Central Glowing Medallion Emblem */}
              <div className="relative z-10 my-2 flex items-center justify-center">
                {/* Outer Glow Halo */}
                {isUnlocked && (
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-md group-hover:bg-primary/40 transition-all" />
                )}

                {/* Medallion Frame */}
                <div
                  className={`relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border-4 p-1 shadow-md transition-all duration-300 ${
                    isUnlocked
                      ? `${badge.borderColor} bg-card group-hover:scale-105 group-hover:shadow-xl`
                      : "border-border/60 bg-muted grayscale opacity-60"
                  }`}
                >
                  <img
                    src={badge.image}
                    alt={badge.name}
                    className="h-full w-full rounded-full object-cover shadow-inner transition-transform duration-500 group-hover:scale-110"
                  />

                  {/* Locked padlock overlay */}
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                      <Lock className="h-7 w-7 text-white/90 drop-shadow-md" />
                    </div>
                  )}
                </div>
              </div>

              {/* Badge Name & Subtitle */}
              <div className="relative z-10 mt-2 space-y-0.5 w-full">
                <h3 className="text-xs sm:text-sm font-extrabold text-foreground truncate">
                  {badge.name}
                </h3>
                <p className="text-[11px] font-medium text-muted-foreground truncate">
                  {badge.tier} Tier
                </p>
              </div>

              {/* Bottom Status Ribbon */}
              <div className="relative z-10 mt-3 w-full border-t border-border/40 pt-2 text-[10px] font-bold">
                {isUnlocked ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> Active Crest
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Click to view unlock trial
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* High-Resolution Medallion Inspection Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Top Close Button */}
            <div className="flex items-center justify-between">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${selectedBadge.rarityColor}`}
              >
                {selectedBadge.rarity} Medallion • {selectedBadge.tier} Tier
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBadge(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Emblem Spotlight */}
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/25 blur-xl scale-125 pointer-events-none" />
                <div
                  className={`relative h-32 w-32 overflow-hidden rounded-full border-4 p-1.5 shadow-2xl ${
                    unlockedSet.has(selectedBadge.code)
                      ? `${selectedBadge.borderColor} bg-card`
                      : "border-border bg-muted grayscale opacity-70"
                  }`}
                >
                  <img
                    src={selectedBadge.image}
                    alt={selectedBadge.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                  {!unlockedSet.has(selectedBadge.code) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                      <Lock className="h-8 w-8 text-white/90 drop-shadow-md" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-foreground">
                  {selectedBadge.name}
                </h3>
                <p className="text-xs font-semibold text-primary mt-0.5">
                  {selectedBadge.subtitle}
                </p>
              </div>
            </div>

            {/* Lore & Details Box */}
            <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 p-4 text-xs">
              <div>
                <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                  Emblem Lore
                </span>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  {selectedBadge.description}
                </p>
              </div>

              <div className="border-t border-border/50 pt-2.5">
                <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                  Requirement
                </span>
                <p className="text-foreground font-semibold mt-0.5">
                  {selectedBadge.unlockCondition}
                </p>
              </div>

              <div className="border-t border-border/50 pt-2.5">
                <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                  Passive Perks
                </span>
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  ⚡ {selectedBadge.perks}
                </p>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex gap-2">
              {unlockedSet.has(selectedBadge.code) ? (
                <Button
                  className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setSelectedBadge(null)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Equipped to Profile
                </Button>
              ) : (
                <Button asChild className="w-full font-bold">
                  <Link to="/quests" onClick={() => setSelectedBadge(null)}>
                    <Zap className="h-4 w-4 mr-1.5 text-amber-300" />
                    Unlock via Quests & Store
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
