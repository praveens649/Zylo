"use client";

import { Loader2, Upload, X } from "lucide-react";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AvatarUploadProps {
  image: string;
  name: string;
  isUploading: boolean;
  isBusy: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

/** Optional profile-photo picker with preview bubble. */
export function AvatarUpload({
  image,
  name,
  isUploading,
  isBusy,
  fileInputRef,
  onFileChange,
  onRemove,
}: AvatarUploadProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Profile photo{" "}
        <span className="font-normal normal-case">(optional)</span>
      </Label>
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border/80 bg-muted shadow-sm">
          {image ? (

            <img
              src={image}
              alt="Avatar preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-semibold text-muted-foreground">
              {name ? name.charAt(0).toUpperCase() : "?"}
            </span>
          )}
          {image && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isBusy}
              className="absolute right-0 top-0 rounded-full bg-background/90 p-0.5 text-foreground shadow transition-colors hover:bg-destructive hover:text-destructive-foreground"
              title="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onFileChange}
            disabled={isBusy}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-lg text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {isUploading ? "Uploading…" : "Upload photo"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WEBP or GIF (max 5MB)
          </p>
        </div>
      </div>
    </div>
  );
}
