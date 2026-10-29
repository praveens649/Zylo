import { Coins, Gift, Check, Sparkles, Database, Ticket, Shield, Lock, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VoucherItem } from "@/api/quests.api";
import type { VoucherCategoryFilter } from "../_hooks/use-quests";

interface VoucherMarketplaceProps {
  vouchers: VoucherItem[];
  spendablePackXp: number;
  activeCategory: VoucherCategoryFilter;
  onSelectCategory: (category: VoucherCategoryFilter) => void;
  onOpenRedeemModal: (voucher: VoucherItem) => void;
  isRedeemPending: boolean;
}

export function VoucherMarketplace({
  vouchers,
  spendablePackXp,
  activeCategory,
  onSelectCategory,
  onOpenRedeemModal,
  isRedeemPending,
}: VoucherMarketplaceProps) {
  const filteredVouchers = vouchers.filter((v) => {
    if (activeCategory === "ALL") return true;
    return v.type === activeCategory;
  });

  const affordableCount = vouchers.filter((v) => spendablePackXp >= v.requiredXp && !v.isBadgeOwned).length;

  return (
    <div className="space-y-6 pt-2">
      {/* Marketplace Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Voucher Vault & Perks Shop
            </h2>
            {affordableCount > 0 && (
              <Badge className="bg-emerald-600 text-white font-bold text-xs">
                {affordableCount} Claimable Now
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Spend your accumulated Pack XP on high-speed data top-ups, pack recharge discounts, and permanent prestige badges.
          </p>
        </div>

        {/* Filter Pills with Counters */}
        <div className="flex flex-wrap gap-1.5 self-start md:self-auto">
          {(
            [
              { key: "ALL", label: "All Items", icon: Sparkles },
              { key: "DATA_MB", label: "Data Add-ons", icon: Database },
              { key: "COUPON", label: "Discounts", icon: Ticket },
              { key: "BADGE", label: "Prestige Badges", icon: Shield },
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

      {/* Voucher Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVouchers.map((voucher) => {
          const canAfford = spendablePackXp >= voucher.requiredXp;
          const isBadgeOwned = voucher.isBadgeOwned;
          const progressTowardItem = Math.min(
            100,
            Math.round((spendablePackXp / voucher.requiredXp) * 100)
          );

          return (
            <Card
              key={voucher.id}
              className={`group relative flex flex-col justify-between overflow-hidden border transition-all duration-300 ${
                isBadgeOwned
                  ? "border-border/60 bg-muted/20 opacity-80"
                  : canAfford
                  ? "border-primary/50 bg-gradient-to-b from-card via-card to-primary/[0.04] shadow-md hover:border-primary hover:shadow-lg hover:-translate-y-1"
                  : "border-border/80 bg-card hover:border-border hover:shadow-xs"
              }`}
            >
              {/* Highlight bar for affordable items */}
              {canAfford && !isBadgeOwned && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-primary to-emerald-400" />
              )}

              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      voucher.type === "DATA_MB"
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : voucher.type === "COUPON"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    {voucher.type === "DATA_MB"
                      ? "Data Boost"
                      : voucher.type === "COUPON"
                      ? "Recharge Coupon"
                      : "Prestige Flair"}
                  </Badge>

                  {/* XP Price Tag */}
                  <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-black text-amber-600 dark:text-amber-400">
                    <Coins className="h-3.5 w-3.5 text-amber-500" />
                    <span>{voucher.requiredXp.toLocaleString()} XP</span>
                  </div>
                </div>

                <CardTitle className="text-base font-extrabold mt-3 leading-snug flex items-center justify-between">
                  <span>{voucher.name}</span>
                </CardTitle>

                <CardDescription className="text-xs line-clamp-2 leading-relaxed">
                  {voucher.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {/* Reward Benefit Callout */}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                  <span className="text-muted-foreground font-medium">Yield:</span>
                  {voucher.type === "DATA_MB" && (
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">
                      +{voucher.valueMb} MB Direct to Bank
                    </span>
                  )}
                  {voucher.type === "COUPON" && voucher.discountPaise && (
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{voucher.discountPaise / 100} Off Next Pack
                    </span>
                  )}
                  {voucher.type === "BADGE" && (
                    <span className="font-extrabold text-purple-600 dark:text-purple-400">
                      Permanent Avatar Crest
                    </span>
                  )}
                </div>

                {/* Affordability Progress Bar if not yet affordable */}
                {!canAfford && !isBadgeOwned && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>XP Progress</span>
                      <span>
                        {spendablePackXp} / {voucher.requiredXp} ({progressTowardItem}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-amber-500/70"
                        style={{ width: `${progressTowardItem}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Redeem Action Button */}
                <div className="pt-1">
                  <Button
                    size="sm"
                    disabled={isBadgeOwned || !canAfford || isRedeemPending}
                    onClick={() => onOpenRedeemModal(voucher)}
                    variant={isBadgeOwned ? "secondary" : canAfford ? "default" : "outline"}
                    className={`w-full font-bold h-9 text-xs transition-all ${
                      canAfford && !isBadgeOwned
                        ? "shadow-sm hover:shadow-md"
                        : ""
                    }`}
                  >
                    {isBadgeOwned ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500" /> Already In Profile
                      </span>
                    ) : canAfford ? (
                      <span className="flex items-center gap-1.5">
                        <Gift className="h-4 w-4" /> Claim Perk
                        <ArrowUpRight className="h-3.5 w-3.5 ml-auto" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" /> Need {voucher.requiredXp - spendablePackXp} More XP
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
