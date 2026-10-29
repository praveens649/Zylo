import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuestsState } from "../_hooks/use-quests";
import { executeCheckIn, executeVoucherRedemption, copyCodeToClipboard } from "../_actions/quest-actions";
import { QuestsHeader } from "./quests-header";
import { QuestsMetricsCards } from "./quests-metrics-cards";
import { WeeklyQuestsSection } from "./weekly-quests-section";
import { VoucherMarketplace } from "./voucher-marketplace";
import { VoucherWalletDrawer } from "./voucher-wallet-drawer";
import { RedeemVoucherModal } from "./redeem-voucher-modal";

export function QuestsView() {
  const {
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
  } = useQuestsState();

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your Quests & Reward Marketplace...</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
        <h3 className="font-semibold text-destructive">Could not load quest board</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "An unexpected error occurred."}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { planInfo, wallet, profile, weeks, vouchers, myRedemptions } = board;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header with Daily Check-In */}
      <QuestsHeader
        daysRemaining={planInfo.daysRemaining}
        streakDays={profile.streakDays}
        isCheckInPending={checkInMutation.isPending}
        onCheckIn={() => executeCheckIn(checkInMutation)}
      />

      {/* 2. Top Metric Cards: Spendable Pack XP, Plan Duration, Permanent Profile */}
      <QuestsMetricsCards
        wallet={wallet}
        planInfo={planInfo}
        profile={profile}
      />

      {/* 3. Weekly Quests Progression */}
      <WeeklyQuestsSection
        weeks={weeks}
        displayedWeek={displayedWeek}
        onSelectWeek={(w) => setSelectedWeek(w)}
      />

      {/* 4. Voucher Store / Marketplace */}
      <VoucherMarketplace
        vouchers={vouchers}
        spendablePackXp={wallet.spendablePackXp}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onOpenRedeemModal={setRedeemModalVoucher}
        isRedeemPending={redeemMutation.isPending}
      />

      {/* 5. Claimed Vouchers Wallet */}
      <VoucherWalletDrawer
        redemptions={myRedemptions}
        copiedCode={copiedCode}
        onCopyCode={(code) => copyCodeToClipboard(code, handleCopyCode)}
      />

      {/* 6. Voucher Spend Confirmation Modal */}
      <RedeemVoucherModal
        voucher={redeemModalVoucher}
        spendablePackXp={wallet.spendablePackXp}
        onClose={() => setRedeemModalVoucher(null)}
        onConfirmRedeem={(voucherId) => executeVoucherRedemption(redeemMutation, voucherId)}
        isRedeemPending={redeemMutation.isPending}
      />
    </div>
  );
}
