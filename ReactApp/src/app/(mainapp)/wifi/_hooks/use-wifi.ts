import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { wifiApi, WIFI_KEYS } from "@/api/wifi.api";

export function errorMessage(err: unknown, fallback = "Something went wrong") {
  return err instanceof Error ? err.message : fallback;
}

export const useWifiDevices = () => useQuery({ queryKey: WIFI_KEYS.devices, queryFn: wifiApi.devices });
export const useWifiPlans = () => useQuery({ queryKey: WIFI_KEYS.plans, queryFn: () => wifiApi.plans() });
export const useWifiConnections = () =>
  useQuery({ queryKey: WIFI_KEYS.connections, queryFn: wifiApi.connections });

/** Mutation that toasts the outcome and refreshes the customer's WiFi data. */
export function useWifiAction<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  success: string | ((d: TData) => string),
  onDone?: (d: TData) => void
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wifi"] });
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
