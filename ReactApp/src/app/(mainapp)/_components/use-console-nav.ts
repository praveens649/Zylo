"use client";

import { useMemo } from "react";

import type { AuthUser } from "@/api/auth.api";
import { isAdmin } from "@/lib/permissions";
import { NAV_ITEMS, type NavItem } from "./console-nav";

/**
 * Sidebar nav visibility — `adminOnly` items are shown to SUPER_ADMIN only,
 * `customerOnly` items are hidden from SUPER_ADMIN.
 */
export function useConsoleNav(user: AuthUser | null): NavItem[] {
  const admin = isAdmin(user);

  return useMemo(
    () =>
      NAV_ITEMS.filter(
        (item) =>
          (!item.adminOnly || admin) && (!item.customerOnly || !admin)
      ),
    [admin]
  );
}
