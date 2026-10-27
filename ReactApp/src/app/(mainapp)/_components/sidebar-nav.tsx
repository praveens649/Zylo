"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsFetching } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { NavItem } from "./console-nav";

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const isFetching = useIsFetching();

  return (
    <SidebarContent className="px-2">
      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">
          Manage
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarMenuItem key={`${item.href}-${item.label}`}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={isActive}
                    className="h-9 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary/15 data-[active=true]:text-sidebar-primary data-[active=true]:shadow-[inset_2px_0_0_0] data-[active=true]:shadow-sidebar-primary"
                  >
                    <Link href={item.href}>
                      {isActive && isFetching > 0 ? (
                        <Loader2 className="animate-spin text-sidebar-primary" />
                      ) : (
                        <item.icon className={isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"} />
                      )}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
