import { api } from "@/lib/api";

export type UserRole = "SUPER_ADMIN" | "CUSTOMER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  /** "SUPER_ADMIN" is the shop owner/admin; everyone else is a CUSTOMER. */
  role: UserRole;
  /** Optional profile image URL. */
  image?: string;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt?: string;
}

/** Fields a user may update on their own account via PATCH /auth/me. */
export interface UpdateProfileInput {
  name?: string;
  image?: string;
}

/** Display label for the fixed role set. */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    CUSTOMER: "Customer",
  };
  return labels[role] ?? role;
}

export const authApi = {
  signIn: (email: string, password: string) =>
    api.post<{ user: AuthUser; token: string }>("/api/v1/auth/login", {
      email,
      password,
    }),

  signUp: (
    name: string,
    email: string,
    password: string,
    opts?: { image?: string }
  ) =>
    api.post<{ user: AuthUser; token: string }>("/api/v1/auth/register", {
      name,
      email,
      password,
      image: opts?.image,
    }),

  /** Public avatar upload for the signup form (pre-auth). */
  uploadSignupAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return api.postFormData<{ url: string; filename: string }>(
      "/api/v1/auth/upload-avatar",
      formData
    );
  },

  signOut: () => api.post<{ message: string }>("/api/v1/auth/logout"),

  me: () => api.get<{ user: AuthUser }>("/api/v1/auth/me"),

  /** Self-service profile update (name / avatar only). */
  updateProfile: (input: UpdateProfileInput) =>
    api.patch<{ user: AuthUser }>("/api/v1/auth/me", input),

  /** Authenticated avatar upload for the profile page. */
  uploadProfileAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return api.postFormData<{ url: string; filename: string }>(
      "/api/v1/auth/me/avatar",
      formData
    );
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<{ message: string; token: string }>(
      "/api/v1/auth/change-password",
      {
        currentPassword,
        newPassword,
      }
    ),
};

export const authService = authApi;
export const AUTH_ME_KEY = ["auth", "me"] as const;
