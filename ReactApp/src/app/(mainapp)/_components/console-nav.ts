import { Building2, CreditCard, ShoppingBag, LayoutDashboard, Users, Zap } from "lucide-react";
import { MonitorPlay, Radio, Smartphone, Tv, SmartphoneCharging } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Users;
  /** Show only to SUPER_ADMIN users. Omit for items every user can see. */
  adminOnly?: boolean;
  /** Hide from SUPER_ADMIN users (customer-only actions such as buying). */
  customerOnly?: boolean;
 
};

/**
 * All sidebar navigation items. `adminOnly` items are filtered out for
 * non-admin users (the server enforces the same restriction); `customerOnly`
 * items are hidden from admins.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/recharge",
    label: "Recharge",
    icon: SmartphoneCharging,
    customerOnly: true,
  },
  { href: "/plans", label: "Recharge Plans", icon: Zap, adminOnly: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/organization", label: "My Organization", icon: Building2, customerOnly: true },
  { href: "/orders", label: "Order History", icon: ShoppingBag },
  { href: "/payments", label: "Payment History", icon: CreditCard },
  { href: "/sims", label: "SIMs", icon: Smartphone, adminOnly: true },
  { href: "/tv", label: "Zylo TV", icon: Tv, customerOnly: true },
  { href: "/tv/my", label: "My TV", icon: MonitorPlay, customerOnly: true },
  { href: "/tv-admin", label: "TV Console", icon: Radio, adminOnly: true },
];
