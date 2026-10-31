import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Gauge,
  Loader2,
  MapPin,
  Router,
  ShieldCheck,
  Wifi,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { AppDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatINR, money } from "@/lib/format";
import type { DeviceOwnership, InstallationSlot, WifiDevice, WifiPlan } from "@/api/wifi.api";
import { wifiApi } from "@/api/wifi.api";
import { useWifiDevices, useWifiPlans, errorMessage, goToCheckout } from "../_hooks/use-wifi";
import { BandBadge, FormField, SLOT_LABEL, WifiHero, fieldCls, isoDay } from "./wifi-ui";
import { WifiTabSwitch } from "./wifi-tab-switch";

const SLOTS: InstallationSlot[] = ["MORNING", "AFTERNOON", "EVENING"];

const BAND_TEXT: Record<string, string> = {
  SINGLE_BAND: "2.4 GHz single-band",
  DUAL_BAND: "Dual-band",
  TRI_BAND: "Tri-band",
};

const INITIAL_FORM = {
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  contactPhone: "",
  preferredDate: "",
  preferredSlot: "MORNING" as InstallationSlot,
  customerNotes: "",
};

type OpenPanel = "selection" | "installation" | null;

export function WifiStore({
  onSwitchTab,
  currentTab = "browse",
  connectionCount,
}: {
  onSwitchTab?: (tab: "browse" | "my") => void;
  currentTab?: "browse" | "my";
  connectionCount?: number;
} = {}) {
  const navigate = useNavigate();
  const devices = useWifiDevices();
  const plans = useWifiPlans();

  const [device, setDevice] = useState<WifiDevice | null>(null);
  const [ownership, setOwnership] = useState<DeviceOwnership>("PURCHASE");
  const [basePlan, setBasePlan] = useState<WifiPlan | null>(null);
  const [addOns, setAddOns] = useState<WifiPlan[]>([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState(false);
  const [openPanel, setOpenPanel] = useState<OpenPanel>("selection");

  const basePlans = useMemo(() => (plans.data ?? []).filter((p) => p.type === "BASE"), [plans.data]);
  const addOnPlans = useMemo(() => (plans.data ?? []).filter((p) => p.type === "ADD_ON"), [plans.data]);

  const checkout = useMutation({
    mutationFn: () =>
      wifiApi.checkout({
        deviceId: device!.id,
        ownership,
        basePlanId: basePlan!.id,
        addOnPlanIds: addOns.map((a) => a.id),
        ...form,
      }),
    onSuccess: (d) => goToCheckout(d.url),
    onError: (err) => toast({ title: errorMessage(err), variant: "destructive" }),
  });

  const hardware = !device
    ? 0
    : ownership === "PURCHASE"
      ? money(device.purchasePrice)
      : money(device.rentalPerMonth) + money(device.securityDeposit);
  const plansTotal = (basePlan ? money(basePlan.price) : 0) + addOns.reduce((s, p) => s + money(p.price), 0);
  const total = hardware + plansTotal;
  const ready = !!device && !!basePlan;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const selectDevice = (d: WifiDevice) => {
    setDevice(d);
    // If the chosen plan needs a tri-band router, drop it when switching to a non-tri-band router.
    if (basePlan?.requiresTriBand && d.band !== "TRI_BAND") setBasePlan(null);
    if (ownership === "RENTAL" && !d.rentalPerMonth) setOwnership("PURCHASE");
  };

  const toggleAddOn = (p: WifiPlan) =>
    setAddOns((a) => (a.some((x) => x.id === p.id) ? a.filter((x) => x.id !== p.id) : [...a, p]));

  const planNeedsTriBand = (p: WifiPlan) => p.requiresTriBand && device?.band !== "TRI_BAND";

  const validate = (): string[] => {
    const missing: string[] = [];
    if (!device) missing.push("Choose a router");
    if (!basePlan) missing.push("Choose a plan");
    return missing;
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (form.addressLine.trim().length < 5) errs.addressLine = "Enter your full installation address";
    if (form.city.trim().length < 2) errs.city = "Required";
    if (form.state.trim().length < 2) errs.state = "Required";
    if (!/^\d{6}$/.test(form.postalCode.trim())) errs.postalCode = "Enter a valid 6-digit PIN code";
    if (!/^[6-9]\d{9}$/.test(form.contactPhone.trim()))
      errs.contactPhone = "Enter a valid 10-digit mobile number";
    if (!form.preferredDate) errs.preferredDate = "Choose an installation date";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goToInstallation = () => {
    const missing = validate();
    if (missing.length) {
      toast({ title: missing[0], variant: "destructive" });
      setOpenPanel("selection");
      return;
    }
    setOpenPanel("installation");
  };

  const requestReview = () => {
    const missing = validate();
    if (missing.length) {
      toast({ title: missing[0], variant: "destructive" });
      setOpenPanel("selection");
      return;
    }
    if (!validateForm()) {
      toast({ title: "Fill in the installation details first", variant: "destructive" });
      setOpenPanel("installation");
      return;
    }
    setReviewing(true);
  };

  const pay = () => {
    if (!device || !basePlan) return;
    checkout.mutate();
  };

  if (devices.isLoading || plans.isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WifiHero
        badge="FIBER-TO-THE-HOME"
        title="Zylo WiFi for your home"
        subtitle="Blazing-fast fibre broadband with a router included, installed by certified technicians within days. Plans renew every 30 days — pause anytime."
        right={
          <WifiTabSwitch
            tab={currentTab}
            onChange={onSwitchTab}
            count={connectionCount}
          />
        }
      />

      <div className="space-y-6 lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="min-w-0 space-y-4">
          {/* ------------------------------- selection panel */}
          <Card className={cn(openPanel === "selection" && "border-primary/50")}>
            <button
              type="button"
              className="flex w-full items-center justify-between p-5 text-left"
              onClick={() => setOpenPanel(openPanel === "selection" ? null : "selection")}
            >
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wifi className="h-4 w-4 text-primary" /> Router &amp; plan
                </CardTitle>
                {ready && (
                  <CardDescription>
                    {device!.name} · {basePlan!.name}
                  </CardDescription>
                )}
              </div>
              <ChevronDown className={cn("h-5 w-5 transition-transform", openPanel !== "selection" && "-rotate-90")} />
            </button>
            {openPanel === "selection" && (
              <CardContent className="space-y-6 pt-0">
                {/* routers */}
                <div>
                  <p className="mb-2 text-sm font-semibold">1. Pick your router</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(devices.data ?? []).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => selectDevice(d)}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all",
                          device?.id === d.id ? "border-primary bg-primary/5" : "hover:border-primary/40",
                          d.inStock === false && "opacity-50"
                        )}
                      >
                        <Router className="h-8 w-8 text-primary" />
                        <span className="text-sm font-semibold">{d.name}</span>
                        <div className="flex items-center gap-1.5">
                          <BandBadge band={d.band} />
                          <span className="text-[11px] text-muted-foreground">{d.wifiStandard}</span>
                        </div>
                        {d.isMesh && <span className="text-[11px] text-muted-foreground">Mesh-ready</span>}
                        <span className="text-xs font-medium text-primary">
                          {d.purchasePrice ? `${formatINR(d.purchasePrice)} buy` : ""}
                          {d.purchasePrice && d.rentalPerMonth ? " · " : ""}
                          {d.rentalPerMonth ? `${formatINR(d.rentalPerMonth)}/mo rent` : ""}
                        </span>
                        <span className={cn("text-[11px]", d.inStock === false ? "text-destructive" : "text-emerald-600")}>
                          {d.inStock === false ? "Out of stock" : "In stock"}
                        </span>
                        {device?.id === d.id && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                  {device && (
                    <div className="mt-3 flex items-center gap-2">
                      {(["PURCHASE", "RENTAL"] as const).map((o) => {
                        const disabled = o === "RENTAL" && !device.rentalPerMonth;
                        return (
                          <Button
                            key={o}
                            variant={ownership === o ? "default" : "outline"}
                            size="sm"
                            disabled={disabled}
                            onClick={() => setOwnership(o)}
                          >
                            {o === "PURCHASE" ? `Buy ${formatINR(device.purchasePrice)}` : `Rent ${formatINR(device.rentalPerMonth)}/mo`}
                          </Button>
                        );
                      })}
                      {ownership === "RENTAL" && (
                        <span className="text-xs text-muted-foreground">
                          + refundable deposit {formatINR(device.securityDeposit)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* base plans */}
                <div>
                  <p className="mb-2 text-sm font-semibold">2. Pick your broadband plan</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {basePlans.map((p) => {
                      const blocked = planNeedsTriBand(p);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={!device}
                          onClick={() => !blocked && setBasePlan(p)}
                          className={cn(
                            "relative rounded-xl border-2 p-4 text-left transition-all",
                            basePlan?.id === p.id ? "border-primary bg-primary/5" : "hover:border-primary/40",
                            (!device || blocked) && "opacity-50"
                          )}
                        >
                          {p.isFeatured && (
                            <Badge className="absolute -top-2 left-3 bg-gradient-to-r from-primary to-teal-500 text-[10px]">
                              POPULAR
                            </Badge>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Gauge className="h-4 w-4 text-primary" />
                            <span className="font-display text-xl font-bold">{p.speedMbps}</span>
                            <span className="text-xs text-muted-foreground">Mbps</span>
                          </div>
                          <p className="mt-1 text-sm font-medium">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.dataLimitGb ? `${p.dataLimitGb} GB` : "Unlimited"} · {p.validityDays} days
                          </p>
                          <p className="mt-1.5 font-display text-lg font-bold text-primary">{formatINR(p.price)}/mo</p>
                          {blocked && (
                            <p className="mt-1 text-[11px] text-destructive">Needs a tri-band router</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* add-ons */}
                {addOnPlans.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold">3. Boosters (optional)</p>
                    <div className="flex flex-wrap gap-2">
                      {addOnPlans.map((p) => {
                        const on = addOns.some((a) => a.id === p.id);
                        return (
                          <Button key={p.id} variant={on ? "default" : "outline"} size="sm" disabled={!basePlan} onClick={() => toggleAddOn(p)}>
                            <Zap className="mr-1.5 h-3.5 w-3.5" />
                            {p.name} · {formatINR(p.price)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end border-t pt-4">
                  <Button onClick={goToInstallation}>
                    Continue <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* ------------------------------- installation panel */}
          <Card className={cn(openPanel === "installation" && "border-primary/50")}>
            <button
              type="button"
              className="flex w-full items-center justify-between p-5 text-left"
              onClick={() => setOpenPanel(openPanel === "installation" ? null : "installation")}
            >
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" /> Installation details
              </CardTitle>
              <ChevronDown className={cn("h-5 w-5 transition-transform", openPanel !== "installation" && "-rotate-90")} />
            </button>
            {openPanel === "installation" && (
              <CardContent className="space-y-4 pt-0">
                <FormField label="Installation address">
                  <Input
                    value={form.addressLine}
                    onChange={(e) => {
                      set("addressLine", e.target.value);
                      setFieldErrors((x) => ({ ...x, addressLine: "" }));
                    }}
                    placeholder="Flat 4B, Sunshine Residency, MG Road"
                  />
                  {fieldErrors.addressLine && <p className="text-xs text-destructive">{fieldErrors.addressLine}</p>}
                </FormField>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { k: "city", label: "City", placeholder: "Bengaluru" },
                      { k: "state", label: "State", placeholder: "Karnataka" },
                      { k: "postalCode", label: "PIN code", placeholder: "560001", maxLength: 6 },
                    ] as const
                  ).map(({ k, label, placeholder, ...rest }) => (
                    <FormField key={k} label={label}>
                      <Input
                        value={form[k]}
                        placeholder={placeholder}
                        {...rest}
                        onChange={(e) => {
                          set(k, k === "postalCode" ? e.target.value.replace(/\D/g, "") : e.target.value);
                          setFieldErrors((x) => ({ ...x, [k]: "" }));
                        }}
                      />
                      {fieldErrors[k] && <p className="text-xs text-destructive">{fieldErrors[k]}</p>}
                    </FormField>
                  ))}
                </div>
                <FormField label="Contact phone" hint="The technician calls this number to coordinate the visit.">
                  <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value.replace(/\D/g, ""))} maxLength={10} placeholder="98765 43210" />
                  {fieldErrors.contactPhone && <p className="text-xs text-destructive">{fieldErrors.contactPhone}</p>}
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Preferred date">
                    <DatePicker min={isoDay(0)} max={isoDay(60)} value={form.preferredDate} onChange={(v) => set("preferredDate", v)} className="h-9" />
                    {fieldErrors.preferredDate && <p className="text-xs text-destructive">{fieldErrors.preferredDate}</p>}
                  </FormField>
                  <FormField label="Preferred slot">
                    <select className={fieldCls} value={form.preferredSlot} onChange={(e) => set("preferredSlot", e.target.value as InstallationSlot)}>
                      {SLOTS.map((s) => (
                        <option key={s} value={s}>
                          {SLOT_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <FormField label="Notes for the technician (optional)">
                  <Input value={form.customerNotes} onChange={(e) => set("customerNotes", e.target.value)} placeholder="e.g. Gate code 1234, 4th floor, call on arrival" />
                </FormField>
                <div className="flex justify-end border-t pt-4">
                  <Button onClick={requestReview}>
                    Review order <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* ------------------------------- summary */}
        <Card className="border-primary/30 lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-base">Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {device ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {device.name} ({ownership === "PURCHASE" ? "purchase" : "rental"})
                  </span>
                  <span className="font-medium">{formatINR(hardware)}</span>
                </div>
                {ownership === "RENTAL" && money(device.securityDeposit) > 0 && (
                  <p className="-mt-1 text-[11px] text-muted-foreground">includes refundable deposit</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Pick a router to begin.</p>
            )}
            {basePlan && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{basePlan.name}</span>
                <span className="font-medium">{formatINR(basePlan.price)}</span>
              </div>
            )}
            {addOns.map((a) => (
              <div key={a.id} className="flex justify-between">
                <span className="text-muted-foreground">+ {a.name}</span>
                <span className="font-medium">{formatINR(a.price)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-3 text-base font-bold">
              <span>Due today</span>
              <span className="text-primary">{formatINR(total)}</span>
            </div>
            <Button className="w-full bg-gradient-to-r from-primary to-teal-500" disabled={!ready || checkout.isPending} onClick={requestReview}>
              {checkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ShieldCheck className="mr-2 h-4 w-4" /> Review &amp; pay
            </Button>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" /> Connection activates only after installation is completed.
            </p>
            <button
              type="button"
              onClick={() => (onSwitchTab ? onSwitchTab("my") : navigate("/wifi?tab=my"))}
              className="block w-full text-center text-xs text-primary underline-offset-4 hover:underline"
            >
              Already have Zylo WiFi? Manage your connection
            </button>
          </CardContent>
        </Card>
      </div>

      {/* review dialog */}
      <AppDialog
        open={reviewing}
        onOpenChange={setReviewing}
        size="lg"
        title="Review your Zylo WiFi order"
        icon={<Wifi className="h-5 w-5 text-primary" />}
        description="You will be redirected to our secure payment partner to complete the purchase."
      >
        {device && basePlan && (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border p-3">
              <p className="font-semibold">
                {device.name} — {ownership === "PURCHASE" ? "purchased" : "rented"}
              </p>
              <p className="text-muted-foreground">
                {BAND_TEXT[device.band]} · {device.wifiStandard} · up to {device.maxDevices} devices
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-semibold">{basePlan.name}</p>
              <p className="text-muted-foreground">
                {basePlan.speedMbps} Mbps · {basePlan.dataLimitGb ? `${basePlan.dataLimitGb} GB` : "Unlimited data"} · {basePlan.validityDays} days
              </p>
              {addOns.length > 0 && <p className="mt-1 text-muted-foreground">Boosters: {addOns.map((a) => a.name).join(", ")}</p>}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Router ({ownership.toLowerCase()}{ownership === "RENTAL" ? " + deposit" : ""})</span>
                <span>{formatINR(hardware)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plans (first cycle)</span>
                <span>{formatINR(plansTotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Total due today</span>
                <span className="text-primary">{formatINR(total)}</span>
              </div>
            </div>
            <Button className="w-full bg-gradient-to-r from-primary to-teal-500" disabled={checkout.isPending} onClick={pay}>
              {checkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay {formatINR(total)} securely
            </Button>
          </div>
        )}
      </AppDialog>
    </div>
  );
}

export default WifiStore;
