"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  RefreshCw,
  Smartphone,
  SmartphoneCharging,
  Zap,
} from "lucide-react";
import type { Plan } from "@/api/plans.api";
import { rechargeApi, type RechargeRecipient } from "@/api/recharge.api";
import { subscriptionsApi } from "@/api/subscriptions.api";
import { usePlans } from "@/app/(mainapp)/plans/_hooks/use-plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useInvalidateRecharge,
  useRechargeCheckout,
  useRechargeOverview,
} from "../_hooks/use-recharge";
import { CurrentPlanCard } from "./current-plan-card";
import { RechargePlanCard } from "./recharge-plan-card";
import { RechargeConfirmDialog } from "./recharge-confirm-dialog";
import { GiftRecharge } from "./gift-recharge";

export function RechargeView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const invalidate = useInvalidateRecharge();

  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [giftTarget, setGiftTarget] = useState<RechargeRecipient | null>(null);
  const [couponCode, setCouponCode] = useState("");

  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    error: overviewError,
    refetch: refetchOverview,
  } = useRechargeOverview();

  const { data: plansData, isLoading: isPlansLoading } = usePlans({
    isActive: true,
    limit: 100,
    sortBy: "price",
    sortOrder: "asc",
  });

  const checkout = useRechargeCheckout();
  const { data: couponsData } = useQuery({
    queryKey: ["recharge", "coupons"],
    queryFn: rechargeApi.coupons,
  });
  const coupons = couponsData?.coupons ?? [];

  const sims = useMemo(() => overview?.sims ?? [], [overview]);
  // Falls back to the first SIM until the user picks another one.
  const selectedSim =
    sims.find((s) => s.id === selectedSimId) ?? sims[0] ?? null;

  // Handle the Stripe redirect back — verify the session server-side, then
  // refresh the page data. Also covers environments where webhooks can't
  // reach the local server.
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const cancelled = searchParams.get("cancelled");

    if (sessionId) {
      let alive = true;
      subscriptionsApi
        .verifyCheckout(sessionId)
        .then((res) => {
          if (!alive) return;
          if (res.verified) {
            toast({
              title: "Recharge successful",
              description:
                "Your plan has been activated or queued on your number.",
            });
            invalidate();
          } else {
            toast({
              variant: "destructive",
              title: "Payment not completed",
              description:
                "Stripe did not confirm this payment. No recharge was applied.",
            });
          }
        })
        .catch(() => {
          if (!alive) return;
          toast({
            variant: "destructive",
            title: "Could not verify payment",
            description:
              "We couldn't confirm the payment with Stripe. If you were charged, your plan will appear shortly.",
          });
        })
        .finally(() => {
          if (alive) router.replace("/recharge");
        });
      return () => {
        alive = false;
      };
    }

    if (cancelled) {
      toast({
        title: "Checkout cancelled",
        description: "Your recharge was cancelled — no payment was made.",
      });
      router.replace("/recharge");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Plans purchasable on the selected SIM (business-only plans need a
  // business SIM — a brand-new personal SIM can't take them either).
  const plans = useMemo(() => {
    const all = plansData?.data ?? [];
    if (!selectedSim) return all.filter((p) => !p.businessOnly);
    return all.filter(
      (p) => !p.businessOnly || selectedSim.category === "BUSINESS"
    );
  }, [plansData, selectedSim]);

  const handleConfirm = () => {
    if (!confirmPlan) return;
    checkout.mutate(
      giftTarget
        ? {
            planId: confirmPlan.id,
            targetNumber: giftTarget.number,
            ...(couponCode ? { couponCode } : {}),
          }
        : {
            simId: selectedSim?.id,
            planId: confirmPlan.id,
            ...(couponCode ? { couponCode } : {}),
          },
      {
        onSuccess: (res) => {
          if (res.url) {
            window.location.href = res.url;
          } else {
            toast({
              variant: "destructive",
              title: "Checkout unavailable",
              description: "Stripe did not return a checkout URL.",
            });
          }
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Recharge failed",
            description:
              err instanceof Error
                ? err.message
                : "Could not start checkout. Please try again.",
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-7 pb-10">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-teal-500/10 p-6 md:p-8 shadow-sm">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-2.5 py-0.5 font-semibold">
              <SmartphoneCharging className="h-3.5 w-3.5 mr-1" />
              Instant Recharge
            </Badge>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Recharge your Zylo number
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Pick a plan below and pay securely with Stripe. Already have an
              active plan? Your new recharge queues up and starts automatically
              when the current one ends.
            </p>
          </div>

          {sims.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedSim?.id ?? ""}
                onValueChange={setSelectedSimId}
              >
                <SelectTrigger className="h-10 w-48 bg-background/70 text-sm font-medium">
                  <SelectValue placeholder="Select number" />
                </SelectTrigger>
                <SelectContent>
                  {sims.map((sim) => (
                    <SelectItem key={sim.id} value={sim.id}>
                      {sim.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {isOverviewLoading && (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      )}

      {/* Error */}
      {isOverviewError && !isOverviewLoading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  Unable to load your recharge details
                </p>
                <p className="text-xs text-destructive/80">
                  {overviewError instanceof Error
                    ? overviewError.message
                    : "Unknown error occurred"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchOverview()}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current plan + recharge plans */}
      {!isOverviewLoading && !isOverviewError && (
        <>
          <GiftRecharge recipient={giftTarget} onSelect={setGiftTarget} />

          {giftTarget ? null : selectedSim ? (
            <CurrentPlanCard sim={selectedSim} />
          ) : (
            <div className="flex items-center gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Get your first Zylo number
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  You don&apos;t have a number yet — pick any plan below and
                  we&apos;ll activate a new Zylo SIM with a number for you
                  automatically once payment succeeds.
                </p>
              </div>
            </div>
          )}

          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Available Recharge Plans
            </h2>

            {isPlansLoading ? (
              <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-72 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
              </div>
            ) : plans.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Zap className="h-7 w-7" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                  No recharge plans available
                </h3>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                  There are no active plans to recharge with right now. Please
                  check back later.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <RechargePlanCard
                    key={plan.id}
                    plan={plan}
                    onRecharge={setConfirmPlan}
                    isPending={
                      checkout.isPending && confirmPlan?.id === plan.id
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <RechargeConfirmDialog
        plan={confirmPlan}
        sim={selectedSim}
        giftFor={
          giftTarget
            ? { name: giftTarget.name, number: giftTarget.number }
            : null
        }
        coupons={coupons}
        couponCode={couponCode}
        onCouponChange={setCouponCode}
        open={!!confirmPlan}
        isPending={checkout.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmPlan(null);
            setCouponCode("");
          }
        }}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default RechargeView;
