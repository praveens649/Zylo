"use client";

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useSignup } from "../_hooks/use-signup";
import { AvatarUpload } from "./avatar-upload";

const FIELD_INPUT =
  "h-11 rounded-lg border-input bg-background pl-10 text-foreground placeholder:text-muted-foreground transition-all focus-visible:ring-2 focus-visible:ring-ring";

/** The signup form in clean light theme. */
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
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs font-medium text-foreground">
          Full name
        </Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            className={FIELD_INPUT}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-medium text-foreground">
          Email address
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="jane@example.com"
            className={FIELD_INPUT}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-medium text-foreground">
          Password
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Minimum 10 characters"
            className={`${FIELD_INPUT} pr-11`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      <div className="space-y-1.5">
        <Label htmlFor="confirm" className="text-xs font-medium text-foreground">
          Confirm password
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repeat your password"
            className={FIELD_INPUT}
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
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {formError}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
        disabled={isBusy}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Creating account…
          </>
        ) : (
          <>
            Create account
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
}
