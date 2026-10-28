import { useQuery } from "@tanstack/react-query";

import {
  ordersApi,
  ORDERS_LIST_KEY,
  type ListOrdersParams,
} from "@/api/orders.api";

/** Admin — all orders with optional filters. */
export function useOrders(params: ListOrdersParams = { limit: 50 }) {
  return useQuery({
    queryKey: [...ORDERS_LIST_KEY, params],
    queryFn: () => ordersApi.list(params),
  });
}
