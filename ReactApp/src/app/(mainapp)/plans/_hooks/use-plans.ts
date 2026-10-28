import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  plansApi,
  PLANS_LIST_KEY,
  PLAN_STATS_KEY,
  PLAN_DETAILS_KEY,
  type ListPlansParams,
  type CreatePlanInput,
  type UpdatePlanInput,
} from "@/api/plans.api";

export function usePlans(params: ListPlansParams = {}, enabled = true) {
  return useQuery({
    queryKey: [...PLANS_LIST_KEY, params],
    queryFn: () => plansApi.list(params),
    enabled,
  });
}

export function usePlanStats(enabled = true) {
  return useQuery({
    queryKey: PLAN_STATS_KEY,
    queryFn: plansApi.getStats,
    enabled,
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: [...PLAN_DETAILS_KEY, id],
    queryFn: () => plansApi.get(id),
    enabled: !!id,
  });
}

export function useCreatePlan(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanInput) => plansApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANS_LIST_KEY });
      queryClient.invalidateQueries({ queryKey: PLAN_STATS_KEY });
      onSuccess?.();
    },
  });
}

export function useUpdatePlan(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePlanInput }) =>
      plansApi.update(id, input),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: PLANS_LIST_KEY });
      queryClient.invalidateQueries({ queryKey: PLAN_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: [...PLAN_DETAILS_KEY, vars.id] });
      onSuccess?.();
    },
  });
}

export function useTogglePlanStatus(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plansApi.toggleStatus(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: PLANS_LIST_KEY });
      queryClient.invalidateQueries({ queryKey: PLAN_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: [...PLAN_DETAILS_KEY, id] });
      onSuccess?.();
    },
  });
}

export function useDeletePlan(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plansApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANS_LIST_KEY });
      queryClient.invalidateQueries({ queryKey: PLAN_STATS_KEY });
      onSuccess?.();
    },
  });
}
