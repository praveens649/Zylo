import { CreditCard, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhoneNumber } from "@/api/numbers.api";
import { StarterPlan } from "@/api/onboarding.api";

interface StepPaymentActivationProps {
  selectedNumber: PhoneNumber | null;
  selectedPlan: StarterPlan | null;
  isActivating: boolean;
  onBack: () => void;
  onActivate: () => void;
}

export function StepPaymentActivation({
  selectedNumber,
  selectedPlan,
  isActivating,
  onBack,
  onActivate,
}: StepPaymentActivationProps) {
  const planPrice = Number(selectedPlan?.price || 0);
  const numberPrice = Number(selectedNumber?.price || 0);
  const totalAmount = planPrice + numberPrice;

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Step 5: Review & Activate Connection
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your order details and complete payment via Stripe test mode to activate your SIM.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm p-6">
        <h3 className="text-base font-bold text-foreground mb-4">
          Order Summary
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border/70">
            <span className="text-muted-foreground">SIM Category & Type</span>
            <span className="font-semibold text-foreground">
              Personal (Physical SIM)
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/70">
            <span className="text-muted-foreground">Allocated Mobile Number</span>
            <span className="font-mono font-bold text-primary">
              {selectedNumber?.number}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/70">
            <span className="text-muted-foreground">Mobile Plan</span>
            <span className="font-semibold text-foreground">
              {selectedPlan?.name} ({selectedPlan?.validityDays} Days)
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/70">
            <span className="text-muted-foreground">Plan Charge</span>
            <span className="font-semibold text-foreground">
              ₹{planPrice}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/70">
            <span className="text-muted-foreground">SIM Card & Delivery</span>
            <span className="font-semibold text-emerald-600">FREE (₹0)</span>
          </div>

          {numberPrice > 0 && (
            <div className="flex justify-between py-2 border-b border-border/70">
              <span className="text-muted-foreground">VIP Number Charge</span>
              <span className="font-semibold text-foreground">
                ₹{numberPrice}
              </span>
            </div>
          )}

          <div className="flex justify-between pt-3 text-base font-bold text-foreground">
            <span>Total Amount Due</span>
            <span className="text-primary text-xl">
              ₹{totalAmount}
            </span>
          </div>
        </div>

        {/* Stripe Payment Simulator Notice */}
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground block mb-0.5">
              Stripe Test Payment Integration
            </span>
            This transaction is processed in Stripe test simulation mode. Upon payment authorization, your SIM line, Data Bank account, and 5G plan will be provisioned immediately.
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isActivating}
          >
            Back
          </Button>

          <Button
            size="lg"
            className="font-semibold px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
            onClick={onActivate}
            disabled={isActivating}
          >
            {isActivating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Authorizing Payment & Activating…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Pay ₹{totalAmount} & Activate SIM
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
