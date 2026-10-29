import { Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RedemptionRecord } from "@/api/quests.api";

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
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">My Redeemed Vouchers & Rewards</h2>
          <p className="text-xs text-muted-foreground">
            Active coupons and benefits unlocked during your quest journey.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {redemptions.map((redemption) => (
          <div
            key={redemption.id}
            className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 shadow-xs"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-semibold">{redemption.name}</p>
              {redemption.couponCode ? (
                <div className="flex items-center gap-1.5">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-bold text-primary">
                    {redemption.couponCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => onCopyCode(redemption.couponCode!)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Copy code"
                  >
                    {copiedCode === redemption.couponCode ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ) : redemption.valueMb ? (
                <p className="text-[11px] text-emerald-600 font-medium">Credited to Data Bank</p>
              ) : (
                <p className="text-[11px] text-indigo-600 font-medium">Active on Profile</p>
              )}
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Redeemed
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
