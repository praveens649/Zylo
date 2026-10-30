"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  NOTIFICATIONS_KEY,
  notificationsApi,
} from "@/api/notifications.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDate } from "@/lib/format";

export function NotificationsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: notificationsApi.list,
    enabled: open,
    refetchInterval: 30_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: invalidate,
  });
  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: invalidate,
  });

  const notifications = data?.notifications ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[92vw] flex-col p-0 sm:w-[480px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-lg">
              Notifications
              {(data?.unreadCount ?? 0) > 0 && (
                <Badge className="ml-2 bg-primary/20 text-primary text-[10px] px-1.5 py-0">
                  {data?.unreadCount} new
                </Badge>
              )}
            </SheetTitle>
            {(data?.unreadCount ?? 0) > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isPending ? (
            <div className="flex items-center gap-2 py-14 justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/80 bg-muted/10 p-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-semibold">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recharge gifts, eSIM purchases and account updates appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && markRead.mutate(n.id)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    n.isRead
                      ? "border-border/50 bg-card/40 opacity-70"
                      : "border-primary/25 bg-primary/5 hover:border-primary/40"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      n.isRead
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
