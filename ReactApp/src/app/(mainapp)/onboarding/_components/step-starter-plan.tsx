import { Check, ChevronRight, Database, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarterPlan } from "@/api/onboarding.api";

interface StepStarterPlanProps {
  plans: StarterPlan[] | undefined;
  isLoading: boolean;
  selectedPlan: StarterPlan | null;
  onSelectPlanId: (planId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepStarterPlan({
  plans,
  isLoading,
  selectedPlan,
  onSelectPlanId,
  onBack,
  onNext,
}: StepStarterPlanProps) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Step 4: Choose Your Starter Mobile Plan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All Zylo starter plans include unlimited voice calling, high-speed 5G, and automated Data Bank saving.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans?.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => onSelectPlanId(plan.id)}
                className={`cursor-pointer rounded-2xl border p-6 flex flex-col justify-between transition-all relative ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary shadow-md"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {plan.isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground font-semibold shadow-sm">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-foreground">
                      {plan.name}
                    </span>
                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">
                      ₹{plan.price}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      / {plan.validityDays} Days
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-border/70 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{plan.dataAllowanceGb} GB Total High-Speed</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{plan.callingBenefit}</span>
                    </div>
                    {plan.dataBankEnabled && (
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <Database className="h-3.5 w-3.5" />
                        <span>Data Bank Rollover Active</span>
                      </div>
                    )}
                    {plan.dataTransferEnabled && (
                      <div className="flex items-center gap-2 text-indigo-500 font-medium">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>P2P Data Transfer Active</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-2">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className="w-full font-semibold"
                    size="sm"
                  >
                    {isSelected ? "Plan Selected" : "Select Plan"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>

        <Button
          size="lg"
          className="font-semibold px-6"
          disabled={!selectedPlan}
          onClick={onNext}
        >
          Proceed to Checkout
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
