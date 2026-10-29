import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { questsApi, QUEST_BOARD_KEY, type VoucherItem } from "@/api/quests.api";

/**
 * Fetch complete pack-scoped Quest Board data.
 */
export function useQuestBoard() {
  return useQuery({
    queryKey: QUEST_BOARD_KEY,
    queryFn: questsApi.getBoard,
  });
}

/**
 * Execute daily check-in action (+25 XP).
 */
export function useDailyCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: questsApi.dailyCheckIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEST_BOARD_KEY });
    },
  });
}

/**
 * Redeem voucher by spending pack XP.
 */
export function useRedeemVoucher(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (voucherId: string) => questsApi.redeemVoucher(voucherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEST_BOARD_KEY });
      onSuccess?.();
    },
  });
}

export type VoucherCategoryFilter = "ALL" | "DATA_MB" | "COUPON" | "BADGE";

/**
 * High-level state management hook for Quests view.
 */
export function useQuestsState() {
  const { data: board, isLoading, error, refetch } = useQuestBoard();
  const checkInMutation = useDailyCheckIn();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<VoucherCategoryFilter>("ALL");
  const [redeemModalVoucher, setRedeemModalVoucher] = useState<VoucherItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const redeemMutation = useRedeemVoucher(() => {
    setRedeemModalVoucher(null);
  });

  const currentWeek = board?.planInfo.currentWeek ?? 1;
  const displayedWeek = selectedWeek ?? currentWeek;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return {
    board,
    isLoading,
    error,
    refetch,
    displayedWeek,
    setSelectedWeek,
    activeCategory,
    setActiveCategory,
    redeemModalVoucher,
    setRedeemModalVoucher,
    copiedCode,
    handleCopyCode,
    checkInMutation,
    redeemMutation,
  };
}
