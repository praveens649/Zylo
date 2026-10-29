import { useState, useMemo } from "react";
import {
  Coins,
  Gift,
  Check,
  Sparkles,
  Database,
  Ticket,
  Shield,
  Lock,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Flame,
  Crown,
  Zap,
  Info,
  Layers,
  X,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VoucherItem } from "@/api/quests.api";
import type { VoucherCategoryFilter } from "../_hooks/use-quests";
import { getBadge } from "@/lib/badges";

interface VoucherMarketplaceProps {
  vouchers: VoucherItem[];
  spendablePackXp: number;
  activeCategory: VoucherCategoryFilter;
  onSelectCategory: (category: VoucherCategoryFilter) => void;
  onOpenRedeemModal: (voucher: VoucherItem) => void;
  isRedeemPending: boolean;
}

export type ItemRarity = "LEGENDARY" | "EPIC" | "RARE" | "COMMON";

export interface RarityConfig {
  label: string;
  badgeClass: string;
  borderClass: string;
  glowClass: string;
  accentBg: string;
  textGlow: string;
  ringColor: string;
}

export function getItemRarity(voucher: VoucherItem): ItemRarity {
  if (
    voucher.badgeCode === "DIAMOND_VIP_SAVER" ||
    voucher.requiredXp >= 800 ||
    (voucher.valueMb && voucher.valueMb >= 2500)
  ) {
    return "LEGENDARY";
  }
  if (
    voucher.badgeCode === "LEVEL_3_CYBER_MASTER" ||
    voucher.requiredXp >= 600 ||
    (voucher.discountPaise && voucher.discountPaise >= 5000) ||
    (voucher.valueMb && voucher.valueMb >= 1000)
  ) {
    return "EPIC";
  }
  if (
    voucher.badgeCode === "LEVEL_2_DATA_EXPLORER" ||
    voucher.requiredXp >= 300 ||
    (voucher.discountPaise && voucher.discountPaise >= 2000)
  ) {
    return "RARE";
  }
  return "COMMON";
}

export const RARITY_CONFIG: Record<ItemRarity, RarityConfig> = {
  LEGENDARY: {
    label: "Mythic Legendary",
    badgeClass:
      "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 text-black font-black border-amber-300/40 shadow-xs",
    borderClass:
      "border-amber-500/50 hover:border-amber-400 dark:border-amber-400/50",
    glowClass: "shadow-amber-500/20 hover:shadow-amber-500/35",
    accentBg: "from-amber-500/20 via-orange-500/10 to-transparent",
    textGlow: "text-amber-500 dark:text-amber-400",
    ringColor: "ring-amber-500/40",
  },
  EPIC: {
    label: "Epic Artifact",
    badgeClass:
      "bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black border-purple-300/40 shadow-xs",
    borderClass:
      "border-purple-500/50 hover:border-purple-400 dark:border-purple-400/50",
    glowClass: "shadow-purple-500/20 hover:shadow-purple-500/35",
    accentBg: "from-purple-500/20 via-indigo-500/10 to-transparent",
    textGlow: "text-purple-500 dark:text-purple-400",
    ringColor: "ring-purple-500/40",
  },
  RARE: {
    label: "Rare Upgrade",
    badgeClass:
      "bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black border-cyan-300/40 shadow-xs",
    borderClass:
      "border-blue-500/50 hover:border-blue-400 dark:border-blue-400/50",
    glowClass: "shadow-blue-500/20 hover:shadow-blue-500/35",
    accentBg: "from-blue-500/20 via-cyan-500/10 to-transparent",
    textGlow: "text-blue-500 dark:text-blue-400",
    ringColor: "ring-blue-500/40",
  },
  COMMON: {
    label: "Standard Perk",
    badgeClass:
      "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border-emerald-500/30",
    borderClass: "border-border/80 hover:border-emerald-500/50",
    glowClass: "shadow-xs hover:shadow-emerald-500/15",
    accentBg: "from-emerald-500/15 via-teal-500/5 to-transparent",
    textGlow: "text-emerald-600 dark:text-emerald-400",
    ringColor: "ring-emerald-500/30",
  },
};

