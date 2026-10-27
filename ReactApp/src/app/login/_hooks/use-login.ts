"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

import { authService, AUTH_ME_KEY, getRoleLabel } from "@/api/auth.api";
import { ApiRequestError, authToken } from "@/lib/api";

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: () => authService.signIn(email.trim(), password),
    onSuccess: ({ user, token }) => {
      authToken.set(token);
      queryClient.setQueryData(AUTH_ME_KEY, { user });
      setFormError(null);

      toast({
        title: `Welcome back, ${user.name.split(" ")[0]}`,
        description: `Signed in as ${getRoleLabel(user.role)}`,
      });
      router.replace("/dashboard");
    },
    onError: (error) => {
      if (error instanceof ApiRequestError) {
        if (error.code === "INVALID_CREDENTIALS") {
          setFormError("Invalid email or password.");
        } else if (error.code === "LOGIN_RATE_LIMITED") {
          setFormError("Too many attempts. Please try again later.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setFormError("Enter your email and password.");
      return;
    }
    setFormError(null);
    loginMutation.mutate();
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    formError,
    isSubmitting: loginMutation.isPending,
    handleSubmit,
  };
}
