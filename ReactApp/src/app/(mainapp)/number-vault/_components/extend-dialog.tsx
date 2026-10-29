import { useState } from "react";
import { CalendarPlus, Loader2, ShieldCheck } from "lucide-react";
import type { ParkingConfig, VaultParking } from "@/api/parking.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ExtendDialogProps {
  parking: VaultParking | null;
  config: ParkingConfig | undefined;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (parkingId: string, durationDays: number) => void;
}

/** Paid extension checkout — same configured periods as initial parking. */
export function ExtendDialog({
  parking,
  config,
  isPending,
  onOpenChange,
  onConfirm,
}: ExtendDialogProps) {
  const [days, setDays] = useState<number | null>(null);
  const period =
    config?.periods.find((p) => p.days === days) ?? config?.periods[0] ?? null;
  const remaining = parking
    ? parking.maxExtensions - parking.extensionsUsed
    : 0;

  return (
    <Dialog
      open={!!parking}
      onOpenChange={(open) => {
        if (!open) setDays(null);
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Extend Parking
          </DialogTitle>
          <DialogDescription>
            {parking?.number} —{" "}
            {remaining > 0
              ? `${remaining} extension${remaining === 1 ? "" : "s"} remaining.`
              : "No extensions remaining."}
          </DialogDescription>
        </DialogHeader>

        {parking && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Current expiry</span>
              <span className="font-semibold text-foreground">
                {formatDate(parking.expiresAt)}
              </span>
            </div>

            <div
              className="flex flex-col gap-2.5"
              role="radiogroup"
              aria-label="Extension period"
            >
              {(config?.periods ?? []).map((p) => {
                const selected = p.days === (days ?? period?.days);
                return (
                  <button
                    key={p.days}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDays(p.days)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border/70 hover:border-primary/40"
                    )}
                  >
                    <span className="font-semibold text-foreground">
                      +{p.days} days
                    </span>
                    <span className="font-bold text-foreground">
                      {formatINR(p.priceInr + (config?.processingFeeInr ?? 0))}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              The extension applies only after Stripe confirms the payment.
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
          <Button
            onClick={() =>
              parking && period && onConfirm(parking.id, period.days)
            }
            disabled={isPending || !parking || !period}
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="mr-1.5 h-4 w-4" />
            )}
            Pay {period ? formatINR(period.priceInr + (config?.processingFeeInr ?? 0)) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