export function VoucherMarketplace({
  vouchers,
  spendablePackXp,
  activeCategory,
  onSelectCategory,
  onOpenRedeemModal,
  isRedeemPending,
}: VoucherMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyClaimable, setOnlyClaimable] = useState(false);
  const [sortBy, setSortBy] = useState<"RECOMMENDED" | "XP_ASC" | "XP_DESC">("RECOMMENDED");

  // Filter & sort logic
  const filteredVouchers = useMemo(() => {
    return vouchers
      .filter((v) => {
        // Category filter
        if (activeCategory !== "ALL" && v.type !== activeCategory) return false;

        // Claimable filter
        if (onlyClaimable) {
          if (v.isBadgeOwned || spendablePackXp < v.requiredXp) return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = v.name.toLowerCase().includes(q);
          const matchDesc = (v.description || "").toLowerCase().includes(q);
          const matchMb = v.valueMb ? `${v.valueMb}mb`.includes(q) : false;
          const matchRupee = v.discountPaise
            ? `₹${v.discountPaise / 100}`.includes(q) || `${v.discountPaise / 100}`.includes(q)
            : false;
          if (!matchName && !matchDesc && !matchMb && !matchRupee) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "XP_ASC") return a.requiredXp - b.requiredXp;
        if (sortBy === "XP_DESC") return b.requiredXp - a.requiredXp;
        // Default Recommended: claimable first, then by required XP
        const aCan = spendablePackXp >= a.requiredXp && !a.isBadgeOwned ? 1 : 0;
        const bCan = spendablePackXp >= b.requiredXp && !b.isBadgeOwned ? 1 : 0;
        if (aCan !== bCan) return bCan - aCan;
        return a.requiredXp - b.requiredXp;
      });
  }, [vouchers, activeCategory, onlyClaimable, searchQuery, sortBy, spendablePackXp]);

  const affordableCount = useMemo(() => {
    return vouchers.filter((v) => spendablePackXp >= v.requiredXp && !v.isBadgeOwned).length;
  }, [vouchers, spendablePackXp]);

  // Find Spotlight Hero Perk (Featured item: Diamond VIP or high-value data/coupon)
  const spotlightItem = useMemo(() => {
    return (
      vouchers.find((v) => v.badgeCode === "DIAMOND_VIP_SAVER") ||
      vouchers.find((v) => v.requiredXp >= 600) ||
      vouchers[0] ||
      null
    );
  }, [vouchers]);

  return (
    <div className="space-y-6 pt-3">
      {/* 1. Shop Header & Live Vault Balance */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/[0.05] p-5 sm:p-6 shadow-sm">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-xs">
                <Crown className="h-4 w-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Voucher Vault & Perks Shop
              </h2>
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-[11px] px-2.5 shadow-xs">
                Gamify Armory
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Exchange your hard-earned Pack Quest XP for real high-speed Data Bank top-ups, recharge discount vouchers, and permanent avatar prestige flair.
            </p>
          </div>

          {/* Live Wallet Balance Pill */}
          <div className="flex items-center gap-3 self-start md:self-auto rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 shadow-xs backdrop-blur-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-black shadow-xs">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                Vault Balance
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-foreground">
                  {spendablePackXp.toLocaleString()}
                </span>
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                  XP Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Spotlight / Featured Perk Banner */}
      {spotlightItem && (
        <FeaturedSpotlightBanner
          voucher={spotlightItem}
          spendablePackXp={spendablePackXp}
          onOpenRedeemModal={onOpenRedeemModal}
          isRedeemPending={isRedeemPending}
        />
      )}

      {/* 3. Interactive Search, Filters & Sorting Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search perks, data boosters, coupons, or badges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-xs sm:text-sm h-10 rounded-xl bg-muted/30 border-border/70 focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter: Claimable Now Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyClaimable(!onlyClaimable)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                onlyClaimable
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <Zap
                className={`h-3.5 w-3.5 ${
                  onlyClaimable ? "text-emerald-500 fill-emerald-500" : "text-muted-foreground"
                }`}
              />
              <span>Claimable Now Only</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  onlyClaimable
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {affordableCount}
              </span>
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-xl border border-border/80 bg-card px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="RECOMMENDED">✨ Recommended</option>
              <option value="XP_ASC">⚡ XP: Low to High</option>
              <option value="XP_DESC">🔥 XP: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
          {(
            [
              { key: "ALL", label: "All Loot Items", icon: Sparkles },
              { key: "DATA_MB", label: "High-Speed Data Boosts", icon: Database },
              { key: "COUPON", label: "Recharge Discounts", icon: Ticket },
              { key: "BADGE", label: "Prestige Medallions", icon: Shield },
            ] as const
          ).map((filter) => {
            const count =
              filter.key === "ALL"
                ? vouchers.length
                : vouchers.filter((v) => v.type === filter.key).length;
            const Icon = filter.icon;
            const isSelected = activeCategory === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => onSelectCategory(filter.key)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border/80 bg-card text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{filter.label}</span>
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Perks Grid */}
      {filteredVouchers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No matching loot found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {onlyClaimable
              ? "You do not have enough spendable XP yet for these filters. Complete weekly quests to stock up your XP!"
              : "Try adjusting your search query or selecting a different category filter."}
          </p>
          {(searchQuery || onlyClaimable) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setOnlyClaimable(false);
                onSelectCategory("ALL");
              }}
              className="text-xs font-bold mt-2"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVouchers.map((voucher) => (
            <GamifiedLootCard
              key={voucher.id}
              voucher={voucher}
              spendablePackXp={spendablePackXp}
              onOpenRedeemModal={onOpenRedeemModal}
              isRedeemPending={isRedeemPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * High-Impact Spotlight Banner for the highest-value perk
 */
function FeaturedSpotlightBanner({
  voucher,
  spendablePackXp,
  onOpenRedeemModal,
  isRedeemPending,
}: {
  voucher: VoucherItem;
  spendablePackXp: number;
  onOpenRedeemModal: (voucher: VoucherItem) => void;
  isRedeemPending: boolean;
}) {
  const rarity = getItemRarity(voucher);
  const rarityCfg = RARITY_CONFIG[rarity];
  const badgeDef = voucher.badgeCode ? getBadge(voucher.badgeCode) : null;
  const canAfford = spendablePackXp >= voucher.requiredXp;
  const isBadgeOwned = voucher.isBadgeOwned;
  const progressPercent = Math.min(100, Math.round((spendablePackXp / voucher.requiredXp) * 100));

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border ${rarityCfg.borderClass} bg-gradient-to-r ${rarityCfg.accentBg} bg-card p-5 sm:p-6 shadow-md transition-all duration-300 hover:shadow-lg`}
    >
      <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        {/* Left: Visual & Details */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 flex-1">
          {/* Visual Medallion / Icon */}
          <div className="relative shrink-0">
            {badgeDef ? (
              <div
                className={`relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-3 ${badgeDef.borderColor} p-1 bg-card shadow-lg ${badgeDef.glowColor}`}
              >
                <img
                  src={badgeDef.image}
                  alt={badgeDef.name}
                  className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            ) : voucher.type === "DATA_MB" ? (
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 via-cyan-500/15 to-transparent border-2 border-blue-500/40 text-blue-500 shadow-md">
                <Database className="h-10 w-10 animate-pulse" />
              </div>
            ) : (
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent border-2 border-emerald-500/40 text-emerald-500 shadow-md">
                <Ticket className="h-10 w-10" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-black shadow-xs font-black text-[10px]">
              ★
            </div>
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] ${rarityCfg.badgeClass}`}>
                {rarityCfg.label.toUpperCase()}
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Flame className="h-3 w-3 text-amber-500" /> VAULT SPOTLIGHT
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight truncate">
              {voucher.name}
            </h3>

            <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">
              {voucher.description}
            </p>

            {/* Yield Tag */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground">Benefit:</span>
              {voucher.type === "DATA_MB" && (
                <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                  +{voucher.valueMb} MB High-Speed Bank Credit
                </span>
              )}
              {voucher.type === "COUPON" && voucher.discountPaise && (
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  ₹{voucher.discountPaise / 100} Flat Discount on Recharge
                </span>
              )}
              {voucher.type === "BADGE" && (
                <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                  Permanent Diamond Profile Crest & Maximum Flair
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Cost & Claim Action */}
        <div className="w-full sm:w-auto shrink-0 flex flex-col items-start sm:items-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-bold text-muted-foreground">Price:</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {voucher.requiredXp.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">XP</span>
          </div>

          <Button
            size="default"
            disabled={isBadgeOwned || !canAfford || isRedeemPending}
            onClick={() => onOpenRedeemModal(voucher)}
            className={`w-full sm:w-auto font-black text-xs h-10 px-5 transition-all shadow-sm ${
              isBadgeOwned
                ? "bg-muted text-muted-foreground"
                : canAfford
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-black hover:opacity-90 hover:shadow-md"
                : "border border-border/80 bg-card text-muted-foreground"
            }`}
          >
            {isBadgeOwned ? (
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" /> Equipped in Profile
              </span>
            ) : canAfford ? (
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Claim Spotlight Perk
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Lock className="h-4 w-4" /> Need {voucher.requiredXp - spendablePackXp} More XP
              </span>
            )}
          </Button>

          {!canAfford && !isBadgeOwned && (
            <div className="w-full sm:w-48 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                <span>XP Ready</span>
                <span>
                  {spendablePackXp} / {voucher.requiredXp} ({progressPercent}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual Gamified Loot Card for Shop Grid
 */
function GamifiedLootCard({
  voucher,
  spendablePackXp,
  onOpenRedeemModal,
  isRedeemPending,
}: {
  voucher: VoucherItem;
  spendablePackXp: number;
  onOpenRedeemModal: (voucher: VoucherItem) => void;
  isRedeemPending: boolean;
}) {
  const rarity = getItemRarity(voucher);
  const rarityCfg = RARITY_CONFIG[rarity];
  const badgeDef = voucher.badgeCode ? getBadge(voucher.badgeCode) : null;
  const canAfford = spendablePackXp >= voucher.requiredXp;
  const isBadgeOwned = voucher.isBadgeOwned;
  const progressPercent = Math.min(100, Math.round((spendablePackXp / voucher.requiredXp) * 100));

  return (
    <Card
      className={`group relative flex flex-col justify-between overflow-hidden border transition-all duration-300 ${
        isBadgeOwned
          ? "border-border/60 bg-muted/20 opacity-80"
          : canAfford
          ? `${rarityCfg.borderClass} bg-gradient-to-b from-card via-card to-amber-500/[0.03] shadow-md hover:shadow-xl hover:-translate-y-1`
          : "border-border/80 bg-card hover:border-border/90 hover:shadow-xs"
      }`}
    >
      {/* Top Rarity Accent Bar */}
      <div
        className={`h-1.5 w-full ${
          isBadgeOwned
            ? "bg-muted"
            : canAfford
            ? "bg-gradient-to-r from-amber-400 via-primary to-emerald-400"
            : "bg-border/60"
        }`}
      />

      <CardHeader className="pb-3 pt-3.5 space-y-3">
        {/* Rarity & XP Price Header */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-wider ${rarityCfg.badgeClass}`}>
            {rarityCfg.label}
          </Badge>

          {/* XP Price Tag */}
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-black text-amber-600 dark:text-amber-400">
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            <span>{voucher.requiredXp.toLocaleString()} XP</span>
          </div>
        </div>

        {/* 3D Visual Artifact Showcase */}
        <div className="relative flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-gradient-to-b from-muted/30 to-muted/10 p-4 transition-all duration-300 group-hover:bg-muted/40">
          {badgeDef ? (
            <div
              className={`relative h-20 w-20 overflow-hidden rounded-full border-3 ${badgeDef.borderColor} p-1 bg-card shadow-md transition-all duration-500 group-hover:scale-110 ${badgeDef.glowColor}`}
            >
              <img
                src={badgeDef.image}
                alt={badgeDef.name}
                className="h-full w-full rounded-full object-cover"
              />
            </div>
          ) : voucher.type === "DATA_MB" ? (
            <div className="relative flex flex-col items-center justify-center py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 via-cyan-500/15 to-transparent border border-blue-500/40 text-blue-500 shadow-sm transition-transform duration-300 group-hover:scale-105">
                <Database className="h-8 w-8" />
              </div>
              <span className="mt-2 text-xs font-black tracking-tight text-blue-600 dark:text-blue-400">
                +{voucher.valueMb} MB DATA CORE
              </span>
            </div>
          ) : (
            <div className="relative flex flex-col items-center justify-center py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent border border-emerald-500/40 text-emerald-500 shadow-sm transition-transform duration-300 group-hover:scale-105">
                <Ticket className="h-8 w-8" />
              </div>
              <span className="mt-2 text-xs font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                ₹{voucher.discountPaise ? voucher.discountPaise / 100 : 0} RECHARGE TOKEN
              </span>
            </div>
          )}
        </div>

        {/* Name and Description */}
        <div className="space-y-1">
          <CardTitle className="text-base font-extrabold text-foreground leading-snug">
            {voucher.name}
          </CardTitle>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {voucher.description}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Yield Pill */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground font-medium text-[11px]">Yield:</span>
          {voucher.type === "DATA_MB" && (
            <span className="font-black text-blue-600 dark:text-blue-400 text-xs">
              +{voucher.valueMb} MB Direct to Bank
            </span>
          )}
          {voucher.type === "COUPON" && voucher.discountPaise && (
            <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
              ₹{voucher.discountPaise / 100} Plan Discount pa
            </span>
          )}
          {voucher.type === "BADGE" && (
            <span className="font-black text-purple-600 dark:text-purple-400 text-xs">
              Permanent Avatar Flair
            </span>
          )}
        </div>

        {/* Affordability Progress Bar if not yet claimable */}
        {!canAfford && !isBadgeOwned && (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
              <span>XP Goal</span>
              <span>
                {spendablePackXp} / {voucher.requiredXp} XP ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Redeem CTA Button */}
        <div className="pt-1">
          <Button
            size="sm"
            disabled={isBadgeOwned || !canAfford || isRedeemPending}
            onClick={() => onOpenRedeemModal(voucher)}
            variant={isBadgeOwned ? "secondary" : canAfford ? "default" : "outline"}
            className={`w-full font-bold h-9.5 text-xs transition-all ${
              canAfford && !isBadgeOwned
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-black hover:opacity-95 shadow-sm hover:shadow-md"
                : ""
            }`}
          >
            {isBadgeOwned ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Check className="h-4 w-4 text-emerald-500" /> Equipped in Profile
              </span>
            ) : canAfford ? (
              <span className="flex items-center gap-1.5 font-black">
                <Gift className="h-4 w-4" /> Claim Perk
                <ArrowUpRight className="h-3.5 w-3.5 ml-auto" />
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <Lock className="h-3.5 w-3.5" /> Need {voucher.requiredXp - spendablePackXp} More XP
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
