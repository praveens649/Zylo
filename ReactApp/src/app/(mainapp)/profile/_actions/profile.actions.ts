import {
  authApi,
  type UpdateProfileInput,
} from "@/api/auth.api";

/**
 * Profile self-service actions — thin normalizers over auth.api so
 * components don't deal with trimming / empty-string handling.
 */
export async function updateProfileAction(input: UpdateProfileInput) {
  return authApi.updateProfile({
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.image !== undefined ? { image: input.image.trim() } : {}),
  });
}

export async function uploadProfileAvatarAction(file: File) {
  return authApi.uploadProfileAvatar(file);
}
