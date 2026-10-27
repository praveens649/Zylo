"use client";

import { Layers } from "lucide-react";

import { SidebarHeader } from "@/components/ui/sidebar";

export function SidebarBrand() {
  return (
    <SidebarHeader className="border-b border-sidebar-border/60 px-4 py-4 group-data-[collapsible=icon]:p-2">
      <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_20px_-4px] shadow-sidebar-primary/60">
          <Layers className="h-5 w-5" />
        </div>
        <div className="flex flex-col group-data-[collapsible=icon]:hidden">
          <span className="font-display text-base font-bold leading-tight tracking-tight text-sidebar-foreground">
            DoodleBlue
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">
            Admin Console
          </span>
        </div>
      </div>
    </SidebarHeader>
  );
}
