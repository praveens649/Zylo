import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dataBankApi, dataBankStatusKey } from "@/api/data-bank.api";
import { usageStatusKey } from "@/api/usage.api";

/** Data Bank status for one SIM: balance, limits, savable amount, ledger. */
export function useDataBankStatus(simId: string | null | undefined) {
  return useQuery({
    queryKey: dataBankStatusKey(simId ?? ""),
    queryFn: () => dataBankApi.getStatus(simId!),
    enabled: Boolean(simId),
  });
}

/** Save today's unused data into the Data Bank. */
export function useDataBankSave(simId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => dataBankApi.save(simId!),
    onSuccess: () => {
      // The banked amount came out of today's unused data — refresh both.
      queryClient.invalidateQueries({ queryKey: dataBankStatusKey(simId ?? "") });
      queryClient.invalidateQueries({ queryKey: usageStatusKey(simId ?? "") });
    },
  });
}

/** Redeem banked data back into today's usage pool. */
export function useDataBankRedeem(simId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountMb: number) => dataBankApi.redeem(simId!, amountMb),
    onSuccess: () => {
      // The redeemed amount raised today's remaining data — refresh both.
      queryClient.invalidateQueries({ queryKey: dataBankStatusKey(simId ?? "") });
      queryClient.invalidateQueries({ queryKey: usageStatusKey(simId ?? "") });
    },
  });
}
