import {
  Calendar,
  Gift,
  Loader2,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import type { Plan } from "@/api/plans.api";
import type { RechargeCoupon, RechargeSim } from "@/api/recharge.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatINR } from "@/lib/format";

interface RechargeConfirmDialogProps {
  plan: Plan | null;
  sim: RechargeSim | null;
  giftFor?: { name: string; number: string } | null;
  coupons: RechargeCoupon[];
  couponCode: string;
  onCouponChange: (code: string) => void;
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function RechargeConfirmDialog({
  plan,
  sim,
  giftFor,
  coupons,
  couponCode,
  onCouponChange,
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: RechargeConfirmDialogProps) {
  const planPaise = plan ? Math.round(Number(plan.price) * 100) : 0;
  const coupon = coupons.find((c) => c.code === couponCode) ?? null;
  // Eligible coupons only — the server re-validates this rule anyway.
  const eligibleCoupons = coupons.filter(
    (c) => planPaise >= (c.minPurchasePaise ?? c.discountPaise)
  );
  const discountPaise = coupon ? coupon.discountPaise : 0;
  const payablePaise = planPaise - discountPaise;
  // The server only returns live plans, so a currentPlan or any queued
  // subscription means this recharge stacks behind existing validity.
  const queueTail =
    sim?.upcomingPlans?.[sim.upcomingPlans.length - 1]?.endDate ??
    sim?.currentPlan?.endDate ??
    null;
  const startsOn = queueTail != null ? new Date(queueTail) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Confirm Recharge
          </DialogTitle>
          <DialogDescription>
            You&apos;ll be redirected to Stripe&apos;s secure checkout to
            complete this payment.
          </DialogDescription>
        </DialogHeader>

        {plan && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {plan.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {plan.validityDays} days validity
                </p>
              </div>
              <span className="font-display text-xl font-black text-foreground">
                {formatINR(plan.price)}
              </span>
            </div>

            {coupons.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Select value={couponCode || "none"} onValueChange={(v) => onCouponChange(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Apply a coupon (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No coupon</SelectItem>
                    {eligibleCoupons.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} — {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {coupons.length > eligibleCoupons.length && (
                  <p className="text-[11px] text-muted-foreground">
                    Some coupons need a higher-value plan and are hidden.
                  </p>
                )}
              </div>
            )}

            {discountPaise > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">
                  Coupon {couponCode} ({coupon?.name})
                </span>
                <span className="font-semibold text-emerald-600">
                  −{formatINR(discountPaise / 100)}
                </span>
              </div>
            )}

            {giftFor ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
                <Gift className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">Gift recharge for</span>
                <span className="font-semibold text-foreground">
                  {giftFor.name} ({giftFor.number})
                </span>
              </div>
            ) : sim ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm">
                <Smartphone className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">
                  Recharging Zylo number
                </span>
                <span className="font-semibold text-foreground">
                  {sim.number}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm">
                <Smartphone className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">
                  A new Zylo number will be assigned to you
                </span>
              </div>
            )}

            {startsOn ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-4 py-2.5 text-xs text-muted-foreground">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                <span>
                  You already have an active plan — this recharge will be{" "}
                  <span className="font-semibold text-foreground">
                    queued and start on {formatDate(startsOn.toISOString())}
                  </span>
                  , right after your current validity ends. No days are lost.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-2.5 text-xs text-muted-foreground">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  This plan will be activated{" "}
                  <span className="font-semibold text-foreground">
                    immediately
                  </span>{" "}
                  after payment succeeds.
                </span>
              </div>
            )}

            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Secure payment via Stripe (test mode)
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending || !plan}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-1.5" />
            )}
            Pay {plan ? formatINR(payablePaise / 100) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
