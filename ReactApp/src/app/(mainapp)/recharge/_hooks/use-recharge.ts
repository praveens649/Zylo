import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rechargeApi, RECHARGE_OVERVIEW_KEY } from "@/api/recharge.api";
import { ORDERS_LIST_KEY } from "@/api/orders.api";

/** The customer's SIMs with their current and queued plans. */
export function useRechargeOverview() {
  return useQuery({
    queryKey: RECHARGE_OVERVIEW_KEY,
    queryFn: rechargeApi.overview,
  });
}

/** Create the Stripe checkout session for a recharge. */
export function useRechargeCheckout() {
  return useMutation({
    mutationFn: (input: { simId?: string; planId: string }) =>
      rechargeApi.createCheckout(input),
  });
}

/** Invalidate everything that changes after a successful recharge. */
export function useInvalidateRecharge() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: RECHARGE_OVERVIEW_KEY });
    queryClient.invalidateQueries({ queryKey: ORDERS_LIST_KEY });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };
}
