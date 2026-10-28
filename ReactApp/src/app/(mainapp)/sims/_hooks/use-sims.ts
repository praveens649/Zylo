import { useQuery } from "@tanstack/react-query";

import { simsApi } from "@/api/sims.api";

/** Admin SIM fleet — every purchased SIM with owner/plan details. */
export function useSims() {
  return useQuery({
    queryKey: ["admin", "sims"],
    queryFn: () => simsApi.getSims(),
  });
}
