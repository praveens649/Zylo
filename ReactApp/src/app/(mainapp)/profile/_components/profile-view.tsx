"use client";

import { useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import { getRoleLabel, type AuthUser } from "@/api/auth.api";
import { useAuthUser } from "@/lib/use-auth-user";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { ChangePasswordDialog } from "../../_components/change-password-dialog";
import { initials } from "../../_components/console-utils";
import { ProfileEditDialog } from "./profile-edit-dialog";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero card                                                         */
/* ------------------------------------------------------------------ */

function ProfileHero({
  user,
  onEdit,
}: {
  user: AuthUser;
  onEdit: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const imageUrl = user.image && !imgFailed ? user.image : null;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={user.name}
                className="h-20 w-20 shrink-0 rounded-2xl border border-primary/20 object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-2xl font-bold text-primary">
                {initials(user.name)}
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold tracking-tight">
                {user.name}
              </h2>
              <Badge variant="secondary" className="gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" />
                {getRoleLabel(user.role)}
              </Badge>
              <Badge
                className={
                  user.isActive
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs"
                    : "bg-muted text-muted-foreground border-border/40 text-xs"
                }
              >
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {user.email}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground/80">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              Member since {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5 text-xs"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit profile
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Account details card                                              */
/* ------------------------------------------------------------------ */

function AccountDetailsCard({ user }: { user: AuthUser }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BadgeCheck className="h-4 w-4 text-primary" />
          Account details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          <DetailRow label="Full name">
            <span className="truncate">{user.name}</span>
          </DetailRow>
          <DetailRow label="Email">
            <span className="truncate">{user.email}</span>
          </DetailRow>
          <DetailRow label="Role">{getRoleLabel(user.role)}</DetailRow>
          <DetailRow label="Account status">
            {user.isActive ? "Active" : "Inactive"}
          </DetailRow>
          <DetailRow label="Member since">
            {formatDate(user.createdAt)}
          </DetailRow>
          <Separator className="my-1" />
          <DetailRow label="User ID">
            <span className="font-mono text-xs text-muted-foreground">
              {user.id}
            </span>
          </DetailRow>
        </dl>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Security card                                                     */
/* ------------------------------------------------------------------ */

function SecurityCard({ onChangePassword }: { onChangePassword: () => void }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Lock className="h-4 w-4 text-primary" />
          Security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Password</p>
            <p className="text-xs text-muted-foreground">
              Keep your account secure with a strong password.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 text-xs"
            onClick={onChangePassword}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Change password
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Email address and account role are managed by an administrator.
          Contact support to update them.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function ProfileView() {
  const { user, isPending } = useAuthUser();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (isPending || !user) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading profile…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account information, photo, and security settings.
        </p>
      </div>

      {/* Identity hero */}
      <ProfileHero user={user} onEdit={() => setEditOpen(true)} />

      {/* Details + security */}
      <div className="grid gap-6 md:grid-cols-2">
        <AccountDetailsCard user={user} />
        <SecurityCard onChangePassword={() => setPasswordOpen(true)} />
      </div>

      {/* Dialogs */}
      <ProfileEditDialog
        user={user}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
      <ChangePasswordDialog
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}

export default ProfileView;
