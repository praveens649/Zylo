import type { UseMutationResult } from "@tanstack/react-query";
import type { RedeemVoucherResult } from "@/api/quests.api";

/**
 * Trigger daily check-in with safety check.
 */
export async function executeCheckIn(
  checkInMutation: UseMutationResult<any, Error, void>,
) {
  if (checkInMutation.isPending) return;
  return checkInMutation.mutateAsync();
}

/**
 * Execute voucher purchase with spendable XP.
 */
export async function executeVoucherRedemption(
  redeemMutation: UseMutationResult<RedeemVoucherResult, Error, string>,
  voucherId: string,
) {
  if (redeemMutation.isPending) return;
  return redeemMutation.mutateAsync(voucherId);
}

/**
 * Copy promo code to clipboard with visual feedback timer.
 */
export async function copyCodeToClipboard(
  code: string,
  onCopied: (code: string) => void,
) {
  try {
    await navigator.clipboard.writeText(code);
    onCopied(code);
  } catch (err) {
    console.error("Failed to copy promo code:", err);
  }
}
