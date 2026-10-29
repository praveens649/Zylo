import { Coins, Gift, Check } from "lucide-react";
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

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Reward Voucher Store</h2>
          <p className="text-sm text-muted-foreground">
            Spend your accumulated Pack XP on high-value data, recharge discounts, and permanent prestige badges.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 self-start md:self-auto">
          {(
            [
              { key: "ALL", label: "All Rewards" },
              { key: "DATA_MB", label: "Data Add-ons" },
              { key: "COUPON", label: "Recharge Discounts" },
              { key: "BADGE", label: "Profile Badges" },
            ] as const
          ).map((filter) => (
            <Button
              key={filter.key}
              variant={activeCategory === filter.key ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectCategory(filter.key)}
              className="h-8 text-xs"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Voucher Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVouchers.map((voucher) => {
          const canAfford = spendablePackXp >= voucher.requiredXp;
          const isBadgeOwned = voucher.isBadgeOwned;

          return (
            <Card
              key={voucher.id}
              className="flex flex-col justify-between border-border/70 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                    {voucher.type === "DATA_MB"
                      ? "Data Boost"
                      : voucher.type === "COUPON"
                      ? "Recharge Discount"
                      : "Profile Flair"}
                  </Badge>
                  <div className="flex items-center gap-1 font-bold text-amber-500 text-sm">
                    <Coins className="h-4 w-4" />
                    <span>{voucher.requiredXp} XP</span>
                  </div>
                </div>
                <CardTitle className="text-base font-bold mt-2 flex items-center gap-2">
                  {voucher.name}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-3">
                  {voucher.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-3">
                  <div className="text-xs">
                    {voucher.type === "DATA_MB" && (
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        +{voucher.valueMb} MB to Data Bank
                      </span>
                    )}
                    {voucher.type === "COUPON" && voucher.discountPaise && (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{voucher.discountPaise / 100} Off Next Pack
                      </span>
                    )}
                    {voucher.type === "BADGE" && (
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        Permanent Cosmetic
                      </span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    disabled={isBadgeOwned || !canAfford || isRedeemPending}
                    onClick={() => onOpenRedeemModal(voucher)}
                    variant={isBadgeOwned ? "secondary" : canAfford ? "default" : "outline"}
                    className="h-8 gap-1 text-xs"
                  >
                    {isBadgeOwned ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Owned
                      </>
                    ) : canAfford ? (
                      <>
                        <Gift className="h-3.5 w-3.5" /> Redeem
                      </>
                    ) : (
                      `Need ${voucher.requiredXp - spendablePackXp} XP`
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
