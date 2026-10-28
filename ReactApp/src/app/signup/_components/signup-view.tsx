import Link from "next/link";
import { Zap } from "lucide-react";

import { AuthBrandPanel } from "@/app/_components/auth-brand-panel";
import { FEATURES } from "../_lib/constants";
import { SignupForm } from "./signup-form";

/** Full signup screen highlighting Zylo SIM registration. */
export function SignupView() {
  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      <AuthBrandPanel
        headline="Join the Zylo Network."
        subtitle="Get a new SIM, bank unused data automatically, share data with friends, and enjoy gamified telecom rewards."
        features={FEATURES}
      />

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile brand mark */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                Zylo
              </span>
              <span className="text-[11px] text-muted-foreground">Smart Mobile Network</span>
            </div>
          </div>

          {/* Clean light card */}
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Create Zylo Account
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Register to pick your SIM, choose a mobile number, and activate your plan
              </p>
            </div>

            <SignupForm />

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
