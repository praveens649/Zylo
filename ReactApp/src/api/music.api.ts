import { api } from "@/lib/api";

/* Zylo Music — subscription streaming backed by server-proxied iTunes/Deezer
   search + 30s preview playback. Mirrors /api/v1/music/* payloads. */

export interface MusicPlan {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  currency: string;
  validityDays: number;
  audioQuality: string;
  maxDevices: number;
}

export interface MusicSubscription {
  id: string;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  startDate: string;
  endDate: string;
  daysLeft: number;
  plan: {
    id: string;
    name: string;
    audioQuality: string;
    maxDevices: number;
  };
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  /** 30s MP3 preview — playable with <audio>. */
  previewUrl: string | null;
  durationMs: number | null;
  /** Set for YouTube results — plays via the official embed player. */
  youtubeVideoId?: string | null;
  source: "itunes" | "deezer" | "youtube";
}

export interface MusicCheckoutResult {
  sessionId: string;
  url: string | null;
  orderId: string;
}

export const musicApi = {
  plans: () => api.get<{ plans: MusicPlan[] }>("/api/v1/music/plans"),

  subscription: () =>
    api.get<{ subscription: MusicSubscription | null }>("/api/v1/music/subscription"),

  checkout: (planId: string) =>
    api.post<MusicCheckoutResult>("/api/v1/music/checkout", { planId }),

  /** Verify + fulfil after returning from Stripe success_url. */
  syncCheckout: (sessionId: string) =>
    api.get<{ synced: boolean; subscription: MusicSubscription | null }>(
      `/api/v1/music/checkout/sync?session_id=${encodeURIComponent(sessionId)}`
    ),

  /** Curated landing catalog (requires ACTIVE subscription). */
  featured: () => api.get<{ tracks: MusicTrack[] }>("/api/v1/music/featured"),

  search: (q: string) =>
    api.get<{ tracks: MusicTrack[] }>(
      `/api/v1/music/search?q=${encodeURIComponent(q)}`
    ),
};

export const MUSIC_PLANS_KEY = ["music", "plans"] as const;
export const MUSIC_SUB_KEY = ["music", "subscription"] as const;
export const MUSIC_FEATURED_KEY = ["music", "featured"] as const;
export const musicSearchKey = (q: string) => ["music", "search", q] as const;

// ------------------------------------------------------------ admin

export interface AdminMusicPlan extends MusicPlan {
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface MusicPlanInput {
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  validityDays?: number;
  audioQuality?: string;
  maxDevices?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AdminMusicSubscription {
  id: string;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  startDate: string;
  endDate: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  plan: { id: string; name: string; price: string | number };
}

export const musicAdminApi = {
  plans: () => api.get<AdminMusicPlan[]>("/api/v1/admin/music/plans"),
  createPlan: (p: MusicPlanInput) => api.post<AdminMusicPlan>("/api/v1/admin/music/plans", p),
  updatePlan: (id: string, p: Partial<MusicPlanInput>) =>
    api.patch<AdminMusicPlan>(`/api/v1/admin/music/plans/${id}`, p),
  deletePlan: (id: string) =>
    api.delete<{ deleted: boolean; deactivated: boolean }>(`/api/v1/admin/music/plans/${id}`),
  subscriptions: () => api.get<AdminMusicSubscription[]>("/api/v1/admin/music/subscriptions"),
};

export const MUSIC_ADMIN_PLANS_KEY = ["music", "admin", "plans"] as const;
export const MUSIC_ADMIN_SUBS_KEY = ["music", "admin", "subscriptions"] as const;
