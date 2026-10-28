"use client";

import { Navigate } from "react-router-dom";
import { useAuthUser } from "@/lib/use-auth-user";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenState } from "./forbidden-state";

/**
 * Page-level admin gate. Renders children only for SUPER_ADMIN users.
 * The backend AdminGuard remains the real security boundary.
 */
export function RequireAdmin({
  message,
  children,
}: {
  message?: string;
  children: React.ReactNode;
}) {
  const { user, isPending } = useAuthUser();

  if (isPending) return null;
  if (!isAdmin(user)) return <ForbiddenState message={message} />;

  return <>{children}</>;
}

/**
 * Page-level customer gate for pages where someone buys or pays (e.g. Zylo TV).
 * Admins are sent to `adminHref`; the backend enforces the same rule.
 */
export function RequireCustomer({
  adminHref,
  children,
}: {
  adminHref: string;
  children: React.ReactNode;
}) {
  const { user, isPending } = useAuthUser();

  if (isPending) return null;
  if (isAdmin(user)) return <Navigate to={adminHref} replace />;

  return <>{children}</>;
}
