import { useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Phone,
  Plane,
  Signal,
  Sparkles,
  Wifi,
} from "lucide-react";
import { AppDialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CreateInternationalPlanInput,
  InternationalPlan,
} from "@/api/travel-esim.api";
import { useToast } from "@/hooks/use-toast";
import { useCreateEsimPlan, useUpdateEsimPlan } from "../_hooks/use-esim-plans";
import {
  countryFlag,
  countryName,
  COUNTRIES,
} from "../../esim/_lib/countries";

interface EsimPlanFormDialogProps {
  open: boolean;
  plan: InternationalPlan | null;
  onOpenChange: (open: boolean) => void;
}

interface EsimPlanFormInnerProps {
  plan: InternationalPlan | null;
  onClose: () => void;
}

function EsimPlanFormInner({ plan, onClose }: EsimPlanFormInnerProps) {
  const { toast } = useToast();
  const isEdit = !!plan;

  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [destinationCountry, setDestinationCountry] = useState(
    plan?.destinationCountry ?? "SG"
  );
  const [priceRupees, setPriceRupees] = useState(
    plan ? String(plan.pricePaise / 100) : "799"
  );
  const [validityDays, setValidityDays] = useState(
    plan ? String(plan.validityDays) : "7"
  );
  const [dataGb, setDataGb] = useState(
    plan ? String(plan.dataAllowanceMb / 1024) : "5"
  );
  const [callMinutes, setCallMinutes] = useState(
    plan?.callMinutes != null ? String(plan.callMinutes) : "100"
  );
  const [smsCount, setSmsCount] = useState(
    plan?.smsCount != null ? String(plan.smsCount) : "100"
  );
  const [providerName, setProviderName] = useState(plan?.providerName ?? "");
  const [providerPlanCode, setProviderPlanCode] = useState(
    plan?.providerPlanCode ?? ""
  );
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateEsimPlan(() => {
    toast({
      title: "eSIM Plan Created",
      description: `"${name}" is now live for ${countryName(destinationCountry)} travellers.`,
    });
    onClose();
  });

  const updateMutation = useUpdateEsimPlan(() => {
    toast({
      title: "Plan Updated",
      description: `"${name}" has been successfully updated.`,
    });
    onClose();
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const hasVoice = callMinutes !== "" || smsCount !== "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a plan name.");
      return;
    }
    const numPrice = parseFloat(priceRupees);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError("Please enter a valid price (₹1 or more).");
      return;
    }
    const numValidity = parseInt(validityDays, 10);
    if (isNaN(numValidity) || numValidity < 1) {
      setError("Validity must be at least 1 day.");
      return;
    }
    const numGb = parseFloat(dataGb);
    if (isNaN(numGb) || numGb <= 0) {
      setError("Please enter a data allowance in GB.");
      return;
    }

    const payload: CreateInternationalPlanInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      destinationCountry,
      dataAllowanceMb: Math.round(numGb * 1024),
      validityDays: numValidity,
      callMinutes: callMinutes !== "" ? parseInt(callMinutes, 10) : undefined,
      smsCount: smsCount !== "" ? parseInt(smsCount, 10) : undefined,
      pricePaise: Math.round(numPrice * 100),
      providerName: providerName.trim() || undefined,
      providerPlanCode: providerPlanCode.trim() || undefined,
      isActive,
    };

    if (isEdit && plan) {
      updateMutation.mutate(
        { id: plan.id, input: payload },
        {
          onError: (err: unknown) => {
            setError(
              err instanceof Error ? err.message : "Failed to update plan"
            );
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onError: (err: unknown) => {
          setError(
            err instanceof Error ? err.message : "Failed to create plan"
          );
        },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Input Fields */}
        <div className="space-y-5 lg:col-span-7">
          {/* Section 1: Plan Essentials */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Plan Essentials
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-sky-500/30 text-sky-500"
              >
                {countryFlag(destinationCountry)} {destinationCountry}
              </Badge>
            </div>

            <div>
              <Label htmlFor="esim-name" className="text-xs font-medium">
                Plan Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="esim-name"
                placeholder="e.g. Singapore 5 GB + Calls"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-9"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-medium">Destination</Label>
                <Select
                  value={destinationCountry}
                  onValueChange={setDestinationCountry}
                >
                  <SelectTrigger className="mt-1.5 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(COUNTRIES).map((c) => (
                      <SelectItem key={c} value={c}>
                        {countryFlag(c)} {countryName(c)} ({c})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="esim-price" className="text-xs font-medium">
                  Price (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="esim-price"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="799"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  className="mt-1.5 h-9"
                  required
                />
              </div>

              <div>
                <Label htmlFor="esim-validity" className="text-xs font-medium">
                  Validity (Days) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="esim-validity"
                  type="number"
                  min="1"
                  placeholder="7"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="mt-1.5 h-9"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="esim-desc" className="text-xs font-medium">
                Promotional Tagline / Description
              </Label>
              <Input
                id="esim-desc"
                placeholder="e.g. 5 GB data, 100 mins calls and 100 SMS"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5 h-9"
              />
            </div>
          </div>

          {/* Section 2: Pack Allowances */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              2. Pack Quotas & Allowances
            </span>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="esim-data" className="text-xs font-medium">
                  Data Allowance (GB) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="esim-data"
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="5"
                  value={dataGb}
                  onChange={(e) => setDataGb(e.target.value)}
                  className="mt-1.5 h-9"
                  required
                />
                <span className="text-[10px] text-muted-foreground">
                  Total pack data
                </span>
              </div>

              <div>
                <Label htmlFor="esim-calls" className="text-xs font-medium">
                  Call Minutes
                </Label>
                <Input
                  id="esim-calls"
                  type="number"
                  min="0"
                  placeholder="100"
                  value={callMinutes}
                  onChange={(e) => setCallMinutes(e.target.value)}
                  className="mt-1.5 h-9"
                />
                <span className="text-[10px] text-muted-foreground">
                  Empty = data-only pack
                </span>
              </div>

              <div>
                <Label htmlFor="esim-sms" className="text-xs font-medium">
                  SMS Count
                </Label>
                <Input
                  id="esim-sms"
                  type="number"
                  min="0"
                  placeholder="100"
                  value={smsCount}
                  onChange={(e) => setSmsCount(e.target.value)}
                  className="mt-1.5 h-9"
                />
                <span className="text-[10px] text-muted-foreground">
                  Total bundled SMS
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Provider & Visibility */}
          <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-indigo-500/5 p-4 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-500 flex items-center gap-1.5">
              <Signal className="h-3.5 w-3.5" />
              3. Provider & Visibility
            </span>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="esim-provider" className="text-xs font-medium">
                  Provider Name
                </Label>
                <Input
                  id="esim-provider"
                  placeholder="e.g. eSIM Go (optional)"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="mt-1.5 h-9"
                />
              </div>
              <div>
                <Label htmlFor="esim-provider-code" className="text-xs font-medium">
                  Provider Plan Code
                </Label>
                <Input
                  id="esim-provider-code"
                  placeholder="e.g. SG-5GB-7D (optional)"
                  value={providerPlanCode}
                  onChange={(e) => setProviderPlanCode(e.target.value)}
                  className="mt-1.5 h-9"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2.5 cursor-pointer hover:bg-card w-fit">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-primary text-primary"
              />
              <div className="text-xs">
                <p className="font-semibold flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Visible to customers
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Right: Live Customer Preview */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="sticky top-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Live Customer Preview
              </span>
              <Badge variant="outline" className="text-[10px]">
                Real-time Render
              </Badge>
            </div>

            {/* Preview card — mirrors the customer Travel eSIM plan card */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-b from-card to-card/70 p-5 shadow-2xl ring-1 ring-primary/20">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />

              <div className="flex items-start justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] border-primary/30 bg-primary/10 text-primary"
                  >
                    {countryFlag(destinationCountry)} {destinationCountry}
                  </Badge>
                  {!hasVoice && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-slate-500/30 text-slate-400"
                    >
                      Data-only
                    </Badge>
                  )}
                </div>
                <Badge
                  className={
                    isActive
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]"
                      : "bg-muted text-muted-foreground text-[10px]"
                  }
                >
                  {isActive ? "Available" : "Draft / Hidden"}
                </Badge>
              </div>

              <div className="mt-4 flex items-baseline justify-between gap-2 border-b border-border/40 pb-4">
                <div className="min-w-0">
                  <h4 className="font-display text-lg font-bold tracking-tight text-foreground truncate">
                    {dataGb ? `${parseFloat(dataGb) || dataGb} GB` : "0 GB"}
                  </h4>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {name || `Untitled ${countryName(destinationCountry)} Pack`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-2xl font-black tracking-tight text-foreground">
                    ₹{parseFloat(priceRupees || "0").toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {validityDays || 0} days
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
                  <Wifi className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-semibold text-muted-foreground">
                      Data
                    </p>
                    <p className="truncate text-xs font-semibold">
                      {dataGb ? `${dataGb} GB` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-semibold text-muted-foreground">
                      Validity
                    </p>
                    <p className="truncate text-xs font-semibold">
                      {validityDays || 0} days
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
                  <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-semibold text-muted-foreground">
                      Calls
                    </p>
                    <p className="truncate text-xs font-semibold">
                      {callMinutes !== "" ? `${callMinutes} mins` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
                  <MessageSquare className="h-4 w-4 shrink-0 text-cyan-500" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-semibold text-muted-foreground">
                      SMS
                    </p>
                    <p className="truncate text-xs font-semibold">
                      {smsCount !== "" ? `${smsCount}` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-3.5 flex items-center gap-1.5 border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground">
                <Signal className="h-3 w-3 shrink-0" />
                {hasVoice
                  ? "Install before you travel — activates at your destination."
                  : "Data-only eSIM — no calls or SMS. Install before you travel."}
              </p>

              <div className="mt-4 pt-3 border-t border-border/50">
                <Button
                  type="button"
                  className="w-full h-9 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 font-semibold text-xs pointer-events-none"
                >
                  Select — {countryName(destinationCountry)} eSIM
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              This preview updates in real-time as you tweak values in the
              form.
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="min-w-[140px] font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-md"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Publish Plan"
          )}
        </Button>
      </div>
    </form>
  );
}

export function EsimPlanFormDialog({
  open,
  plan,
  onOpenChange,
}: EsimPlanFormDialogProps) {
  const isEdit = !!plan;

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={isEdit ? "Edit Travel eSIM Plan" : "Create Travel eSIM Plan"}
      icon={<Plane className="h-5 w-5 text-primary" />}
      description="Configure a country pack — data, validity, price and optional call/SMS bundle."
    >
      {open && (
        <EsimPlanFormInner
          key={plan?.id ?? "new"}
          plan={plan}
          onClose={() => onOpenChange(false)}
        />
      )}
    </AppDialog>
  );
}
