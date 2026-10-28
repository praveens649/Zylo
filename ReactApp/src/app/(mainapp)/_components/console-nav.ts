import { CreditCard, ShoppingBag, Users, Zap } from "lucide-react";
import { MonitorPlay, Radio, Smartphone, Tv } from "lucide-react";

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
  { href: "/plans", label: "Recharge Plans", icon: Zap, adminOnly: true },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/orders", label: "Order History", icon: ShoppingBag },
  { href: "/payments", label: "Payment History", icon: CreditCard },
  { href: "/sims", label: "SIMs", icon: Smartphone, adminOnly: true },
  { href: "/tv", label: "Zylo TV", icon: Tv },
  { href: "/tv/my", label: "My TV", icon: MonitorPlay },
  { href: "/tv-admin", label: "TV Console", icon: Radio, adminOnly: true },
];
