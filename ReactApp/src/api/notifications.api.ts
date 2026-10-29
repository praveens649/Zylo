import { api } from "@/lib/api";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: () =>
    api.get<{ notifications: AppNotification[]; unreadCount: number }>(
      "/api/v1/notifications"
    ),
  markRead: (id: string) =>
    api.patch<{ read: boolean }>(`/api/v1/notifications/${id}/read`),
  markAllRead: () =>
    api.post<{ read: boolean }>("/api/v1/notifications/read-all"),
};

export const NOTIFICATIONS_KEY = ["notifications"] as const;
