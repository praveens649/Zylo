import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VoucherItem } from "@/api/quests.api";

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

  return (
    <Dialog open={!!voucher} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Redeem Voucher
          </DialogTitle>
          <DialogDescription>
            Confirm spending your pack XP on this reward.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
            <p className="font-semibold text-sm">{voucher.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{voucher.description}</p>
          </div>

          {/* XP Math Breakdown */}
          <div className="space-y-2 rounded-xl border border-border/60 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Available XP:</span>
              <span className="font-medium text-foreground">{spendablePackXp} XP</span>
            </div>
            <div className="flex justify-between text-destructive">
              <span>Voucher Cost:</span>
              <span>-{voucher.requiredXp} XP</span>
            </div>
            <div className="border-t border-border/50 pt-1.5 flex justify-between font-semibold">
              <span>Remaining Spendable XP:</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {remainingXp} XP
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isRedeemPending}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirmRedeem(voucher.id)}
            disabled={isRedeemPending}
            className="gap-2"
          >
            {isRedeemPending ? "Redeeming..." : "Confirm & Spend XP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
