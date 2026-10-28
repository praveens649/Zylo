import { CreditCard, ShoppingBag, Users, Zap } from "lucide-react";
import { Smartphone, SmartphoneCharging } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Users;
  /** Show only to SUPER_ADMIN users. Omit for items every user can see. */
  adminOnly?: boolean;
  /** Show only to non-admin (customer) users. */
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
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/orders", label: "Order History", icon: ShoppingBag },
  { href: "/payments", label: "Payment History", icon: CreditCard },
  { href: "/sims", label: "SIMs", icon: Smartphone, adminOnly: true },
];
