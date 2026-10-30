import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepNumberProps {
  value: string;
  error?: string | null;
  isPending: boolean;
  onChange: (v: string) => void;
  onContinue: () => void;
}

/** Step 1 — the customer types the mobile number they want to park. */
export function StepNumber({
  value,
  error,
  isPending,
  onChange,
  onContinue,
}: StepNumberProps) {
  const canSubmit = value.replace(/\D/g, "").length >= 10 && !isPending;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-border/60 bg-card/80 p-8 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <span className="font-display text-lg font-black">Z</span>
      </div>

      <div>
        <h2 className="font-display text-2xl font-black text-foreground">
          Enter Number
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the mobile number you want to park.
        </p>
      </div>

      <div className="w-full space-y-2 text-left">
        <Label htmlFor="parking-number" className="sr-only">
          Mobile number
        </Label>
        <Input
          id="parking-number"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && onContinue()}
          className="h-12 rounded-xl text-center font-mono text-base tracking-wide"
          aria-invalid={!!error}
          disabled={isPending}
        />
        {error && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>

      <Button
        className="h-11 w-full rounded-xl font-semibold"
        disabled={!canSubmit}
        onClick={onContinue}
      >
        {isPending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : null}
        Continue
        {!isPending && <ArrowRight className="ml-1.5 h-4 w-4" />}
      </Button>
    </div>
  );
}
