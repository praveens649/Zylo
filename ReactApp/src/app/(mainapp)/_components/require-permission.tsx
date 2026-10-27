"use client";

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
