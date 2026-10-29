"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Plane,
  RefreshCw,
  Zap,
} from "lucide-react";
import type {
  InternationalPlan,
  TravelEsimOrder,
  TravellerDetails,
} from "@/api/travel-esim.api";
import { travelEsimApi } from "@/api/travel-esim.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useInvalidateTravelEsim,
  useTravelCheckout,
  useTravelDestinations,
  useTravelOrders,
  useTravelPlans,
} from "../_hooks/use-esim";
import { EsimOrderCard } from "./esim-order-card";
import { EsimOrderDialog } from "./esim-order-dialog";
import { EsimPlanCard } from "./esim-plan-card";
import { EsimReady } from "./esim-ready";
import { TravellerDialog } from "./traveller-dialog";
import { TripForm } from "./trip-form";
import { countryName } from "../_lib/countries";

export function EsimView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const invalidate = useInvalidateTravelEsim();

  const [country, setCountry] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [searchedCountry, setSearchedCountry] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<InternationalPlan | null>(
    null
  );
  const [readyOrder, setReadyOrder] = useState<TravelEsimOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<TravelEsimOrder | null>(
    null
  );

  const {
    data: destinations = [],
    isLoading: isDestinationsLoading,
    isError: isDestinationsError,
    error: destinationsError,
    refetch: refetchDestinations,
  } = useTravelDestinations();

  const { data: orders = [] } = useTravelOrders();
  const { data: plans = [], isLoading: isPlansLoading } =
    useTravelPlans(searchedCountry ?? undefined);
  const checkout = useTravelCheckout();

  // Handle the Stripe redirect back — verify server-side, never trust the
  // redirect alone as proof of payment.
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const cancelled = searchParams.get("cancelled");

    if (sessionId) {
      let alive = true;
      travelEsimApi
        .verify(sessionId)
        .then((res) => {
          if (!alive) return;
          if (res.verified && res.order) {
            setReadyOrder(res.order);
            invalidate();
          } else {
            toast({
              variant: "destructive",
              title: "Payment not completed",
              description:
                "Stripe did not confirm this payment. No eSIM was issued.",
            });
          }
        })
        .catch((err) => {
          if (!alive) return;
          toast({
            variant: "destructive",
            title: "Could not verify payment",
            description:
              err instanceof Error
                ? err.message
                : "If you were charged, your eSIM will appear shortly.",
          });
        })
        .finally(() => {
          if (alive) router.replace("/esim");
        });
      return () => {
        alive = false;
      };
    }

    if (cancelled) {
      toast({
        title: "Checkout cancelled",
        description: "Your eSIM purchase was cancelled — no payment was made.",
      });
      router.replace("/esim");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // "Most Popular" — median plan by price, like the reference design.
  const popularPlanId =
    plans.length >= 2 ? plans[Math.floor(plans.length / 2)].id : null;

  // Trip length drives the per-plan coverage hint.
  const tripDays =
    departureDate && returnDate
      ? Math.round(
          (new Date(returnDate).getTime() -
            new Date(departureDate).getTime()) /
            86_400_000
        )
      : null;

  const handleSearch = () => setSearchedCountry(country);

  const handleTravellerSubmit = (details: TravellerDetails) => {
    if (!selectedPlan) return;
    checkout.mutate(
      {
        planId: selectedPlan.id,
        departureDate,
        returnDate,
        ...details,
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
            title: "Could not start checkout",
            description:
              err instanceof Error
                ? err.message
                : "Please try again.",
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
              <Plane className="h-3.5 w-3.5 mr-1" />
              Zylo Travel Connect
            </Badge>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Travel eSIMs for abroad
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Pick your destination, choose a data pack, pay securely, and
              install the eSIM on your phone — all before you fly. Data-only
              packs, no calls or SMS.
            </p>
          </div>
        </div>
      </div>

      {/* Freshly purchased eSIM */}
      {readyOrder && <EsimReady order={readyOrder} />}

      {/* My eSIMs */}
      {orders.length > 0 && (
        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
            My eSIMs
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {orders.map((o) => (
              <EsimOrderCard key={o.id} order={o} onView={setViewingOrder} />
            ))}
          </div>
        </div>
      )}

      {/* Step 1 — Plan your trip */}
      {isDestinationsLoading ? (
        <Skeleton className="h-56 w-full rounded-2xl" />
      ) : isDestinationsError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  Unable to load travel destinations
                </p>
                <p className="text-xs text-destructive/80">
                  {destinationsError instanceof Error
                    ? destinationsError.message
                    : "Unknown error occurred"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchDestinations()}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : destinations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Plane className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            No travel destinations yet
          </h3>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
            Travel eSIM plans haven&apos;t been added yet. Check back soon.
          </p>
        </div>
      ) : (
        <TripForm
          destinations={destinations}
          country={country}
          departureDate={departureDate}
          returnDate={returnDate}
          isSearching={isPlansLoading}
          onCountryChange={setCountry}
          onDepartureChange={setDepartureDate}
          onReturnChange={setReturnDate}
          onSearch={handleSearch}
        />
      )}

      {/* Step 2 — Choose a package */}
      {searchedCountry && (
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {countryName(searchedCountry)} — Travel eSIM Plans
            </h2>
          </div>

          {isPlansLoading ? (
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : plans.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                No plans for {countryName(searchedCountry)}
              </h3>
              <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                There are no active eSIM plans for this destination yet.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <EsimPlanCard
                  key={plan.id}
                  plan={plan}
                  isPopular={plan.id === popularPlanId}
                  isSelected={selectedPlan?.id === plan.id}
                  tripDays={tripDays}
                  onSelect={(p) => setSelectedPlan(p)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Traveller details → Stripe checkout */}
      <TravellerDialog
        plan={selectedPlan}
        open={!!selectedPlan}
        isPending={checkout.isPending}
        onOpenChange={(open) => !open && setSelectedPlan(null)}
        onSubmit={handleTravellerSubmit}
      />

      {/* Order detail dialog */}
      <EsimOrderDialog
        reference={viewingOrder?.reference ?? null}
        onOpenChange={(open) => !open && setViewingOrder(null)}
      />
    </div>
  );
}

export default EsimView;
