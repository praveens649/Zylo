"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

import { authService, AUTH_ME_KEY } from "@/api/auth.api";
import { ApiRequestError, authToken } from "@/lib/api";

export function useSignup() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const signupMutation = useMutation({
    mutationFn: () => authService.signUp(email.trim(), password),
    onSuccess: ({ user, token }) => {
      authToken.set(token);
      queryClient.setQueryData(AUTH_ME_KEY, { user });
      setFormError(null);

      toast({
        title: "Welcome to Zylo!",
        description: "Your account has been created. Next step: KYC & SIM selection.",
      });

      router.replace("/");
    },
    onError: (error) => {
      if (error instanceof ApiRequestError) {
        if (error.code === "EMAIL_IN_USE") {
          setFormError("An account with this email already exists.");
        } else if (error.code === "RATE_LIMITED") {
          setFormError("Too many attempts. Please try again later.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    },
  });

  const isBusy = signupMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setFormError("Fill in all fields.");
      return;
    }
    if (password.length < 10) {
      setFormError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords don't match.");
      return;
    }
    setFormError(null);
    signupMutation.mutate();
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirm,
    setConfirm,
    showPassword,
    setShowPassword,
    formError,
    isBusy,
    isSubmitting: signupMutation.isPending,
    handleSubmit,
  };
}
