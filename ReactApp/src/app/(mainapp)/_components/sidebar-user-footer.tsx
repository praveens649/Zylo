"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown, UserCog } from "lucide-react";

import { AuthUser, getRoleLabel } from "@/api/auth.api";
import { useUser } from "../users/_hooks/use-users";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/ui/logout-button";
import { SidebarFooter } from "@/components/ui/sidebar";
import { initials } from "./console-utils";

export function SidebarUserFooter({ user: initialUser }: { user: AuthUser }) {
  const isSuper = initialUser.role === "SUPER_ADMIN";
  const RoleIcon = isSuper ? Crown : UserCog;
  const [imgFailed, setImgFailed] = useState(false);

  // Fetch the full/fresh user data using the useUser hook — the users
  // endpoint is admin-only, so customers skip it and keep /auth/me data.
  const { data: userDetail } = useUser(isSuper ? initialUser.id : "");
  const user = userDetail?.user ?? initialUser;

  // Normalize image url (handles relative paths like /uploads/...)
  const imageUrl = user.image && !imgFailed ? user.image : null;

  return (
    <SidebarFooter className="mt-auto border-t border-sidebar-border/60 px-3 py-3 group-data-[collapsible=icon]:p-2">
      <Link
        href="/profile"
        title={`${user.name} — view profile`}
        className="mb-2 flex items-center gap-3 rounded-lg border border-sidebar-border/50 bg-sidebar-accent/50 p-2.5 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:justify-center"
      >
        {imageUrl ? (
          <div
            title={user.name}
            className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-sidebar-primary/40"
          >
            <img
              src={imageUrl}
              alt={user.name}
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
            />
          </div>
        ) : (
          <div
            title={user.name}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-sm font-bold text-sidebar-primary"
          >
            {initials(user.name)}
          </div>
        )}
        <div className="min-w-0 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {user.name}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/50">
            {user.email}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
        <Badge
          className={
            isSuper
              ? "border-transparent bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:p-1.5"
              : "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground group-data-[collapsible=icon]:p-1.5"
          }
        >
          <RoleIcon className="h-3.5 w-3.5" />
          <span className="group-data-[collapsible=icon]:hidden">
            {getRoleLabel(user.role)}
          </span>
        </Badge>
        <LogoutButton
          title="Log out"
          className="h-8 flex-1 justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 [&>span]:group-data-[collapsible=icon]:hidden [&>svg]:group-data-[collapsible=icon]:mr-0"
          variant="ghost"
          size="sm"
        />
      </div>
    </SidebarFooter>
  );
}
