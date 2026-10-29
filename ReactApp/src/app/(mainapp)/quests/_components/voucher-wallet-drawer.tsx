import { Copy, Check, Sparkles, Ticket, Database, ShieldCheck, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RedemptionRecord } from "@/api/quests.api";
import { getBadge } from "@/lib/badges";

interface VoucherWalletDrawerProps {
  redemptions: RedemptionRecord[];
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
}

export function VoucherWalletDrawer({
  redemptions,
  copiedCode,
  onCopyCode,
}: VoucherWalletDrawerProps) {
  if (!redemptions || redemptions.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-border/60">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight">
              Adventurer's Inventory & Claimed Loot
            </h2>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-bold">
              {redemptions.length} Unlocked
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            All bonus data bank deposits, recharge promo codes, and profile insignias unlocked in your quest journey.
          </p>
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {redemptions.map((redemption) => {
          const isCoupon = !!redemption.couponCode;
          const isData = !!redemption.valueMb;
          const badge = redemption.badgeCode ? getBadge(redemption.badgeCode) : null;

          return (
            <div
              key={redemption.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card to-muted/20 p-4 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold overflow-hidden ${
                      badge
                        ? `border-2 ${badge.borderColor} p-0.5 bg-card`
                        : isCoupon
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                        : "bg-blue-500/10 text-blue-600 border border-blue-500/30"
                    }`}
                  >
                    {badge ? (
                      <img src={badge.image} alt={badge.name} className="h-full w-full rounded-lg object-cover" />
                    ) : isCoupon ? (
                      <Ticket className="h-4 w-4" />
                    ) : (
                      <Database className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground line-clamp-1">
                      {redemption.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Claimed on{" "}
                      {new Date(redemption.redeemedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold bg-secondary/80"
                >
                  {isCoupon ? "Promo Code" : isData ? "Data Bank" : "Cosmetic"}
                </Badge>
              </div>

              {/* Middle Section: Coupon Code box OR status banner */}
              <div className="mt-3.5 border-t border-border/50 pt-2.5">
                {isCoupon ? (
                  <div className="flex items-center justify-between rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] p-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Promo Code
                      </span>
                      <p className="font-mono text-xs font-black tracking-wider text-primary">
                        {redemption.couponCode}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onCopyCode(redemption.couponCode!)}
                      className="flex items-center gap-1 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-xs font-bold text-foreground hover:bg-accent shadow-2xs transition-all active:scale-95"
                    >
                      {copiedCode === redemption.couponCode ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : isData ? (
                  <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-500/10 rounded-xl px-3 py-2 border border-blue-500/20">
                    <span>+{redemption.valueMb} MB Added</span>
                    <span className="text-[11px] text-muted-foreground">Auto-deposited</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/10 rounded-xl px-3 py-2 border border-purple-500/20">
                    <span>Badge Active</span>
                    <span className="text-[11px] text-muted-foreground">Profile Crest</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
