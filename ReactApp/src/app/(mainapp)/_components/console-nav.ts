import { CreditCard, Smartphone, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Users;
  /** Show only to SUPER_ADMIN users. Omit for items every user can see. */
  adminOnly?: boolean;
};

/**
 * All sidebar navigation items. `adminOnly` items are filtered out for
 * non-admin users (the server enforces the same restriction).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/sims", label: "SIMs", icon: Smartphone, adminOnly: true },
  { href: "/payments", label: "Payments", icon: CreditCard },
];
