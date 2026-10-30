"use client";

import { useQuery } from "@tanstack/react-query";
import { Phone, Zap } from "lucide-react";

import {
  ONBOARDING_STATUS_KEY,
  onboardingApi,
} from "@/api/onboarding.api";
import { AuthUser } from "@/api/auth.api";
import { SidebarHeader } from "@/components/ui/sidebar";

export function SidebarBrand({ user }: { user: AuthUser }) {
  const { data: status } = useQuery({
    queryKey: ONBOARDING_STATUS_KEY,
    queryFn: onboardingApi.getStatus,
    enabled: user.role === "CUSTOMER",
    staleTime: 60_000,
  });

  const number =
    status?.activeSim?.phoneNumber?.number ??
    status?.allocatedNumber?.number ??
    null;

  return (
    <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:p-2">
      <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Zap className="h-5 w-5" />
        </div>
        <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
          <span className="font-display text-base font-bold leading-tight tracking-tight text-sidebar-foreground">
            Zylo
          </span>
          {number && (
            <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-foreground/80">
              <Phone className="h-3 w-3 text-primary" />
              {number}
            </span>
          )}
        </div>
      </div>
    </SidebarHeader>
  );
}
