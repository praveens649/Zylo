import { CalendarClock } from "lucide-react";
import type { ParkingConfig } from "@/api/parking.api";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StepPeriodProps {
  config: ParkingConfig | undefined;
  selectedDays: number | null;
  onSelect: (days: number) => void;
  onContinue: () => void;
  onBack: () => void;
}

/** Step 2 — choose one of the configured parking durations. */
export function StepPeriod({
  config,
  selectedDays,
  onSelect,
  onContinue,
  onBack,
}: StepPeriodProps) {
  const periods = config?.periods ?? [];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-sm">
      <div className="text-center">
        <h2 className="font-display text-2xl font-black text-foreground">
          Select Parking Period
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how long to park this number.
        </p>
      </div>

      <div
        className="flex flex-col gap-3"
        role="radiogroup"
        aria-label="Parking period"
      >
        {periods.map((period) => {
          const selected = period.days === selectedDays;
          return (
            <button
              key={period.days}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(period.days)}
              className={cn(
                "flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border/70 bg-muted/20 hover:border-primary/40"
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2",
                    selected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40"
                  )}
                >
                  {selected && (
                    <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                  )}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {period.days} days
                </span>
              </span>
              <span className="font-display text-lg font-black text-foreground">
                {formatINR(period.priceInr)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
        <CalendarClock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          You can extend this parking up to{" "}
          <span className="font-semibold text-foreground">
            {config?.maxExtensions ?? 2} times
          </span>{" "}
          ({periods.map((p) => `${p.days} days`).join(" or ")} each) from your
          Number Vault.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="h-11 flex-1 rounded-xl font-semibold"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          className="h-11 flex-1 rounded-xl font-semibold"
          disabled={!selectedDays}
          onClick={onContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
