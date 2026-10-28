import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AUTH_ME_KEY } from "@/api/auth.api";
import {
  updateProfileAction,
  uploadProfileAvatarAction,
} from "../_actions/profile.actions";

/**
 * Profile hooks — the signed-in user itself lives in the AUTH_ME_KEY
 * cache (populated by the (mainapp) layout), so the profile page only
 * needs mutations that keep that cache fresh.
 */
export function useUpdateProfile(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfileAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY });
      onSuccess?.();
    },
  });
}

export function useUploadProfileAvatar() {
  return useMutation({
    mutationFn: uploadProfileAvatarAction,
  });
}
