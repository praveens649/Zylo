import type { AuthUser } from "@/api/auth.api";

/**
 * No dynamic RBAC — there are only two roles: SUPER_ADMIN (shop owner)
 * and CUSTOMER. Admin-only UI is gated with this single check; the
 * backend's AdminGuard is the real enforcement boundary.
 */
export function isAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === "SUPER_ADMIN";
}
