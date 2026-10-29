import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  loanActiveKey,
  loanEligibilityKey,
  loanHistoryKey,
  loansApi,
} from "@/api/loans.api";
import { dataBankStatusKey } from "@/api/data-bank.api";

/** Can this SIM borrow right now? Returns reason codes when not. */
export function useLoanEligibility(simId: string | null | undefined) {
  return useQuery({
    queryKey: loanEligibilityKey(simId ?? ""),
    queryFn: () => loansApi.eligibility(simId!),
    enabled: Boolean(simId),
    retry: false,
  });
}

/** The SIM's open loan, or null. */
export function useActiveLoan(simId: string | null | undefined) {
  return useQuery({
    queryKey: loanActiveKey(simId ?? ""),
    queryFn: () => loansApi.active(simId!),
    enabled: Boolean(simId),
  });
}

/** Full loan history for the SIM, newest first, with transactions. */
export function useLoanHistory(simId: string | null | undefined) {
  return useQuery({
    queryKey: loanHistoryKey(simId ?? ""),
    queryFn: () => loansApi.history(simId!),
    enabled: Boolean(simId),
  });
}

/**
 * Borrow data. The caller supplies the idempotency key — generate one
 * `crypto.randomUUID()` per user attempt so retries stay safe.
 */
export function useBorrowLoan(simId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      amountMb,
      idempotencyKey,
    }: {
      amountMb: number;
      idempotencyKey: string;
    }) => loansApi.borrow(simId!, amountMb, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanActiveKey(simId ?? "") });
      queryClient.invalidateQueries({
        queryKey: loanEligibilityKey(simId ?? ""),
      });
      queryClient.invalidateQueries({ queryKey: loanHistoryKey(simId ?? "") });
      queryClient.invalidateQueries({
        queryKey: dataBankStatusKey(simId ?? ""),
      });
    },
  });
}
