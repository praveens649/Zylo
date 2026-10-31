"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CreditCard,
  Film,
  HardDrive,
  Loader2,
  Lock,
  Tv,
  Wifi,
} from "lucide-react";
import type { BoxOwnership, InstallationSlot, TvBox, TvPack } from "@/api/tv.api";
import { tvApi } from "@/api/tv.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { formatINR, money } from "@/lib/format";
import { goToCheckout, useTvAction, useTvBoxes, useTvConnections, useTvPlans } from "../_hooks/use-tv";
import { FormField, isoDay, ResolutionBadge, SLOT_LABEL, TvHero, fieldCls } from "./tv-ui";
import { TvTabSwitch } from "./tv-tab-switch";

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

function offered(box: TvBox, o: BoxOwnership) {
  return o === "PURCHASE" ? box.purchasePrice !== null : box.rentalPerMonth !== null;
}

function hardwareCost(box: TvBox, o: BoxOwnership) {
  return o === "PURCHASE" ? money(box.purchasePrice) : money(box.rentalPerMonth) + money(box.securityDeposit);
}

const LIVE_STATUSES = ["PENDING_INSTALLATION", "ACTIVE", "PAUSED", "GRACE_PERIOD", "SUSPENDED"];

export function TvStore({
  onSwitchTab,
  currentTab = "browse",
  connectionCount,
}: {
  onSwitchTab?: (tab: "browse" | "my") => void;
  currentTab?: "browse" | "my";
  connectionCount?: number;
} = {}) {
  const navigate = useNavigate();
  const boxesQ = useTvBoxes();
  const plansQ = useTvPlans();
  const connsQ = useTvConnections();

  const [boxId, setBoxId] = useState<string>();
  const [ownershipPick, setOwnershipPick] = useState<BoxOwnership>("PURCHASE");
  const [basePick, setBasePick] = useState<string>();
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState(isoDay(2));
  const [preferredSlot, setPreferredSlot] = useState<InstallationSlot>("MORNING");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const boxes = boxesQ.data ?? [];
  const plans = plansQ.data ?? [];
  // One set-top box per account: a live connection (or an unreturned rental)
  // blocks a new order — the server enforces the same rule.
  const liveConn = (connsQ.data ?? []).find(
    (c) => LIVE_STATUSES.includes(c.status) || (c.status === "DISCONNECTED" && c.returnDueAt)
  );
  const basePlans = plans.filter((p) => p.type === "BASE");
  const addOns = plans.filter((p) => p.type === "ADD_ON");

  const box = boxes.find((b) => b.id === boxId) ?? boxes.find((b) => b.inStock) ?? boxes[0];
  const is4k = box?.resolution === "UHD_4K";
  const usable = (p: TvPack) => !p.requires4kBox || is4k;

  const ownership: BoxOwnership = box && !offered(box, ownershipPick)
    ? ownershipPick === "PURCHASE" ? "RENTAL" : "PURCHASE"
    : ownershipPick;
  const base =
    basePlans.find((p) => p.id === basePick && usable(p)) ??
    basePlans.find((p) => p.isFeatured && usable(p)) ??
    basePlans.find(usable);
  const chosenAddOns = addOns.filter((a) => addOnIds.includes(a.id) && usable(a));

  const hardware = box ? hardwareCost(box, ownership) : 0;
  const packs = (base ? money(base.price) : 0) + chosenAddOns.reduce((s, a) => s + money(a.price), 0);
  const total = hardware + packs;

  const checkout = useTvAction(tvApi.checkout, "Redirecting to secure payment…", (r) => goToCheckout(r.url));

  function submit() {
    setError(null);
    if (!box || !base) return setError("Choose a box and a base pack.");
    if (addressLine.trim().length < 5 || city.trim().length < 2 || state.trim().length < 2)
      return setError("Please enter your full installation address.");
    if (!/^\d{6}$/.test(postalCode)) return setError("PIN code must be 6 digits.");
    if (!/^[6-9]\d{9}$/.test(contactPhone)) return setError("Enter a valid 10-digit mobile number.");
    if (!preferredDate) return setError("Choose a preferred installation date.");
    checkout.mutate(
      {
        modelId: box.id,
        ownership,
        basePlanId: base.id,
        addOnPlanIds: chosenAddOns.map((a) => a.id),
        addressLine: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode,
        contactPhone,
        preferredDate: new Date(preferredDate).toISOString(),
        preferredSlot,
        customerNotes: notes.trim() || undefined,
      },
      { onError: (e) => setError(e instanceof Error ? e.message : "Checkout failed") }
    );
  }

  const loading = boxesQ.isPending || plansQ.isPending;

  return (
    <div className="flex flex-col gap-7 pb-10">
      <TvHero
        badge="Zylo TV"
        title="Bring Zylo TV home"
        subtitle="Pick a set-top box, choose your channel packs and book a free installation visit. Pay securely with Stripe (test mode)."
        right={
          <TvTabSwitch
            tab={currentTab}
            onChange={onSwitchTab}
            count={connectionCount ?? (connsQ.data?.length || 0)}
          />
        }
      />

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading catalogue…
        </div>
      )}

      {(boxesQ.isError || plansQ.isError) && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> Could not load the Zylo TV catalogue.
          </CardContent>
        </Card>
      )}

      {liveConn && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">You already have a Zylo TV connection</p>
                <p className="text-xs text-muted-foreground">
                  {liveConn.connectionNumber} is {liveConn.status.replaceAll("_", " ").toLowerCase()} — one set-top box is allowed per account.
                  {liveConn.status === "DISCONNECTED" && liveConn.returnDueAt ? " Return the rented box first to order again." : ""}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => (onSwitchTab ? onSwitchTab("my") : navigate("/tv?tab=my"))}
            >
              Open My TV
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && box && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-8">
            {/* 1. Box */}
            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold">1. Choose your box</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {boxes.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={!b.inStock}
                    onClick={() => setBoxId(b.id)}
                    className={cn(
                      "relative rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
                      b.id === box.id ? "border-primary bg-primary/5 ring-2 ring-primary/40" : "border-border/60 bg-card hover:border-primary/40"
                    )}
                  >
                    {b.id === box.id && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}
                    <Tv className="h-8 w-8 text-primary" />
                    <p className="mt-3 font-display font-bold">{b.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <ResolutionBadge resolution={b.resolution} />
                      {b.isSmart && <Badge variant="tertiary">Smart</Badge>}
                      {b.isFeatured && <Badge variant="warning">Popular</Badge>}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{b.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                      {b.storageGb && (
                        <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{b.storageGb} GB</span>
                      )}
                      {b.hasRecording && <span className="flex items-center gap-1"><Film className="h-3 w-3" />Recording</span>}
                    </div>
                    <p className="mt-3 text-sm font-semibold">
                      {b.purchasePrice !== null ? formatINR(b.purchasePrice) : "Rent only"}
                      {b.rentalPerMonth !== null && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">or {formatINR(b.rentalPerMonth)}/mo</span>
                      )}
                    </p>
                    {!b.inStock && <p className="mt-1 text-xs font-semibold text-destructive">Out of stock</p>}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {(["PURCHASE", "RENTAL"] as const).map((o) => (
                  <Button
                    key={o}
                    type="button"
                    size="sm"
                    variant={ownership === o ? "default" : "outline"}
                    disabled={!offered(box, o)}
                    onClick={() => setOwnershipPick(o)}
                  >
                    {o === "PURCHASE"
                      ? `Buy · ${formatINR(box.purchasePrice)}`
                      : box.rentalPerMonth !== null
                      ? `Rent · ${formatINR(box.rentalPerMonth)}/mo + ${formatINR(box.securityDeposit)} deposit`
                      : "Rent · not offered"}
                  </Button>
                ))}
              </div>
            </section>

            {/* 2. Packs */}
            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold">2. Pick a base pack</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {basePlans.map((p) => {
                  const ok = usable(p);
                  const selected = base?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!ok}
                      onClick={() => setBasePick(p.id)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
                        selected ? "border-primary bg-primary/5 ring-2 ring-primary/40" : "border-border/60 bg-card hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-display font-bold">{p.name}</p>
                        <p className="font-display text-lg font-black">{formatINR(p.price)}<span className="text-xs font-normal text-muted-foreground">/{p.validityDays}d</span></p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="secondary">{p.channelCount} channels</Badge>
                        <Badge variant="outline">{p.hdChannelCount} HD</Badge>
                        {p.requires4kBox && <Badge variant="default">4K box</Badge>}
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">{p.languages.join(" · ")}</p>
                      {!ok && <p className="mt-1 text-xs text-destructive">Needs a 4K box</p>}
                    </button>
                  );
                })}
              </div>

              <h3 className="pt-2 text-sm font-semibold">Add-on packs <span className="font-normal text-muted-foreground">(optional)</span></h3>
              <div className="grid gap-3 md:grid-cols-2">
                {addOns.map((a) => {
                  const ok = usable(a);
                  const on = chosenAddOns.some((x) => x.id === a.id);
                  return (
                    <label
                      key={a.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm",
                        on ? "border-primary bg-primary/5" : "border-border/60",
                        !ok && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        disabled={!ok}
                        checked={on}
                        onChange={() => setAddOnIds((ids) => (ids.includes(a.id) ? ids.filter((i) => i !== a.id) : [...ids, a.id]))}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{a.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.channelCount} channels{!ok && " · needs a 4K box"}</p>
                      </div>
                      <span className="font-semibold">{formatINR(a.price)}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* 3. Installation */}
            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold">3. Installation details</h2>
              <Card>
                <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FormField label="Address">
                      <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Flat / street / area" />
                    </FormField>
                  </div>
                  <FormField label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} /></FormField>
                  <FormField label="State"><Input value={state} onChange={(e) => setState(e.target.value)} /></FormField>
                  <FormField label="PIN code"><Input value={postalCode} inputMode="numeric" maxLength={6} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))} /></FormField>
                  <FormField label="Contact mobile"><Input value={contactPhone} inputMode="numeric" maxLength={10} onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ""))} /></FormField>
                  <FormField label="Preferred date">
                    <DatePicker min={isoDay(1)} max={isoDay(60)} value={preferredDate} onChange={setPreferredDate} className="h-9" />
                  </FormField>
                  <FormField label="Time slot">
                    <select className={cn(fieldCls, "h-9")} value={preferredSlot} onChange={(e) => setPreferredSlot(e.target.value as InstallationSlot)}>
                      {Object.entries(SLOT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="Notes for the technician (optional)">
                      <textarea className={cn(fieldCls, "min-h-[70px]")} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </FormField>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <Card className="overflow-hidden border-primary/30">
              <div className="h-1.5 bg-gradient-to-r from-primary via-purple-500 to-teal-500" />
              <CardContent className="space-y-4 p-5">
                <h2 className="font-display text-lg font-bold">Order summary</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{box.name} ({ownership === "PURCHASE" ? "buy" : "rent + deposit"})</dt>
                    <dd className="font-medium">{formatINR(hardware)}</dd>
                  </div>
                  {base && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{base.name}</dt>
                      <dd className="font-medium">{formatINR(base.price)}</dd>
                    </div>
                  )}
                  {chosenAddOns.map((a) => (
                    <div key={a.id} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{a.name}</dt>
                      <dd className="font-medium">{formatINR(a.price)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border/60 pt-3 text-base">
                    <dt className="font-semibold">Estimated total</dt>
                    <dd className="font-display text-xl font-black">{formatINR(total)}</dd>
                  </div>
                </dl>
                <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                  The final amount is calculated by our server. Payments use Stripe test mode — no real money is charged.
                </p>

                {error && (
                  <p className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}
                  </p>
                )}

                <Button className="h-11 w-full font-bold" onClick={submit} disabled={checkout.isPending || !base || !box.inStock || !!liveConn}>
                  {checkout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  Pay {formatINR(total)} with Stripe
                </Button>
                <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                  <Wifi className="h-3 w-3" /> {liveConn
                    ? "You already have a Zylo TV connection."
                    : ownership === "RENTAL"
                    ? "Monthly rent is auto-debited from your saved card."
                    : "Your pack starts once the technician completes installation."}
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

export default TvStore;
