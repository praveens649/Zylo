import {
  Check,
  ChevronRight,
  Database,
  Globe,
  Phone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StepSimTypeProps {
  simCategory: "PERSONAL" | "BUSINESS";
  setSimCategory: (cat: "PERSONAL" | "BUSINESS") => void;
  onNext: () => void;
}

export function StepSimType({
  simCategory,
  setSimCategory,
  onNext,
}: StepSimTypeProps) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Step 1: Choose Your SIM Type
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select your connection category to begin onboarding.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal SIM Card */}
        <div
          onClick={() => setSimCategory("PERSONAL")}
          className={`cursor-pointer rounded-2xl border p-6 transition-all relative ${
            simCategory === "PERSONAL"
              ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
              : "border-border bg-card hover:border-muted-foreground/40"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Phone className="h-6 w-6" />
            </div>
            {simCategory === "PERSONAL" && (
              <Badge className="bg-primary text-primary-foreground">Selected</Badge>
            )}
          </div>

          <h3 className="text-lg font-bold text-foreground mt-4">Personal SIM</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Designed for individuals. Includes Zylo Data Bank rollover and P2P data transfer to friends.
          </p>

          <div className="mt-4 pt-4 border-t border-border/70 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Check className="h-4 w-4 text-emerald-500" />
              <span>Instant KYC & Number selection</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span>Banks unused data up to 10 GB</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Level up with daily Data Quests</span>
            </div>
          </div>
        </div>

        {/* Business SIM Card */}
        <div className="opacity-75 rounded-2xl border border-dashed border-border bg-card/60 p-6 relative">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Globe className="h-6 w-6" />
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              Enterprise
            </Badge>
          </div>

          <h3 className="text-lg font-bold text-foreground mt-4">Business SIM</h3>
          <p className="text-xs text-muted-foreground mt-1">
            For registered organizations. Requires GST/Business certificate verification and 4-digit prefix.
          </p>

          <div className="mt-4 pt-4 border-t border-border/70 text-xs text-muted-foreground">
            <span className="italic">
              We are currently onboarding Personal SIM lines. Business SIM onboarding available in the Business portal.
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button size="lg" className="font-semibold px-6" onClick={onNext}>
          Proceed to KYC Verification
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
