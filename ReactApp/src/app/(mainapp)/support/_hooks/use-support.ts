import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  supportApi,
  SUPPORT_KEYS,
  type AdminTicketFilters,
  type CreateTicketPayload,
  type TicketStatus,
  type UpdateTicketPayload,
} from "@/api/support.api";

export function errorMessage(err: unknown, fallback = "Something went wrong") {
  return err instanceof Error ? err.message : fallback;
}

/** The signed-in customer's tickets, optionally narrowed by status. */
export function useMyTickets(status?: TicketStatus) {
  return useQuery({
    queryKey: [...SUPPORT_KEYS.mine, status ?? "ALL"],
    queryFn: () => supportApi.myTickets({ status }),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTicketPayload) => supportApi.create(payload),
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: SUPPORT_KEYS.mine });
      toast({ title: `Ticket ${ticket.ticketNumber} submitted` });
    },
    onError: (err) =>
      toast({ title: errorMessage(err), variant: "destructive" }),
  });
}

/** Admin console — every ticket with the current filters applied. */
export function useAdminTickets(filters: AdminTicketFilters) {
  return useQuery({
    queryKey: [...SUPPORT_KEYS.admin, filters],
    queryFn: () => supportApi.adminTickets(filters),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTicketPayload }) =>
      supportApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPORT_KEYS.all });
      toast({ title: "Ticket updated" });
    },
    onError: (err) =>
      toast({ title: errorMessage(err), variant: "destructive" }),
  });
}
