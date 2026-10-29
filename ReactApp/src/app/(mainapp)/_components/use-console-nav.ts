"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { AuthUser } from "@/api/auth.api";
import { isAdmin } from "@/lib/permissions";
import { NAV_ITEMS, type NavItem } from "./console-nav";
import { onboardingApi, ONBOARDING_STATUS_KEY } from "@/api/onboarding.api";

/**
 * Sidebar nav visibility — `adminOnly` items are shown to SUPER_ADMIN only,
 * `customerOnly` items are hidden from SUPER_ADMIN. Organization members
 * (invited employees) only ever see "My Organization".
 */
export function useConsoleNav(user: AuthUser | null): NavItem[] {
  const admin = isAdmin(user);

  const { data: status } = useQuery({
    queryKey: ONBOARDING_STATUS_KEY,
    queryFn: onboardingApi.getStatus,
    enabled: !!user && !admin,
  });

  const { data: myInvites } = useQuery({
    queryKey: ["onboarding", "my-invites"],
    queryFn: onboardingApi.myInvites,
    enabled: !!user && !admin,
  });

  const isOrgEmployee =
    status?.membership?.role === "EMPLOYEE" || !!myInvites?.length;

  return useMemo(
    () =>
      isOrgEmployee
        ? NAV_ITEMS.filter((item) => item.href === "/organization")
        : NAV_ITEMS.filter(
            (item) =>
              (!item.adminOnly || admin) && (!item.customerOnly || !admin)
          ),
    [admin, isOrgEmployee]
  );
}
