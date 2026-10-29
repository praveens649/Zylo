import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ADMIN_LOAN_SUMMARY_KEY,
  ADMIN_LOANS_KEY,
  loansApi,
  type DataLoanStatus,
} from "@/api/loans.api";

export function useAdminLoans(params: {
  status?: DataLoanStatus;
  search?: string;
  page: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...ADMIN_LOANS_KEY, params],
    queryFn: () => loansApi.admin.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useAdminLoanSummary() {
  return useQuery({
    queryKey: ADMIN_LOAN_SUMMARY_KEY,
    queryFn: () => loansApi.admin.summary(),
  });
}

export function useAdminLoanDetail(id: string | null) {
  return useQuery({
    queryKey: [...ADMIN_LOANS_KEY, "detail", id],
    queryFn: () => loansApi.admin.get(id!),
    enabled: Boolean(id),
  });
}

function useInvalidateLoans() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ADMIN_LOANS_KEY });
    queryClient.invalidateQueries({ queryKey: ADMIN_LOAN_SUMMARY_KEY });
  };
}

export function useCancelLoan() {
  const invalidate = useInvalidateLoans();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      loansApi.admin.cancel(id, reason),
    onSuccess: invalidate,
  });
}

export function useRunNightlyJob() {
  const invalidate = useInvalidateLoans();
  return useMutation({
    mutationFn: (asOf?: string) => loansApi.admin.runNightly(asOf),
    onSuccess: invalidate,
  });
}
