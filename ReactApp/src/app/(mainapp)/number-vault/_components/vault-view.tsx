"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ParkingSquare,
  RefreshCw,
  ShieldAlert,
  Vault,
} from "lucide-react";
import { parkingApi, type VaultParking } from "@/api/parking.api";
import { subscriptionsApi } from "@/api/subscriptions.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";
import {
  useExtendParking,
  useInvalidateParking,
  useParkingVault,
  useReactivateParking,
} from "../../parking/_hooks/use-parking";
import { ExtendDialog } from "./extend-dialog";
import { ParkingCard } from "./parking-card";
import { ReactivateDialog } from "./reactivate-dialog";

interface ConfirmedParking {
  kind: "initial" | "extension";
  parking: VaultParking;
}

export function VaultView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const invalidate = useInvalidateParking();

  const [confirmed, setConfirmed] = useState<ConfirmedParking | null>(null);
  const [verifying, setVerifying] = useState(
    () => !!searchParams.get("session_id")
  );
  const [extendTarget, setExtendTarget] = useState<VaultParking | null>(null);
  const [reactivateTarget, setReactivateTarget] =
    useState<VaultParking | null>(null);

  const {
    data: vault,
    isLoading,
    isError,
    error,
    refetch,
  } = useParkingVault();

  const extend = useExtendParking();
  const reactivate = useReactivateParking();

  // Handle the Stripe redirect back — verify the session server-side (the
  // webhook equivalent for environments Stripe can't reach), then refresh.
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;

    let alive = true;
    subscriptionsApi
      .verifyCheckout(sessionId)
      .then(async (res) => {
        if (!alive) return;
        if (!res.verified) {
          toast({
            variant: "destructive",
            title: "Payment not completed",
            description:
              "Stripe did not confirm this payment. Parking was not activated.",
          });
          return;
        }

        invalidate();
        const meta = res.session?.metadata as
          | { kind?: string; parkingId?: string }
          | undefined;
        if (meta?.parkingId) {
          try {
            const parking = await parkingApi.get(meta.parkingId);
            if (alive) {
              setConfirmed({
                kind: meta.kind === "extension" ? "extension" : "initial",
                parking,
              });
            }
          } catch {
            /* the refreshed vault list still shows the update */
          }
        }
        toast({
          title:
            meta?.kind === "extension"
              ? "Parking extended"
              : "Number parked successfully",
          description: "Your payment was confirmed by Stripe.",
        });
      })
      .catch(() => {
        if (!alive) return;
        toast({
          variant: "destructive",
          title: "Could not verify payment",
          description:
            "We couldn't confirm the payment with Stripe. If you were charged, your parking will appear shortly.",
        });
      })
      .finally(() => {
        if (alive) {
          setVerifying(false);
          router.replace("/number-vault");
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleExtend = (parkingId: string, durationDays: number) => {
    extend.mutate(
      { parkingId, durationDays },
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
            title: "Could not extend parking",
            description:
              err instanceof Error ? err.message : "Please try again.",
          });
        },
      }
    );
  };

  const handleReactivate = (parkingId: string) => {
    reactivate.mutate(parkingId, {
      onSuccess: () => {
        toast({
          title: "Number reactivated",
          description:
            "The parking was ended — recharge the number to use it again.",
        });
        setReactivateTarget(null);
        invalidate();
        router.push("/recharge");
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Reactivation failed",
          description: err instanceof Error ? err.message : "Please try again.",
        });
      },
    });
  };

  const parkings = vault?.parkings ?? [];

  return (
    <div className="flex flex-col gap-7 pb-10">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-teal-500/10 p-6 md:p-8 shadow-sm">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-2.5 py-0.5 font-semibold">
            <Vault className="h-3.5 w-3.5 mr-1" />
            Number Vault
          </Badge>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Your parked numbers
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Check parking status and expiry, extend your parking (max{" "}
            {vault?.config.maxExtensions ?? 2} times), view payment receipts,
            or reactivate a number. Normal and Business SIMs share this vault.
          </p>
        </div>
      </div>

      {/* Verifying returned Stripe session */}
      {verifying && (
        <Card className="border-primary/25 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            Confirming your payment with Stripe…
          </CardContent>
        </Card>
      )}

      {/* Post-payment confirmation */}
      {confirmed && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex flex-col items-center gap-4 p-7 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {confirmed.kind === "extension"
                  ? "Parking Extended!"
                  : "Number Parked Successfully!"}
              </h2>
              <p className="mt-1 font-mono text-base font-semibold text-foreground">
                {confirmed.parking.number}
              </p>
            </div>
            <div className="grid w-full max-w-md grid-cols-2 gap-3 text-left">
              <div className="rounded-xl bg-background/60 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Parking Period
                </p>
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  {formatDate(confirmed.parking.parkedAt)} –{" "}
                  {formatDate(confirmed.parking.expiresAt)} (
                  {confirmed.parking.durationDays} days)
                </p>
              </div>
              <div className="rounded-xl bg-background/60 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Extensions Used
                </p>
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  {confirmed.parking.extensionsUsed} /{" "}
                  {confirmed.parking.maxExtensions}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmed(null)}
              >
                Go to Number Vault
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/payments")}
              >
                View Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to load your vault</p>
                <p className="text-xs text-destructive/80">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && !isError && parkings.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ParkingSquare className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            No parked numbers yet
          </h3>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
            Park a number you&apos;re not using and it will show up here with
            its expiry, extensions and receipts.
          </p>
          <Button
            className="mt-5 rounded-xl"
            onClick={() => router.push("/parking")}
          >
            Park a number
          </Button>
        </div>
      )}

      {/* Vault list */}
      {!isLoading && !isError && parkings.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {parkings.map((parking) => (
            <ParkingCard
              key={parking.id}
              parking={parking}
              actionPending={extend.isPending || reactivate.isPending}
              onExtend={setExtendTarget}
              onReactivate={setReactivateTarget}
            />
          ))}
        </div>
      )}

      {/* <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Parking records a paid reservation on your Zylo number in this demo —
          it does not disconnect real network service, and plan validity is
          unaffected. Numbers unpark automatically when the period expires.
        </p>
      </div> */}

      <ExtendDialog
        parking={extendTarget}
        config={vault?.config}
        isPending={extend.isPending}
        onOpenChange={(open) => !open && setExtendTarget(null)}
        onConfirm={handleExtend}
      />
      <ReactivateDialog
        parking={reactivateTarget}
        isPending={reactivate.isPending}
        onOpenChange={(open) => !open && setReactivateTarget(null)}
        onConfirm={handleReactivate}
      />
    </div>
  );
}

export default VaultView;
