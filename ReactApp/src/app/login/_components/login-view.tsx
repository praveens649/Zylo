import Link from "next/link";
import { Layers } from "lucide-react";

import { AuthBrandPanel } from "@/app/_components/auth-brand-panel";
import { FEATURES } from "../_lib/constants";
import { LoginForm } from "./login-form";

/** Full login screen in clean, modern light theme. */
export function LoginView() {
  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      <AuthBrandPanel
        headline="Welcome to DoodleBlue Console"
        subtitle="Manage user accounts, review billing history, and configure organizational settings."
        features={FEATURES}
      />

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile brand mark */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              DoodleBlue
            </span>
          </div>

          {/* Clean light card */}
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Sign in
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your credentials to access your account
              </p>
            </div>

            <LoginForm />

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
