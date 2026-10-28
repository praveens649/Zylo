import { ShieldCheck, Zap } from "lucide-react";
import { LogoutButton } from "@/components/ui/logout-button";

export function OnboardingHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display font-bold tracking-tight text-base leading-none">
            Zylo
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            SIM Onboarding Portal
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 ">
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="flex-1 text-nowrap ">DoT Compliant Verification</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
