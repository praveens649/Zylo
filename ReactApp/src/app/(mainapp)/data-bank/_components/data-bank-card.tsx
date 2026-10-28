"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Vault,
} from "lucide-react";

import { ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import {
  useDataBankRedeem,
  useDataBankSave,
  useDataBankStatus,
} from "../_hooks/use-data-bank";

function formatMb(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb % 1 === 0 ? gb : gb.toFixed(2)} GB`;
  }
  return `${mb} MB`;
}

const TYPE_META: Record<string, { label: string; sign: string; className: string }> = {
  DEPOSIT: { label: "Saved", sign: "+", className: "text-emerald-600" },
  REDEMPTION: { label: "Redeemed", sign: "−", className: "text-sky-600" },
  EXPIRY: { label: "Expired", sign: "−", className: "text-destructive" },
  ADJUSTMENT: { label: "Adjustment", sign: "±", className: "text-amber-600" },
};

const QUICK_AMOUNTS = [100, 250, 500];

interface DataBankCardProps {
  simId: string;
}

/**
 * Zylo Data Bank card — vault balance, save today's remaining data,
 * redeem banked data back into today's usage, and recent ledger activity.
 */
export function DataBankCard({ simId }: DataBankCardProps) {
  const { toast } = useToast();
  const status = useDataBankStatus(simId);
  const save = useDataBankSave(simId);
  const redeem = useDataBankRedeem(simId);

  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState("");

  const data = status.data;
  const balanceMb = data?.balanceMb ?? 0;
  const capacityMb = data?.capacityMb ?? 0;
  const savableMb = data?.savableTodayMb ?? 0;
  const pct = capacityMb > 0 ? Math.min(100, (balanceMb / capacityMb) * 100) : 0;

  const parsedAmount = Number(redeemAmount);
  const redeemValid =
    Number.isInteger(parsedAmount) && parsedAmount > 0 && parsedAmount <= balanceMb;

  const handleSave = () =>
    save.mutate(undefined, {
      onSuccess: (res) => {
        toast({
          title: "Data saved to bank",
          description: `${formatMb(res.savedMb)} moved to your Data Bank${
            res.expiresAt
              ? ` (expires ${new Date(res.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`
              : ""
          }.`,
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Nothing saved",
          description:
            err instanceof ApiRequestError ? err.message : "Please try again.",
        });
      },
    });

  const handleRedeem = () => {
    if (!redeemValid) return;
    redeem.mutate(parsedAmount, {
      onSuccess: (res) => {
        setRedeemOpen(false);
        setRedeemAmount("");
        toast({
          title: "Data redeemed",
          description: `${formatMb(res.redeemedMb)} added back to today's data.`,
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Redeem failed",
          description:
            err instanceof ApiRequestError ? err.message : "Please try again.",
        });
      },
    });
  };

  return (
    <>
      <Card className="relative overflow-hidden border-border bg-card shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        <CardHeader className="relative pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Data Bank Vault
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Vault className="h-3 w-3" />
              {pct.toFixed(0)}% full
            </span>
          </div>

          <div className="mt-3 flex items-end gap-2">
            {status.isPending ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </span>
            ) : (
              <>
                <span className="font-display text-4xl font-black tracking-tight text-foreground">
                  {formatMb(balanceMb)}
                </span>
                <span className="pb-1 text-sm font-medium text-muted-foreground">
                  banked of {formatMb(capacityMb)}
                </span>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          <div className="space-y-1.5">
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-sky-500 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Expires after {data?.rolloverExpiryDays ?? 90} days per lot</span>
              <span>{pct.toFixed(0)}%</span>
            </div>
          </div>

          {/* Savable today */}
          <div className="flex items-center justify-between rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3.5 py-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Remaining data today
              </p>
              <p className="text-[11px] text-muted-foreground">
                Save it before it expires at midnight
              </p>
            </div>
            <span className="font-display text-lg font-black text-primary">
              {formatMb(savableMb)}
            </span>
          </div>

          {status.isError ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {status.error instanceof ApiRequestError
                ? status.error.message
                : "Unable to load your Data Bank."}
            </p>
          ) : null}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              className="h-11 gap-1.5 rounded-xl text-sm font-bold shadow-sm"
              disabled={
                save.isPending ||
                status.isPending ||
                status.isError ||
                savableMb <= 0
              }
              onClick={handleSave}
            >
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              {save.isPending
                ? "Saving…"
                : savableMb > 0
                  ? `Save ${formatMb(savableMb)}`
                  : "Nothing to save"}
            </Button>
            <Button
              variant="outline"
              className="h-11 gap-1.5 rounded-xl border-sky-500/30 text-sm font-bold text-sky-600 hover:bg-sky-500/10 hover:text-sky-600"
              disabled={
                status.isPending || status.isError || balanceMb <= 0
              }
              onClick={() => setRedeemOpen(true)}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Redeem data
            </Button>
          </div>

          {/* Recent ledger */}
          {data && data.transactions.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent activity
              </p>
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {data.transactions.map((txn) => {
                  const meta = TYPE_META[txn.type] ?? TYPE_META.ADJUSTMENT;
                  const isIn = txn.type === "DEPOSIT";
                  return (
                    <div
                      key={txn.id}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          isIn
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-sky-500/10 text-sky-600"
                        }`}
                      >
                        {isIn ? (
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">
                          {meta.label}{" "}
                          <span className={meta.className}>
                            {meta.sign}
                            {formatMb(txn.amountMb)}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(txn.processedAt).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" },
                          )}
                          {txn.expiresAt &&
                            ` · expires ${new Date(txn.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                        → {formatMb(txn.balanceAfterMb)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Redeem dialog */}
      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Redeem banked data</DialogTitle>
            <DialogDescription>
              Move data from your Data Bank back into today&apos;s usable
              balance. You have {formatMb(balanceMb)} banked.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              {QUICK_AMOUNTS.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant={
                    parsedAmount === amt ? "default" : "outline"
                  }
                  size="sm"
                  className="flex-1"
                  disabled={balanceMb < amt}
                  onClick={() => setRedeemAmount(String(amt))}
                >
                  {amt} MB
                </Button>
              ))}
              <Button
                type="button"
                variant={parsedAmount === balanceMb ? "default" : "outline"}
                size="sm"
                className="flex-1"
                disabled={balanceMb <= 0}
                onClick={() => setRedeemAmount(String(balanceMb))}
              >
                Max
              </Button>
            </div>

            <div className="space-y-1.5">
              <Input
                type="number"
                min={1}
                max={balanceMb}
                placeholder="Custom amount (MB)"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
              />
              {redeemAmount !== "" && !redeemValid && (
                <p className="text-xs text-destructive">
                  Enter a whole MB amount between 1 and{" "}
                  {balanceMb.toLocaleString("en-IN")}.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRedeemOpen(false)}
              disabled={redeem.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRedeem}
              disabled={!redeemValid || redeem.isPending}
              className="gap-1.5"
            >
              {redeem.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Redeem {redeemValid ? formatMb(parsedAmount) : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DataBankCard;
