import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { tvApi, TV_KEYS } from "@/api/tv.api";

export function errorMessage(err: unknown, fallback = "Something went wrong") {
  return err instanceof Error ? err.message : fallback;
}

export const useTvBoxes = () => useQuery({ queryKey: TV_KEYS.boxes, queryFn: tvApi.boxes });
export const useTvPlans = () => useQuery({ queryKey: TV_KEYS.plans, queryFn: () => tvApi.plans() });
export const useTvConnections = () =>
  useQuery({ queryKey: TV_KEYS.connections, queryFn: tvApi.connections });

/** Mutation that toasts the outcome and refreshes the customer's TV data. */
export function useTvAction<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  success: string | ((d: TData) => string),
  onDone?: (d: TData) => void
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tv"] });
      toast({ title: typeof success === "function" ? success(data) : success });
      onDone?.(data);
    },
    onError: (err) => toast({ title: errorMessage(err), variant: "destructive" }),
  });
}

/** Sends the browser to Stripe Checkout when the API returns a session URL. */
export function goToCheckout(url: string | null) {
  if (url) window.location.assign(url);
  else toast({ title: "Could not start checkout", variant: "destructive" });
}
