"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, ParkingSquare } from "lucide-react";
import type { ParkingValidation } from "@/api/parking.api";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ApiRequestError } from "@/lib/api";
import {
  useParkingCheckout,
  useParkingConfig,
  useValidateParkingNumber,
} from "../_hooks/use-parking";
import { ParkingStepper } from "./parking-stepper";
import { StepEligibility } from "./step-eligibility";
import { StepNumber } from "./step-number";
import { StepPayment } from "./step-payment";
import { StepPeriod } from "./step-period";

type Step = "enter" | "checking" | "eligible" | "period" | "payment";

const STEP_INDEX: Record<Step, number> = {
  enter: 0,
  checking: 0,
  eligible: 0,
  period: 1,
  payment: 2,
};

export function ParkingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("enter");
  const [numberInput, setNumberInput] = useState("");
  const [validation, setValidation] = useState<ParkingValidation | null>(null);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);

  const { data: config } = useParkingConfig();
  const validate = useValidateParkingNumber();
  const checkout = useParkingCheckout();

  // Return from a cancelled Stripe checkout.
  useEffect(() => {
    if (searchParams.get("cancelled")) {
      toast({
        title: "Checkout cancelled",
        description: "Your parking request was cancelled — no payment was made.",
      });
      router.replace("/parking");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectedPeriod = useMemo(
    () => config?.periods.find((p) => p.days === selectedDays) ?? null,
    [config, selectedDays]
  );

  const handleValidate = () => {
    setStep("checking");
    setValidation(null);
    validate.mutate(numberInput, {
      onSuccess: (result) => {
        console.log("Parking eligibility:", result);
        setValidation(result);
        setStep(result.eligible ? "eligible" : "checking");
        if (!result.eligible) {
          // stay on the result card — it shows the reason + retry
        }
      },
      onError: (err) => {
        setStep("enter");
        toast({
          variant: "destructive",
          title: "Validation failed",
          description:
            err instanceof ApiRequestError
              ? err.message
              : "Could not validate the number. Please try again.",
        });
      },
    });
  };

  const handlePay = () => {
    if (!validation?.number || !selectedPeriod) return;
    checkout.mutate(
      { number: validation.number, durationDays: selectedPeriod.days },
      {
        onSuccess: (res) => {
          if (res.url) {
            window.location.href = res.url;
          } else {
            toast({
              variant: "destructive",
              title: "Checkout unavailable",
              description: "Stripe did not return a checkout URL.",
            });
          }
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Could not start checkout",
            description:
              err instanceof ApiRequestError
                ? err.message
                : "Please try again in a moment.",
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-7 pb-10">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-teal-500/10 p-6 md:p-8 shadow-sm">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-2.5 py-0.5 font-semibold">
              <ParkingSquare className="h-3.5 w-3.5 mr-1" />
              Number Parking
            </Badge>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Park your Zylo number
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Keep your number safe when it&apos;s not in use — for personal
              and business SIMs alike. Park for{" "}
              {config?.periods.map((p) => `${p.days} days`).join(" or ") ??
                "15 or 30 days"}
              , extend up to {config?.maxExtensions ?? 2} times, and reactivate
              anytime from the Number Vault.
            </p>
          </div>
          <ParkingStepper current={STEP_INDEX[step]} />
        </div>
      </div>

      {/* Notice — parking is a paid reservation, plan validity is unaffected */}
      <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Parking holds your number for you while it&apos;s not in use. This
          reserves the number only — it does not extend or change any active
          plan validity.
        </p>
      </div>

      {step === "enter" && (
        <StepNumber
          value={numberInput}
          isPending={validate.isPending}
          onChange={setNumberInput}
          onContinue={handleValidate}
        />
      )}

      {step === "checking" && (
        <StepEligibility
          result={validation}
          onProceed={() => {}}
          onRetry={() => {
            setValidation(null);
            setStep("enter");
          }}
        />
      )}

      {step === "eligible" && validation && (
        <StepEligibility
          result={validation}
          onProceed={() => setStep("period")}
          onRetry={() => {
            setValidation(null);
            setStep("enter");
          }}
        />
      )}

      {step === "period" && (
        <StepPeriod
          config={config}
          selectedDays={selectedDays}
          onSelect={setSelectedDays}
          onContinue={() => setStep("payment")}
          onBack={() => setStep("eligible")}
        />
      )}

      {step === "payment" && validation?.number && selectedPeriod && (
        <StepPayment
          number={validation.number}
          organizationName={validation.organizationName}
          period={selectedPeriod}
          config={config}
          isPending={checkout.isPending}
          onPay={handlePay}
          onBack={() => setStep("period")}
        />
      )}
    </div>
  );
}

export default ParkingView;
