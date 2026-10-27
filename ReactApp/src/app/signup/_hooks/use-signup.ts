"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

import { authService, AUTH_ME_KEY } from "@/api/auth.api";
import { ApiRequestError, authToken } from "@/lib/api";

export function useSignup() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [image, setImage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const signupMutation = useMutation({
    mutationFn: () =>
      authService.signUp(name.trim(), email.trim(), password, {
        image: image || undefined,
      }),
    onSuccess: ({ user, token }) => {
      authToken.set(token);
      queryClient.setQueryData(AUTH_ME_KEY, { user });
      setFormError(null);

      toast({
        title: `Welcome, ${user.name.split(" ")[0]}`,
        description: "Your account is ready.",
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image file (JPEG, PNG, WEBP, GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image must be smaller than 5MB.");
      return;
    }

    try {
      setIsUploadingImage(true);
      setFormError(null);
      const res = await authService.uploadSignupAvatar(file);
      setImage(res.url);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to upload image"
      );
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isBusy = signupMutation.isPending || isUploadingImage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
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
    isSubmitting: signupMutation.isPending,
    handleSubmit,
    handleFileUpload,
  };
}
