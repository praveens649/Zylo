import { Gift, Coins, Sparkles, Check, Database, Ticket, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VoucherItem } from "@/api/quests.api";
import { getBadge } from "@/lib/badges";
import { getItemRarity, RARITY_CONFIG } from "./voucher-marketplace";

interface RedeemVoucherModalProps {
  voucher: VoucherItem | null;
  spendablePackXp: number;
  onClose: () => void;
  onConfirmRedeem: (voucherId: string) => void;
  isRedeemPending: boolean;
}

export function RedeemVoucherModal({
  voucher,
  spendablePackXp,
  onClose,
  onConfirmRedeem,
  isRedeemPending,
}: RedeemVoucherModalProps) {
  if (!voucher) return null;

  const remainingXp = spendablePackXp - voucher.requiredXp;
  const badgeDef = voucher.badgeCode ? getBadge(voucher.badgeCode) : null;
  const rarity = getItemRarity(voucher);
  const rarityCfg = RARITY_CONFIG[rarity];

  return (
    <Dialog open={!!voucher} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-border/80 bg-card overflow-hidden">
        {/* Ambient Top Glow matching item rarity */}
        <div
          className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-primary to-emerald-400`}
        />

        <DialogHeader className="pt-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={`text-[10px] font-black uppercase ${rarityCfg.badgeClass}`}>
              {rarityCfg.label}
            </Badge>

            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-black text-amber-600 dark:text-amber-400">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span>{voucher.requiredXp.toLocaleString()} XP</span>
            </div>
          </div>

          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-black mt-2">
            <Gift className="h-5 w-5 text-amber-500" />
            Claim Vault Reward
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Confirm exchanging your spendable Pack XP for this high-value telecom perk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Visual Showcase Card */}
          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-muted/40 via-muted/20 to-transparent p-4 flex flex-col items-center text-center">
            {badgeDef ? (
              <div
                className={`relative h-20 w-20 overflow-hidden rounded-full border-3 ${badgeDef.borderColor} p-1 bg-card shadow-lg mb-3 ${badgeDef.glowColor}`}
              >
                <img
                  src={badgeDef.image}
                  alt={badgeDef.name}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            ) : voucher.type === "DATA_MB" ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 via-cyan-500/15 to-transparent border border-blue-500/40 text-blue-500 shadow-md mb-2">
                <Database className="h-8 w-8 animate-pulse" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent border border-emerald-500/40 text-emerald-500 shadow-md mb-2">
                <Ticket className="h-8 w-8" />
              </div>
            )}

            <h4 className="text-base font-black text-foreground">{voucher.name}</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">{voucher.description}</p>

            {/* Yield Benefit Tag */}
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 py-1.5 text-xs font-bold">
              {voucher.type === "DATA_MB" && (
                <span className="text-blue-600 dark:text-blue-400">
                  Instant +{voucher.valueMb} MB Direct Credit to Data Bank
                </span>
              )}
              {voucher.type === "COUPON" && voucher.discountPaise && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  ₹{voucher.discountPaise / 100} Off Next Plan Recharge Coupon
                </span>
              )}
              {voucher.type === "BADGE" && (
                <span className="text-purple-600 dark:text-purple-400">
                  Permanent Profile Medallion & Avatar Flair
                </span>
              )}
            </div>
          </div>

          {/* Gamified Transaction Ledger */}
          <div className="space-y-2 rounded-2xl border border-border/70 bg-card/60 p-3.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              XP Ledger Breakdown
            </span>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Current Available XP:</span>
              <span className="font-bold text-foreground">{spendablePackXp.toLocaleString()} XP</span>
            </div>
            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-bold">
              <span>Perk Cost:</span>
              <span>-{voucher.requiredXp.toLocaleString()} XP</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex justify-between items-center font-extrabold">
              <span className="text-foreground">Remaining Spendable Balance:</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                {remainingXp.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={isRedeemPending} className="font-bold text-xs">
            Cancel
          </Button>
          <Button
            onClick={() => onConfirmRedeem(voucher.id)}
            disabled={isRedeemPending}
            className="gap-2 font-black text-xs bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-black hover:opacity-90 shadow-sm"
          >
            {isRedeemPending ? (
              <span>Redeeming Perk...</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Confirm & Claim Reward
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
