import Link from "next/link";
import { Layers } from "lucide-react";

import { AuthBrandPanel } from "@/app/_components/auth-brand-panel";
import { FEATURES } from "../_lib/constants";
import { LoginForm } from "./login-form";

const CORNER = "pointer-events-none absolute h-4 w-4 border-violet-400/70";

/** Full login screen — HUD-style esports layout. */
export function LoginView() {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Faint diagonal texture across the whole page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent_0_10px,rgba(139,92,246,0.02)_10px_20px)]"
      />

      <AuthBrandPanel
        headline={
          <>
            Level up
            <br />
            your <span className="text-violet-400">game.</span>
          </>
        }
        subtitle="Book stations, explore games, and unlock exclusive member benefits — all in one place."
        features={FEATURES}
      />

      {/* Form panel */}
      <main className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile brand mark */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-400 text-black">
              <Layers className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              DoodleBlue
            </span>
          </div>

          {/* HUD card with corner brackets */}
          <div className="relative border border-white/10 bg-[#0b0b0b]/90 p-8 backdrop-blur-xl sm:p-10">
            <span aria-hidden className={`${CORNER} -left-px -top-px border-l-2 border-t-2`} />
            <span aria-hidden className={`${CORNER} -right-px -top-px border-r-2 border-t-2`} />
            <span aria-hidden className={`${CORNER} -bottom-px -left-px border-b-2 border-l-2`} />
            <span aria-hidden className={`${CORNER} -bottom-px -right-px border-b-2 border-r-2`} />

            {/* Header row */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-400 text-black shadow-[0_0_20px_-4px_rgba(139,92,246,0.7)]">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="font-display text-sm font-bold uppercase tracking-widest">
                  DoodleBlue
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-violet-400/80">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                Online
              </div>
            </div>

            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-500/80">
                {"// Secure login"}
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight">
                Welcome back
              </h2>
              <p className="mt-2 text-xs text-neutral-500">
                Sign in to your account to continue
              </p>
            </div>

            <LoginForm />

            <p className="mt-8 text-center text-xs text-neutral-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-violet-400 transition-colors hover:text-violet-300"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
