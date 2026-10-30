import { CheckCircle2, CreditCard, Landmark, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import type { ParkingConfig, ParkingPeriod } from "@/api/parking.api";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/lib/format";

interface StepPaymentProps {
  number: string;
  organizationName?: string | null;
  period: ParkingPeriod;
  config: ParkingConfig | undefined;
  isPending: boolean;
  onPay: () => void;
  onBack: () => void;
}

/**
 * Step 3 — payment summary. The actual payment method (UPI / card / net
 * banking) is chosen on Stripe's hosted checkout — this only shows the
 * verified server-side amount.
 */
export function StepPayment({
  number,
  organizationName,
  period,
  config,
  isPending,
  onPay,
  onBack,
}: StepPaymentProps) {
  const fee = config?.processingFeeInr ?? 0;
  const total = period.priceInr + fee;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-sm">
      <div className="text-center">
        <h2 className="font-display text-2xl font-black text-foreground">
          Payment Details
        </h2>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {number}
          {organizationName ? ` — ${organizationName}` : ""}
        </p>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Parking Period</dt>
          <dd className="font-semibold text-foreground">
            {period.days} days
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="font-semibold text-foreground">
            {formatINR(period.priceInr)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Processing Fee</dt>
          <dd className="font-semibold text-foreground">{formatINR(fee)}</dd>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <dt className="font-bold text-foreground">Total</dt>
          <dd className="font-display text-xl font-black text-foreground">
            {formatINR(total)}
          </dd>
        </div>
      </dl>

      <div className="space-y-2.5 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3.5">
        <p className="text-xs font-semibold text-foreground">
          Pay securely on Stripe
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1">
            <Smartphone className="h-3 w-3 text-primary" /> UPI (GPay, PhonePe…)
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1">
            <CreditCard className="h-3 w-3 text-primary" /> Card
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1">
            <Landmark className="h-3 w-3 text-primary" /> Net Banking
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Parking activates only after Stripe confirms your payment.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="h-11 flex-1 rounded-xl font-semibold"
          onClick={onBack}
          disabled={isPending}
        >
          Back
        </Button>
        <Button
          className="h-11 flex-1 rounded-xl font-semibold"
          onClick={onPay}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
          )}
          Pay {formatINR(total)}
        </Button>
      </div>
    </div>
  );
}
