import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  travelEsimApi,
  TRAVEL_DESTINATIONS_KEY,
  TRAVEL_PLANS_KEY,
  type CreateInternationalPlanInput,
  type UpdateInternationalPlanInput,
} from "@/api/travel-esim.api";

/** Admin: every international plan (active + inactive). */
export function useAdminEsimPlans(destinationCountry?: string) {
  return useQuery({
    queryKey: [...TRAVEL_PLANS_KEY, "admin", destinationCountry ?? "all"],
    queryFn: () => travelEsimApi.plans(destinationCountry),
  });
}

function useInvalidateEsimPlans() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: TRAVEL_PLANS_KEY });
    queryClient.invalidateQueries({ queryKey: TRAVEL_DESTINATIONS_KEY });
  };
}

export function useCreateEsimPlan(onSuccess?: () => void) {
  const invalidate = useInvalidateEsimPlans();
  return useMutation({
    mutationFn: (input: CreateInternationalPlanInput) =>
      travelEsimApi.adminCreatePlan(input),
    onSuccess: () => {
      invalidate();
      onSuccess?.();
    },
  });
}

export function useUpdateEsimPlan(onSuccess?: () => void) {
  const invalidate = useInvalidateEsimPlans();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateInternationalPlanInput;
    }) => travelEsimApi.adminUpdatePlan(id, input),
    onSuccess: () => {
      invalidate();
      onSuccess?.();
    },
  });
}

export function useToggleEsimPlan(onSuccess?: () => void) {
  const invalidate = useInvalidateEsimPlans();
  return useMutation({
    mutationFn: (id: string) => travelEsimApi.adminTogglePlan(id),
    onSuccess: () => {
      invalidate();
      onSuccess?.();
    },
  });
}

export function useDeleteEsimPlan(onSuccess?: (res: { deleted: boolean; deactivated: boolean; message: string }) => void) {
  const invalidate = useInvalidateEsimPlans();
  return useMutation({
    mutationFn: (id: string) => travelEsimApi.adminDeletePlan(id),
    onSuccess: (res) => {
      invalidate();
      onSuccess?.(res);
    },
  });
}

// ---- Number inventory ----

export function useAdminEsimNumbers(country?: string) {
  return useQuery({
    queryKey: ["travel-esim", "admin-numbers", country ?? "all"],
    queryFn: () => travelEsimApi.adminNumbers(country),
    refetchInterval: 15000, // holds expire — keep the view fresh
  });
}

export function useGenerateEsimNumbers(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ country, count }: { country: string; count?: number }) =>
      travelEsimApi.adminGenerateNumbers(country, count),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["travel-esim", "admin-numbers"],
      });
      onSuccess?.();
    },
  });
}
