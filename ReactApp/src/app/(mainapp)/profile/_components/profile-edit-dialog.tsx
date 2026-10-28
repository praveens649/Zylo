"use client";

import { useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, UserRoundPen, X } from "lucide-react";

import type { AuthUser } from "@/api/auth.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { initials } from "../../_components/console-utils";
import {
  useUpdateProfile,
  useUploadProfileAvatar,
} from "../_hooks/use-profile";

interface ProfileEditDialogProps {
  user: AuthUser;
  open: boolean;
  onClose: () => void;
}

/**
 * Edit own profile — name + avatar only. Email, role and status are
 * admin-managed, so they're intentionally not editable here.
 */
export function ProfileEditDialog({
  user,
  open,
  onClose,
}: ProfileEditDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image ?? "");
  const [error, setError] = useState<string | null>(null);

  // Re-sync form state whenever the dialog is re-opened for a different
  // user snapshot (render-time adjust, same pattern as user-form).
  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    setName(user.name);
    setImage(user.image ?? "");
  }

  const uploadMutation = useUploadProfileAvatar();
  const updateMutation = useUpdateProfile(() => {
    toast({
      title: "Profile updated",
      description: "Your changes were saved successfully.",
    });
    onClose();
  });

  const isPending = updateMutation.isPending || uploadMutation.isPending;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, WEBP, GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setError(null);
    uploadMutation.mutate(file, {
      onSuccess: (res) => setImage(res.url),
      onError: (err) =>
        setError(
          err instanceof Error ? err.message : "Failed to upload image"
        ),
      onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    updateMutation.mutate(
      { name, image: image || undefined },
      {
        onError: (err) =>
          setError(
            err instanceof Error
              ? err.message
              : "Failed to update your profile."
          ),
      }
    );
  }

  const closeAndReset = () => {
    onClose();
    setName(user.name);
    setImage(user.image ?? "");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeAndReset()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPen className="h-5 w-5 text-primary" />
            Edit profile
          </DialogTitle>
          <DialogDescription>
            Update your display name and profile photo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Avatar */}
          <div className="space-y-3">
            <Label>Profile photo</Label>
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border/80 bg-muted shadow-sm">
                {image ? (
                  <img
                    src={image}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-semibold text-muted-foreground">
                    {initials(name || user.name)}
                  </span>
                )}
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    disabled={isPending}
                    className="absolute top-0 right-0 rounded-full bg-background/90 p-0.5 text-foreground shadow transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    title="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isPending}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 rounded-lg text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {uploadMutation.isPending ? "Uploading…" : "Upload photo"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    JPEG, PNG, WEBP or GIF (max 5MB)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              placeholder="e.g. Jane Doe"
              className="h-11 rounded-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Email — admin-managed, shown read-only for context */}
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email address</Label>
            <Input
              id="profile-email"
              type="email"
              className="h-11 rounded-lg"
              value={user.email}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Email changes are handled by an administrator.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={closeAndReset}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
              disabled={isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
