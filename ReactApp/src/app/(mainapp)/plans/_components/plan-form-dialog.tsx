import { useState } from "react";
import {
  Zap,
  Phone,
  Wifi,
  Calendar,
  MessageSquare,
  Database,
  ArrowRightLeft,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { AppDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Plan, PlanType, CreatePlanInput, UpdatePlanInput } from "@/api/plans.api";
import { useCreatePlan, useUpdatePlan } from "../_hooks/use-plans";
import { useToast } from "@/hooks/use-toast";

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: Plan | null;
  duplicateFrom?: Plan | null;
}

interface PlanFormInnerProps {
  plan?: Plan | null;
  duplicateFrom?: Plan | null;
  onClose: () => void;
}

function PlanFormInner({ plan, duplicateFrom, onClose }: PlanFormInnerProps) {
  const { toast } = useToast();
  const isEdit = !!plan && !duplicateFrom;
  const basePlan = plan || duplicateFrom;

  // Initialize form states from basePlan or defaults
  const [name, setName] = useState(
    basePlan ? (duplicateFrom ? `${basePlan.name} (Copy)` : basePlan.name) : ""
  );
  const [description, setDescription] = useState(basePlan?.description ?? "");
  const [type, setType] = useState<PlanType>(basePlan?.type ?? "PREPAID");
  const [price, setPrice] = useState<string>(basePlan ? String(basePlan.price) : "299");
  const [validityDays, setValidityDays] = useState<string>(
    basePlan ? String(basePlan.validityDays) : "28"
  );
  const [dataAllowanceGb, setDataAllowanceGb] = useState<string>(
    basePlan?.dataAllowanceGb !== null && basePlan?.dataAllowanceGb !== undefined
      ? String(basePlan.dataAllowanceGb)
      : "1.5"
  );
  const [callingBenefit, setCallingBenefit] = useState<string>(
    basePlan?.callingBenefit ?? "Unlimited (Local, STD, Roaming)"
  );
  const [smsCount, setSmsCount] = useState<string>(
    basePlan?.smsCount !== null && basePlan?.smsCount !== undefined
      ? String(basePlan.smsCount)
      : "100"
  );

  // Innovation & Flags
  const [dataBankEnabled, setDataBankEnabled] = useState<boolean>(
    basePlan ? basePlan.dataBankEnabled : true
  );
  const [rolloverLimitMb, setRolloverLimitMb] = useState<string>(
    basePlan?.rolloverLimitMb ? String(basePlan.rolloverLimitMb) : "10240"
  );
  const [rolloverExpiryDays, setRolloverExpiryDays] = useState<string>(
    basePlan?.rolloverExpiryDays ? String(basePlan.rolloverExpiryDays) : "90"
  );

  const [dataTransferEnabled, setDataTransferEnabled] = useState<boolean>(
    basePlan ? basePlan.dataTransferEnabled : true
  );
  const [transferLimitMb, setTransferLimitMb] = useState<string>(
    basePlan?.transferLimitMb ? String(basePlan.transferLimitMb) : "2048"
  );

  const [isFeatured, setIsFeatured] = useState<boolean>(basePlan?.isFeatured ?? false);
  const [businessOnly, setBusinessOnly] = useState<boolean>(basePlan?.businessOnly ?? false);
  const [isValidityOnly, setIsValidityOnly] = useState<boolean>(basePlan?.isValidityOnly ?? false);
  const [isActive, setIsActive] = useState<boolean>(basePlan?.isActive ?? true);

  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreatePlan(() => {
    toast({
      title: "Recharge Plan Created",
      description: `Plan "${name}" has been published to the catalog.`,
    });
    onClose();
  });

  const updateMutation = useUpdatePlan(() => {
    toast({
      title: "Plan Updated",
      description: `Plan "${name}" has been successfully updated.`,
    });
    onClose();
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a plan name.");
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError("Please enter a valid price (₹0 or more).");
      return;
    }

    const numValidity = parseInt(validityDays, 10);
    if (isNaN(numValidity) || numValidity < 1) {
      setError("Validity must be at least 1 day.");
      return;
    }

    const payload: CreatePlanInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      price: numPrice,
      currency: "inr",
      validityDays: numValidity,
      dataAllowanceGb: dataAllowanceGb ? parseFloat(dataAllowanceGb) : null,
      callingBenefit: callingBenefit.trim() || "Unlimited",
      smsCount: smsCount ? parseInt(smsCount, 10) : null,
      businessOnly,
      isActive,
      isFeatured,
      isValidityOnly,
      dataBankEnabled,
      rolloverLimitMb: dataBankEnabled && rolloverLimitMb ? parseInt(rolloverLimitMb, 10) : null,
      rolloverExpiryDays: dataBankEnabled && rolloverExpiryDays ? parseInt(rolloverExpiryDays, 10) : null,
      dataTransferEnabled,
      transferLimitMb: dataTransferEnabled && transferLimitMb ? parseInt(transferLimitMb, 10) : null,
    };

    if (isEdit && plan) {
      updateMutation.mutate(
        { id: plan.id, input: payload as UpdatePlanInput },
        {
          onError: (err: unknown) => {
            setError(err instanceof Error ? err.message : "Failed to update plan");
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onError: (err: unknown) => {
          setError(err instanceof Error ? err.message : "Failed to create plan");
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
          {/* Section 1: Basic Information */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Plan Essentials
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {type}
              </Badge>
            </div>

            <div>
              <Label htmlFor="plan-name" className="text-xs font-medium">
                Plan Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-name"
                placeholder="e.g. Zylo Unlimited Hero 299"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-9"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="plan-type" className="text-xs font-medium">
                  Category Type
                </Label>
                <Select
                  value={type}
                  onValueChange={(val: PlanType) => {
                    setType(val);
                    if (val === "BUSINESS") setBusinessOnly(true);
                    if (val === "VALIDITY_ONLY") setIsValidityOnly(true);
                  }}
                >
                  <SelectTrigger id="plan-type" className="mt-1.5 h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREPAID">Prepaid</SelectItem>
                    <SelectItem value="POSTPAID">Postpaid</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="VALIDITY_ONLY">Validity Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="plan-price" className="text-xs font-medium">
                  Price (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="plan-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="299"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1.5 h-9"
                  required
                />
              </div>

              <div>
                <Label htmlFor="plan-validity" className="text-xs font-medium">
                  Validity (Days) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="plan-validity"
                  type="number"
                  min="1"
                  placeholder="28"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="mt-1.5 h-9"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="plan-desc" className="text-xs font-medium">
                Promotional Tagline / Description
              </Label>
              <Input
                id="plan-desc"
                placeholder="e.g. Truly Unlimited Voice Calls + 1.5 GB/day High-Speed Data"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5 h-9"
              />
            </div>
          </div>

          {/* Section 2: Telecom Allowances */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              2. Telecom Quotas & Allowances
            </span>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="plan-data" className="text-xs font-medium">
                  Data Allowance (GB)
                </Label>
                <Input
                  id="plan-data"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="1.5"
                  value={dataAllowanceGb}
                  onChange={(e) => setDataAllowanceGb(e.target.value)}
                  className="mt-1.5 h-9"
                />
                <span className="text-[10px] text-muted-foreground">
                  {type === "POSTPAID" ? "Monthly pool" : "Per day allowance"}
                </span>
              </div>

              <div>
                <Label htmlFor="plan-calls" className="text-xs font-medium">
                  Calling Benefit
                </Label>
                <Input
                  id="plan-calls"
                  placeholder="Unlimited"
                  value={callingBenefit}
                  onChange={(e) => setCallingBenefit(e.target.value)}
                  className="mt-1.5 h-9"
                />
              </div>

              <div>
                <Label htmlFor="plan-sms" className="text-xs font-medium">
                  SMS Count
                </Label>
                <Input
                  id="plan-sms"
                  type="number"
                  min="0"
                  placeholder="100"
                  value={smsCount}
                  onChange={(e) => setSmsCount(e.target.value)}
                  className="mt-1.5 h-9"
                />
                <span className="text-[10px] text-muted-foreground">Per day or total</span>
              </div>
            </div>
          </div>

          {/* Section 3: Zylo Innovations (Data Bank & Transfer) */}
          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-indigo-500/5 to-teal-500/5 p-4 space-y-4 border-indigo-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                3. Zylo Innovation Features
              </span>
              <span className="text-[10px] text-muted-foreground">Product Differentiators</span>
            </div>

            {/* Data Bank Row */}
            <div className="space-y-3 rounded-lg border border-border/50 bg-card/60 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Zylo Data Bank Rollover</p>
                  <p className="text-[11px] text-muted-foreground">
                    Save unused eligible data into customer data bank
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={dataBankEnabled}
                    onChange={(e) => setDataBankEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {dataBankEnabled && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                  <div>
                    <Label htmlFor="rollover-cap" className="text-[11px]">
                      Rollover Cap (MB)
                    </Label>
                    <Input
                      id="rollover-cap"
                      type="number"
                      placeholder="10240"
                      value={rolloverLimitMb}
                      onChange={(e) => setRolloverLimitMb(e.target.value)}
                      className="mt-1 h-8 text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {rolloverLimitMb ? `≈ ${Math.round(parseInt(rolloverLimitMb || "0", 10) / 1024)} GB` : ""}
                    </span>
                  </div>
                  <div>
                    <Label htmlFor="rollover-expiry" className="text-[11px]">
                      Expiry Period (Days)
                    </Label>
                    <Input
                      id="rollover-expiry"
                      type="number"
                      placeholder="90"
                      value={rolloverExpiryDays}
                      onChange={(e) => setRolloverExpiryDays(e.target.value)}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Data Transfer Row */}
            <div className="space-y-3 rounded-lg border border-border/50 bg-card/60 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Peer-to-Peer Data Transfer</p>
                  <p className="text-[11px] text-muted-foreground">
                    Allow gifting/transferring data to other Zylo numbers
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={dataTransferEnabled}
                    onChange={(e) => setDataTransferEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              {dataTransferEnabled && (
                <div className="pt-2 border-t border-border/40">
                  <Label htmlFor="transfer-limit" className="text-[11px]">
                    Transfer Limit (MB)
                  </Label>
                  <Input
                    id="transfer-limit"
                    type="number"
                    placeholder="2048"
                    value={transferLimitMb}
                    onChange={(e) => setTransferLimitMb(e.target.value)}
                    className="mt-1 h-8 text-xs max-w-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {transferLimitMb ? `≈ ${Math.round(parseInt(transferLimitMb || "0", 10) / 1024)} GB per transfer` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Badges & Flags */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              4. Badges & Restrictions
            </span>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Featured Badge */}
              <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2.5 cursor-pointer hover:bg-card">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-primary text-primary"
                />
                <div className="text-xs">
                  <p className="font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Featured
                  </p>
                  <p className="text-[10px] text-muted-foreground">Best-deal pill</p>
                </div>
              </label>

              {/* Business SIM Only */}
              <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2.5 cursor-pointer hover:bg-card">
                <input
                  type="checkbox"
                  checked={businessOnly}
                  onChange={(e) => setBusinessOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-primary text-primary"
                />
                <div className="text-xs">
                  <p className="font-semibold flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-blue-500" />
                    Business Only
                  </p>
                  <p className="text-[10px] text-muted-foreground">Restricted to orgs</p>
                </div>
              </label>

              {/* Validity Only */}
              <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2.5 cursor-pointer hover:bg-card">
                <input
                  type="checkbox"
                  checked={isValidityOnly}
                  onChange={(e) => setIsValidityOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-primary text-primary"
                />
                <div className="text-xs">
                  <p className="font-semibold flex items-center gap-1">
                    <Zap className="h-3 w-3 text-emerald-500" />
                    Validity Only
                  </p>
                  <p className="text-[10px] text-muted-foreground">No standard data</p>
                </div>
              </label>

              {/* Is Active */}
              <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2.5 cursor-pointer hover:bg-card">
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
                  <p className="text-[10px] text-muted-foreground">Published to users</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Card Preview */}
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

            {/* Preview Card Mockup */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-b from-card to-card/70 p-5 shadow-2xl ring-1 ring-primary/20">
              {/* Glowing top line */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isFeatured
                    ? "bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500"
                    : type === "BUSINESS" || businessOnly
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500"
                    : type === "POSTPAID"
                    ? "bg-gradient-to-r from-violet-600 to-purple-400"
                    : "bg-gradient-to-r from-primary to-primary/60"
                }`}
              />

              <div className="flex items-start justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {isFeatured && (
                    <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] font-semibold px-2 py-0.5">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Featured Deal
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    {type}
                  </Badge>
                  {businessOnly && (
                    <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                      <Building2 className="h-3 w-3 mr-1" />
                      Biz Only
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

              {/* Price & Name */}
              <div className="mt-4 flex items-baseline justify-between gap-2 border-b border-border/40 pb-4">
                <div className="min-w-0">
                  <h4 className="font-display text-lg font-bold tracking-tight text-foreground truncate">
                    {name || "Untitled Recharge Pack"}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {description || "High-speed 5G network coverage across India"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-2xl font-black tracking-tight text-foreground">
                    ₹{parseFloat(price || "0").toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {validityDays || 0} Days Validity
                  </div>
                </div>
              </div>

              {/* Benefits Pills */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
                  <Wifi className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-semibold text-muted-foreground">Data</p>
                    <p className="truncate text-xs font-semibold">
                      {dataAllowanceGb ? `${dataAllowanceGb} GB ${type === "POSTPAID" ? "Pool" : "/ day"}` : "None"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
                  <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-semibold text-muted-foreground">Voice</p>
                    <p className="truncate text-xs font-semibold">
                      {callingBenefit || "Unlimited"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
                  <Calendar className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-semibold text-muted-foreground">Validity</p>
                    <p className="truncate text-xs font-semibold">
                      {validityDays || 0} Days
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
                  <MessageSquare className="h-4 w-4 shrink-0 text-cyan-500" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-semibold text-muted-foreground">SMS</p>
                    <p className="truncate text-xs font-semibold">
                      {smsCount ? `${smsCount} SMS` : "Standard"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Innovations tags */}
              {(dataBankEnabled || dataTransferEnabled || isValidityOnly) && (
                <div className="mt-3.5 flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
                  {dataBankEnabled && (
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-[10px]">
                      <Database className="h-3 w-3 mr-1" />
                      Data Bank {rolloverLimitMb ? `${Math.round(parseInt(rolloverLimitMb, 10) / 1024)}GB` : ""}
                    </Badge>
                  )}
                  {dataTransferEnabled && (
                    <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30 text-[10px]">
                      <ArrowRightLeft className="h-3 w-3 mr-1" />
                      Data Transfer
                    </Badge>
                  )}
                  {isValidityOnly && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                      <Zap className="h-3 w-3 mr-1" />
                      Validity Pack
                    </Badge>
                  )}
                </div>
              )}

              {/* Simulated Customer Button */}
              <div className="mt-4 pt-3 border-t border-border/50">
                <Button
                  type="button"
                  className="w-full h-9 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 font-semibold text-xs pointer-events-none"
                >
                  Recharge Now (₹{parseFloat(price || "0").toLocaleString("en-IN")})
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              This preview updates in real-time as you tweak values in the form.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Action Buttons */}
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

export function PlanFormDialog({
  open,
  onOpenChange,
  plan,
  duplicateFrom,
}: PlanFormDialogProps) {
  const isEdit = !!plan && !duplicateFrom;

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={
        isEdit
          ? "Edit Recharge Plan"
          : duplicateFrom
          ? `Duplicate Plan: ${duplicateFrom.name}`
          : "Create New Recharge Plan"
      }
      icon={<Zap className="h-5 w-5 text-primary" />}
      description="Configure telecommunication pricing, quota allowances, and Zylo Data Bank innovation settings."
    >
      {open && (
        <PlanFormInner
          key={plan?.id ?? duplicateFrom?.id ?? "new"}
          plan={plan}
          duplicateFrom={duplicateFrom}
          onClose={() => onOpenChange(false)}
        />
      )}
    </AppDialog>
  );
}
