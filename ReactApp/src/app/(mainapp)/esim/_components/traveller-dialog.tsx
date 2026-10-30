import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import type {
  InternationalPlan,
  TravellerDetails,
} from "@/api/travel-esim.api";
import {
  useEsimCountryNumbers,
  useHoldEsimNumber,
  useReleaseEsimNumber,
} from "../_hooks/use-esim";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/format";
import { countryFlag, countryName, PASSPORT_COUNTRIES } from "../_lib/countries";

interface TravellerDialogProps {
  plan: InternationalPlan | null;
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (details: TravellerDetails) => void;
}

export function TravellerDialog({
  plan,
  open,
  isPending,
  onOpenChange,
  onSubmit,
}: TravellerDialogProps) {
  const [travellerName, setTravellerName] = useState("");
  const [passportCountry, setPassportCountry] = useState("IN");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiryDate, setPassportExpiryDate] = useState("");
  const [heldNumberId, setHeldNumberId] = useState<string | null>(null);
  const [heldUntil, setHeldUntil] = useState<string | null>(null);
  const [holdExpired, setHoldExpired] = useState(false);

  const country = open && plan ? plan.destinationCountry : null;
  const numbers = useEsimCountryNumbers(country);
  const hold = useHoldEsimNumber(country);
  const release = useReleaseEsimNumber(country);

  // When the hold's expiry time passes, clear the selection once.
  useEffect(() => {
    if (!heldUntil) return;
    const ms = new Date(heldUntil).getTime() - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => {
      setHeldNumberId(null);
      setHeldUntil(null);
      setHoldExpired(true);
      numbers.refetch();
    }, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heldUntil]);

  const pickNumber = (numberId: string) => {
    if (numberId === heldNumberId) {
      release.mutate(numberId);
      setHeldNumberId(null);
      setHeldUntil(null);
      return;
    }
    if (heldNumberId) release.mutate(heldNumberId);
    setHoldExpired(false);
    hold.mutate(numberId, {
      onSuccess: (res) => {
        setHeldNumberId(res.numberId);
        setHeldUntil(res.reservedUntil);
      },
    });
  };

  const valid =
    travellerName.trim().length >= 2 &&
    passportNumber.trim().length >= 6 &&
    passportNumber.trim().length <= 12 &&
    !!passportExpiryDate &&
    !!heldNumberId;

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({
      travellerName: travellerName.trim(),
      passportCountry,
      passportNumber: passportNumber.trim(),
      passportExpiryDate,
      phoneNumberId: heldNumberId ?? undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Traveller details
          </DialogTitle>
          <DialogDescription>
            Passport details are required to issue your travel eSIM.
          </DialogDescription>
        </DialogHeader>

        {plan && (
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {countryFlag(plan.destinationCountry)} {plan.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {plan.dataAllowanceMb >= 1024
                  ? `${plan.dataAllowanceMb / 1024} GB`
                  : `${plan.dataAllowanceMb} MB`}{" "}
                • {plan.validityDays} days
                {plan.callMinutes != null &&
                  ` • ${plan.callMinutes} mins`}
                {plan.smsCount != null && ` • ${plan.smsCount} SMS`} •{" "}
                {countryName(plan.destinationCountry)}
              </p>
            </div>
            <span className="font-display text-xl font-black text-foreground">
              {formatINR(plan.pricePaise / 100)}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="traveller-name" className="text-xs font-semibold">
              Full name (as on passport)
            </Label>
            <Input
              id="traveller-name"
              value={travellerName}
              onChange={(e) => setTravellerName(e.target.value)}
              placeholder="e.g. Rishi Gowtham"
              className="h-10 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">
                Passport country
              </Label>
              <Select
                value={passportCountry}
                onValueChange={setPassportCountry}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PASSPORT_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {countryFlag(c)} {countryName(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="passport-expiry" className="text-xs font-semibold">
                Passport expiry
              </Label>
              <DatePicker
                id="passport-expiry"
                value={passportExpiryDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={setPassportExpiryDate}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="passport-number" className="text-xs font-semibold">
              Passport number
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="passport-number"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                placeholder="e.g. A1234567"
                maxLength={12}
                className="h-10 pl-9 text-sm uppercase"
              />
            </div>
          </div>

          {/* Destination number — click to hold for 10 minutes */}
          {plan && (
            <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-sky-500" />
                  {countryName(plan.destinationCountry)} number{" "}
                  <span className="text-destructive">*</span>
                </Label>
              </div>

              {holdExpired && (
                <p className="text-[11px] text-amber-600">
                  Selection timed out — pick a number again.
                </p>
              )}

              {numbers.isPending ? (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading {countryName(plan.destinationCountry)} numbers…
                </div>
              ) : (numbers.data ?? []).length === 0 ? (
                <p className="text-[11px] text-destructive">
                  No {countryName(plan.destinationCountry)} numbers in
                  inventory — ask an admin to add numbers for this country.
                </p>
              ) : (
                <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                  {(numbers.data ?? []).map((n) => {
                    const held = n.id === heldNumberId;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => pickNumber(n.id)}
                        disabled={hold.isPending}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-mono transition-all ${
                          held
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        <span>{n.number}</span>
                        {held ? (
                          <span className="flex items-center gap-1 text-[10px] font-sans font-semibold text-primary">
                            <CheckCircle2 className="h-3 w-3" />
                            Selected
                          </span>
                        ) : n.type === "PREMIUM" ? (
                          <span className="text-[9px] font-sans font-semibold uppercase tracking-wide text-amber-600">
                            Premium
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">
                {heldNumberId
                  ? "This number is assigned to your eSIM after payment."
                  : "Choose the local number your eSIM will use for calls and SMS."}
              </p>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Stored encrypted. Secure payment via Stripe (test mode).
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-1.5" />
            )}
            Pay {plan ? formatINR(plan.pricePaise / 100) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
