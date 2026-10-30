import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  parkingApi,
  PARKING_CONFIG_KEY,
  PARKING_VAULT_KEY,
} from "@/api/parking.api";
import { ORDERS_LIST_KEY } from "@/api/orders.api";

/** Server-configured parking periods, prices and extension rules. */
export function useParkingConfig() {
  return useQuery({
    queryKey: PARKING_CONFIG_KEY,
    queryFn: parkingApi.config,
    staleTime: 60_000,
  });
}

/** Step 1 — validate a number for parking (format, ownership, eligibility). */
export function useValidateParkingNumber() {
  return useMutation({
    mutationFn: (number: string) => parkingApi.validate(number),
  });
}

/** Step 2 — create the parking order + Stripe checkout session. */
export function useParkingCheckout() {
  return useMutation({
    mutationFn: (input: { number: string; durationDays: number }) =>
      parkingApi.checkout(input),
  });
}

/** The Number Vault — every parking the user can manage. */
export function useParkingVault() {
  return useQuery({
    queryKey: PARKING_VAULT_KEY,
    queryFn: parkingApi.vault,
  });
}

/** Paid extension checkout for an active parking. */
export function useExtendParking() {
  return useMutation({
    mutationFn: (input: { parkingId: string; durationDays: number }) =>
      parkingApi.extend(input.parkingId, input.durationDays),
  });
}

/** Reactivate a parked number before expiry. */
export function useReactivateParking() {
  return useMutation({
    mutationFn: (parkingId: string) => parkingApi.reactivate(parkingId),
  });
}

/** Invalidate everything a parking payment/status change touches. */
export function useInvalidateParking() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: PARKING_VAULT_KEY });
    queryClient.invalidateQueries({ queryKey: ORDERS_LIST_KEY });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };
}
