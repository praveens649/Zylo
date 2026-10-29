import { Building2, CreditCard, Database, Globe, Plane, HandCoins, ShoppingBag, LayoutDashboard, Users, Zap, Trophy } from "lucide-react";
import { LifeBuoy, MonitorPlay, Radio, Send, Smartphone, Tv, Wifi, SmartphoneCharging } from "lucide-react";

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
  {
    href: "/data-bank",
    label: "Data Bank",
    icon: Database,
    customerOnly: true,
  },
  {
    href: "/data-transfer",
    label: "Transfer Data",
    icon: Send,
    customerOnly: true,
  },
  {
    href: "/quests",
    label: "Quests & Rewards",
    icon: Trophy,
    customerOnly: true,
  },
  {
    href: "/esim",
    label: "Travel eSIM",
    icon: Plane,
    customerOnly: true,
  },
  { href: "/plans", label: "Recharge Plans", icon: Zap, adminOnly: true },
  { href: "/esim-plans", label: "eSIM Plans", icon: Globe, adminOnly: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/organization", label: "My Organization", icon: Building2, customerOnly: true },
  { href: "/orders", label: "Order History", icon: ShoppingBag },
  { href: "/payments", label: "Payment History", icon: CreditCard },
  { href: "/sims", label: "SIMs", icon: Smartphone, adminOnly: true },
  { href: "/tv", label: "Zylo TV", icon: Tv, customerOnly: true },
  { href: "/tv/my", label: "My TV", icon: MonitorPlay, customerOnly: true },
  { href: "/tv-admin", label: "TV Console", icon: Radio, adminOnly: true },
  { href: "/wifi", label: "Zylo WiFi", icon: Wifi, customerOnly: true },
  { href: "/wifi/my", label: "My WiFi", icon: Wifi, customerOnly: true },
  { href: "/wifi-admin", label: "WiFi Console", icon: Wifi, adminOnly: true },
  { href: "/support", label: "Support", icon: LifeBuoy, customerOnly: true },
  { href: "/support-admin", label: "Support Desk", icon: LifeBuoy, adminOnly: true },
  { href: "/loans-admin", label: "Data Loans", icon: HandCoins, adminOnly: true },
];
