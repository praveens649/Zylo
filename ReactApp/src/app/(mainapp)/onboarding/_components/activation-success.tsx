import { CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ActivationData {
  simId: string;
  phoneNumber: string;
  planName: string;
  validityDays: number;
  simTechnology: string;
  orderId: string;
  dataBankBalanceMb: number;
  organizationName?: string | null;
}

interface ActivationSuccessProps {
  data: ActivationData;
  onGoToDashboard: () => void;
}

export function ActivationSuccess({
  data,
  onGoToDashboard,
}: ActivationSuccessProps) {
  return (
    <Card className="border-emerald-500/40 bg-card shadow-lg text-center p-6 sm:p-10 animate-fade-up">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-6">
        <CheckCircle2 className="h-10 w-10" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
        Welcome to the Zylo Network!
      </h2>
      <p className="mt-2 text-muted-foreground max-w-md mx-auto text-sm">
        {data.organizationName
          ? `Your new Business SIM line for ${data.organizationName} has been verified and activated with all benefits provisioned.`
          : "Your new Personal SIM line has been verified and activated with all benefits provisioned."}
      </p>

      <div className="my-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <span className="text-xs text-muted-foreground uppercase font-semibold">
            Mobile Number
          </span>
          <p className="text-lg font-bold text-foreground mt-1 font-mono">
            {data.phoneNumber}
          </p>
          <Badge variant="secondary" className="mt-2 text-[10px]">
            {data.simTechnology} SIM
          </Badge>
        </div>

        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <span className="text-xs text-muted-foreground uppercase font-semibold">
            Active Plan
          </span>
          <p className="text-lg font-bold text-foreground mt-1">
            {data.planName}
          </p>
          <span className="text-xs text-emerald-600 font-medium mt-2 block">
            {data.validityDays} Days Validity
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <span className="text-xs text-muted-foreground uppercase font-semibold">
            Data Bank Balance
          </span>
          <p className="text-lg font-bold text-foreground mt-1">
            {data.dataBankBalanceMb} MB
          </p>
          <span className="text-[11px] text-muted-foreground mt-2 block">
            Unused data banks automatically tonight
          </span>
        </div>
      </div>

      <Button
        size="lg"
        className="px-8 h-12 font-semibold text-base"
        onClick={onGoToDashboard}
      >
        Go to My Zylo Dashboard
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </Card>
  );
}
