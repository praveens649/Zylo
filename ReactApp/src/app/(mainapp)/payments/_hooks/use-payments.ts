import { useQuery } from "@tanstack/react-query";

import {
  paymentsApi,
  PAYMENTS_LIST_KEY,
  type ListPaymentsParams,
} from "@/api/payments.api";

/** Admin — all payments with optional filters. */
export function usePayments(params: ListPaymentsParams = { limit: 50 }) {
  return useQuery({
    queryKey: [...PAYMENTS_LIST_KEY, params],
    queryFn: () => paymentsApi.list(params),
  });
}
