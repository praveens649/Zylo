"use client";

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useSignup } from "../_hooks/use-signup";
import { AvatarUpload } from "./avatar-upload";

/** The signup form — fields, avatar upload, error + submit. */
export function SignupForm() {
  const {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirm,
    setConfirm,
    showPassword,
    setShowPassword,
    image,
    setImage,
    isUploadingImage,
    formError,
    fileInputRef,
    isBusy,
    isSubmitting,
    handleSubmit,
    handleFileUpload,
  } = useSignup();

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
          Full name
        </Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            className="h-11 rounded-md border-[#262626] bg-[#111111] pl-10 text-white placeholder:text-neutral-600 transition-all focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400/30"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

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
            className="h-11 rounded-md border-[#262626] bg-[#111111] pl-10 text-white placeholder:text-neutral-600 transition-all focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400/30"
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
            autoComplete="new-password"
            placeholder="Minimum 10 characters"
            className="h-11 rounded-md border-[#262626] bg-[#111111] pl-10 pr-11 text-white placeholder:text-neutral-600 transition-all focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400/30"
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

      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
          Confirm password
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
          <Input
            id="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repeat your password"
            className="h-11 rounded-md border-[#262626] bg-[#111111] pl-10 text-white placeholder:text-neutral-600 transition-all focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400/30"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <AvatarUpload
        image={image}
        name={name}
        isUploading={isUploadingImage}
        isBusy={isBusy}
        fileInputRef={fileInputRef}
        onFileChange={handleFileUpload}
        onRemove={() => setImage("")}
      />

      {formError && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
          {formError}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full rounded-md border-0 bg-violet-400 text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_28px_-6px_rgba(139,92,246,0.6)] transition-all duration-300 hover:bg-violet-300 hover:shadow-[0_0_36px_-4px_rgba(139,92,246,0.8)]"
        disabled={isBusy}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          <>
            Create account
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
