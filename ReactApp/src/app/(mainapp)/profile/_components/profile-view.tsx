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
import { ProfileBadgesShowcase } from "./profile-badges-showcase";
import { getHighestBadge } from "@/lib/badges";
import { useQuestBoard } from "../../quests/_hooks/use-quests";

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
/*  Hero card with Prestige Emblem Crest                              */
/* ------------------------------------------------------------------ */

function ProfileHero({
  user,
  onEdit,
  unlockedBadges = ["LEVEL_1_ROOKIE"],
  level = 1,
}: {
  user: AuthUser;
  onEdit: () => void;
  unlockedBadges?: string[];
  level?: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const imageUrl = user.image && !imgFailed ? user.image : null;
  const crest = getHighestBadge(unlockedBadges);

  return (
    <Card className="border-border bg-card shadow-sm overflow-hidden relative">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />

      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between relative">
        <div className="flex items-center gap-4">
          {/* Avatar with Floating Crest */}
          <div className="relative">
            {imageUrl ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-primary/25 shadow-sm">
                <img
                  src={imageUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                  onError={() => setImgFailed(true)}
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-md ring-4 ring-primary/20">
                {initials(user.name)}
              </div>
            )}

            {/* Floating Medallion Emblem on Avatar */}
            {crest && (
              <div
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-card p-0.5 shadow-md ring-2 ring-primary/20"
                title={`${crest.name} • ${crest.tier} Tier`}
              >
                <img
                  src={crest.image}
                  alt={crest.name}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold tracking-tight">
                {user.name}
              </h2>

              {/* Prestige Medallion Tag */}
              {crest && (
                <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2.5 py-0.5 text-xs font-bold shadow-2xs">
                  <img
                    src={crest.image}
                    alt={crest.name}
                    className="h-4 w-4 rounded-full object-cover"
                  />
                  <span className="text-foreground">{crest.name}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    • Lvl {level}
                  </span>
                </div>
              )}

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
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {user.email}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              Member since {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="h-9 shrink-0 gap-1.5 bg-primary text-xs text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90"
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
            size="sm"
            className="h-9 shrink-0 gap-1.5 bg-primary text-xs text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90"
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
  const { data: questBoard } = useQuestBoard();
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

  const unlockedBadges = questBoard?.profile?.unlockedBadges ?? ["LEVEL_1_ROOKIE"];
  const level = questBoard?.profile?.level ?? 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Profile & Prestige
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account identity, unlocked prestige crests, and security credentials.
        </p>
      </div>

      {/* Identity hero with active crest */}
      <ProfileHero
        user={user}
        onEdit={() => setEditOpen(true)}
        unlockedBadges={unlockedBadges}
        level={level}
      />

      {/* Prestige Medallions Showcase */}
      <ProfileBadgesShowcase
        unlockedBadges={unlockedBadges}
        level={level}
      />

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
