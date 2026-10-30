"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { AuthUser } from "@/api/auth.api";
import { NOTIFICATIONS_KEY, notificationsApi } from "@/api/notifications.api";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarBrand } from "./_components/sidebar-brand";
import { SidebarNav } from "./_components/sidebar-nav";
import { SidebarUserFooter } from "./_components/sidebar-user-footer";
import { ChangePasswordDialog } from "./_components/change-password-dialog";
import { NotificationsDrawer } from "./_components/notifications-drawer";
import { useConsoleNav } from "./_components/use-console-nav";

export function ConsoleShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  const items = useConsoleNav(user);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const { data: notifications } = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: notificationsApi.list,
    enabled: user.role === "CUSTOMER",
    refetchInterval: 30_000,
  });
  const unread = notifications?.unreadCount ?? 0;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarBrand user={user} />
        <SidebarNav items={items} />
        <SidebarUserFooter user={user} />
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 overflow-x-hidden bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="hover:bg-accent hover:text-accent-foreground" />
          </div>

          {user.role === "CUSTOMER" && (
            <button
              onClick={() => setNotifsOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          )}
        </header>

        <main className="flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </SidebarInset>

      {/* Temporary-password accounts must set a new password before using the
          app — non-dismissable until the flag clears (also enforced by the
          server via PASSWORD_CHANGE_REQUIRED). */}
      <NotificationsDrawer open={notifsOpen} onOpenChange={setNotifsOpen} />

      {user.mustChangePassword && (
        <ChangePasswordDialog open onClose={() => {}} />
      )}
    </SidebarProvider>
  );
}
