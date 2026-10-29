import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  travelEsimApi,
  TRAVEL_DESTINATIONS_KEY,
  TRAVEL_ORDERS_KEY,
  TRAVEL_PLANS_KEY,
  type TravelEsimCheckoutInput,
} from "@/api/travel-esim.api";
import { ORDERS_LIST_KEY } from "@/api/orders.api";

export function useTravelDestinations() {
  return useQuery({
    queryKey: TRAVEL_DESTINATIONS_KEY,
    queryFn: travelEsimApi.destinations,
  });
}

export function useTravelPlans(destinationCountry?: string) {
  return useQuery({
    queryKey: [...TRAVEL_PLANS_KEY, destinationCountry ?? "all"],
    queryFn: () => travelEsimApi.plans(destinationCountry),
    enabled: !!destinationCountry,
  });
}

export function useTravelOrders() {
  return useQuery({
    queryKey: TRAVEL_ORDERS_KEY,
    queryFn: travelEsimApi.myOrders,
  });
}

export function useTravelOrderDetail(reference: string | null) {
  return useQuery({
    queryKey: [...TRAVEL_ORDERS_KEY, "detail", reference],
    queryFn: () => travelEsimApi.orderDetail(reference!),
    enabled: !!reference,
  });
}

export function useTravelCheckout() {
  return useMutation({
    mutationFn: (input: TravelEsimCheckoutInput) =>
      travelEsimApi.createCheckout(input),
  });
}

export function useEsimCountryNumbers(country: string | null) {
  return useQuery({
    queryKey: ["travel-esim", "numbers", country],
    queryFn: () => travelEsimApi.numbers(country!),
    enabled: !!country,
  });
}

export function useHoldEsimNumber(country: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (numberId: string) => travelEsimApi.holdNumber(numberId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["travel-esim", "numbers", country],
      });
    },
  });
}

export function useReleaseEsimNumber(country: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (numberId: string) => travelEsimApi.releaseNumber(numberId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["travel-esim", "numbers", country],
      });
    },
  });
}

export function useActivateTravelEsim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) => travelEsimApi.activate(reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAVEL_ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ORDERS_LIST_KEY });
    },
  });
}

/** Invalidate everything that changes after a successful eSIM purchase. */
export function useInvalidateTravelEsim() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: TRAVEL_ORDERS_KEY });
    queryClient.invalidateQueries({ queryKey: ORDERS_LIST_KEY });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };
}
