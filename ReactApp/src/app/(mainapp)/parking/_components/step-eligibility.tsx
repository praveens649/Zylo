import {
  Building2,
  CheckCircle2,
  CircleX,
  Loader2,
  ScanSearch,
} from "lucide-react";
import type { ParkingValidation } from "@/api/parking.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

interface StepEligibilityProps {
  /** Null while the validation request is still in flight. */
  result: ParkingValidation | null;
  onProceed: () => void;
  onRetry: () => void;
}

/**
 * Step 1b — "checking" state, then the eligible/ineligible verdict.
 * Mirrors the reference design's green-check success card.
 */
export function StepEligibility({
  result,
  onProceed,
  onRetry,
}: StepEligibilityProps) {
  if (!result) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-border/60 bg-card/80 p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ScanSearch className="h-8 w-8 animate-pulse" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-black text-foreground">
            Check Eligibility
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We are checking if this number is eligible for parking.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking with Zylo…
        </div>
      </div>
    );
  }

  if (!result.eligible) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-destructive/30 bg-card/80 p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <CircleX className="h-9 w-9" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-black text-foreground">
            Number can&apos;t be parked
          </h2>
          {result.number && (
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {result.number}
            </p>
          )}
          <p role="alert" className="mt-3 text-sm text-destructive">
            {result.reason ?? "This number is not eligible for parking."}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 w-full rounded-xl font-semibold"
          onClick={onRetry}
        >
          Check a different number
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-emerald-500/30 bg-card/80 p-8 text-center shadow-sm">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <CheckCircle2 className="h-9 w-9" />
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">
          Number is Eligible for Parking
        </h2>
        <p className="mt-2 font-mono text-base font-semibold text-foreground">
          {result.number}
        </p>
        {result.organizationName && (
          <Badge className="mt-2 gap-1.5 border-primary/30 bg-primary/10 text-primary">
            <Building2 className="h-3 w-3" />
            {result.organizationName}
          </Badge>
        )}
        {result.plan?.status === "EXPIRED" && (
          <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            {result.plan.name ?? "Your plan"} expired
            {result.plan.endsAt
              ? ` on ${formatDate(result.plan.endsAt)}`
              : ""}{" "}
            — parking keeps your number safe.
          </p>
        )}
        {result.plan?.status === "ACTIVE" && (
          <Badge className="mt-2 gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {result.plan.name ?? "Plan"} active until{" "}
            {formatDate(result.plan.endsAt)}
          </Badge>
        )}
      </div>

      <ul className="w-full space-y-2.5 text-left">
        {result.checks.map((check) => (
          <li
            key={check.label}
            className="flex items-center gap-2.5 text-sm text-foreground"
          >
            <CheckCircle2
              className={`h-4.5 w-4.5 shrink-0 ${
                check.passed ? "text-emerald-500" : "text-muted-foreground/40"
              }`}
            />
            {check.label}
          </li>
        ))}
      </ul>

      {result.simulated && (
        <p className="text-[11px] text-muted-foreground">
          Demo mode — eligibility is checked against your Zylo account, not a
          live carrier network.
        </p>
      )}

      <Button
        className="h-11 w-full rounded-xl font-semibold"
        onClick={onProceed}
      >
        Proceed
      </Button>
    </div>
  );
}
