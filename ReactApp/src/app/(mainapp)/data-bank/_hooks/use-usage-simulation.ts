import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usageApi, usageStatusKey, type UsageStatus } from "@/api/usage.api";

/**
 * Live usage status for one SIM.
 * Polls every second while a simulation session is running so the
 * displayed consumed amount tracks the server-side clock.
 */
export function useUsageStatus(simId: string | null | undefined) {
  return useQuery({
    queryKey: usageStatusKey(simId ?? ""),
    queryFn: () => usageApi.getStatus(simId!),
    enabled: Boolean(simId),
    refetchInterval: (query) =>
      query.state.data?.running ? 1000 : false,
  });
}

/** Start a simulated consumption session. */
export function useStartUsage(simId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => usageApi.start(simId!),
    onSuccess: (data) => {
      queryClient.setQueryData<UsageStatus>(usageStatusKey(simId ?? ""), {
        allowanceMb: data.allowanceMb,
        usedMb: data.usedMb,
        bankedMb: data.bankedMb,
        redeemedMb: data.redeemedMb,
        remainingMb: data.remainingMb,
        running: data.running,
        sessionStartedAt: data.sessionStartedAt,
        simulatedRateMbPerSecond: data.simulatedRateMbPerSecond,
      });
    },
  });
}

/** Stop the running session and persist the consumed amount. */
export function useStopUsage(simId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => usageApi.stop(simId!),
    onSuccess: (data) => {
      queryClient.setQueryData<UsageStatus>(usageStatusKey(simId ?? ""), {
        allowanceMb: data.allowanceMb,
        usedMb: data.usedMb,
        bankedMb: data.bankedMb,
        redeemedMb: data.redeemedMb,
        remainingMb: data.remainingMb,
        running: false,
        sessionStartedAt: null,
        simulatedRateMbPerSecond: data.simulatedRateMbPerSecond,
      });
    },
  });
}
