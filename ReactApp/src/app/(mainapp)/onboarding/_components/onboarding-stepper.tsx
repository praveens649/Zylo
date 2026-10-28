import { Check } from "lucide-react";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

const ONBOARDING_STEPS = [
  { step: 1, title: "SIM Type", desc: "Category" },
  { step: 2, title: "KYC Verification", desc: "Identity Check" },
  { step: 3, title: "Choose Number", desc: "Pick Mobile Number" },
  { step: 4, title: "Starter Plan", desc: "Select 5G Pack" },
  { step: 5, title: "Activation", desc: "Stripe & Go Live" },
] as const;

interface OnboardingStepperProps {
  currentStep: OnboardingStep;
  isActivated: boolean;
}

export function OnboardingStepper({
  currentStep,
  isActivated,
}: OnboardingStepperProps) {
  return (
    <div className="border-b border-border bg-background/50 px-4 py-4 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {ONBOARDING_STEPS.map((s) => {
            const isDone = currentStep > s.step || isActivated;
            const isCurrent = currentStep === s.step && !isActivated;
            return (
              <div
                key={s.step}
                className={`flex flex-col items-center sm:items-start p-2 rounded-lg transition-all ${
                  isCurrent
                    ? "bg-primary/10 border border-primary/30"
                    : isDone
                    ? "text-muted-foreground"
                    : "opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : s.step}
                  </span>
                  <span
                    className={`hidden sm:inline text-xs font-semibold ${
                      isCurrent ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                <span className="hidden sm:block text-[11px] text-muted-foreground truncate">
                  {s.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
