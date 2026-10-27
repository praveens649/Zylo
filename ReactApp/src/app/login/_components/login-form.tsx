"use client";

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useLogin } from "../_hooks/use-login";

const FIELD_INPUT =
  "h-11 rounded-md border-[#262626] bg-[#111111] pl-10 text-white placeholder:text-neutral-600 transition-all focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400/30";

/** The login form — email/password fields, error banner, submit. */
export function LoginForm() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    formError,
    isSubmitting,
    handleSubmit,
  } = useLogin();

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
          Email address
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={FIELD_INPUT}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
          Password
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            className={`${FIELD_INPUT} pr-11`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-500 transition-colors hover:bg-white/10 hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {formError && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
          {formError}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full rounded-md border-0 bg-violet-400 text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_28px_-6px_rgba(139,92,246,0.6)] transition-all duration-300 hover:bg-violet-300 hover:shadow-[0_0_36px_-4px_rgba(139,92,246,0.8)]"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
