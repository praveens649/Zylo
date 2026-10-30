import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon, ChevronRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KycDocumentType, SubmitKycPayload } from "@/api/onboarding.api";

interface StepKycProps {
  initialFullName: string;
  initialAddress: string;
  initialCity: string;
  initialState: string;
  initialPostalCode: string;
  initialDocumentType: KycDocumentType;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (payload: SubmitKycPayload) => void;
}

export function StepKyc({
  initialFullName,
  initialAddress,
  initialCity,
  initialState,
  initialPostalCode,
  initialDocumentType,
  isSubmitting,
  onBack,
  onSubmit,
}: StepKycProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [dateOfBirth, setDateOfBirth] = useState("1998-05-15");
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(initialCity);
  const [state, setState] = useState(initialState);
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [documentType, setDocumentType] =
    useState<KycDocumentType>(initialDocumentType);
  const [documentNumber, setDocumentNumber] = useState("");
  const [kycAgreed, setKycAgreed] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !fullName.trim() ||
      !address.trim() ||
      !city.trim() ||
      !state.trim() ||
      !postalCode.trim() ||
      !documentNumber.trim()
    ) {
      setKycError("Please complete all mandatory KYC fields.");
      return;
    }
    if (!/^\d{6}$/.test(postalCode.trim())) {
      setKycError("PIN code must be a valid 6-digit Indian postal code.");
      return;
    }
    if (!kycAgreed) {
      setKycError("You must accept the DoT verification declaration.");
      return;
    }
    setKycError(null);
    onSubmit({
      fullName: fullName.trim(),
      dateOfBirth: dateOfBirth || undefined,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      documentType,
      documentNumber: documentNumber.trim(),
    });
  };

  return (
    <Card className="border-border bg-card shadow-sm p-6 sm:p-8 animate-fade-up">
      <CardHeader className="p-0 mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
          <ShieldCheck className="h-4 w-4" />
          Department of Telecommunications (DoT) Mandate
        </div>
        <CardTitle className="text-2xl font-display font-bold text-foreground">
          Step 2: Customer Identity Verification
        </CardTitle>
        <CardDescription className="text-sm">
          Provide your official identity details to activate your personal telecom SIM line.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-medium">
              Full Legal Name *
            </Label>
            <Input
              id="fullName"
              placeholder="As per Government ID"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dateOfBirth" className="text-xs font-medium">
              Date of Birth *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="dateOfBirth"
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {dateOfBirth ? (
                    format(
                      parse(dateOfBirth, "yyyy-MM-dd", new Date()),
                      "dd MMM yyyy"
                    )
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  selected={
                    isValid(parse(dateOfBirth, "yyyy-MM-dd", new Date()))
                      ? parse(dateOfBirth, "yyyy-MM-dd", new Date())
                      : undefined
                  }
                  defaultMonth={
                    isValid(parse(dateOfBirth, "yyyy-MM-dd", new Date()))
                      ? parse(dateOfBirth, "yyyy-MM-dd", new Date())
                      : new Date(2000, 0)
                  }
                  startMonth={new Date(1940, 0)}
                  endMonth={new Date()}
                  onSelect={(d) =>
                    setDateOfBirth(d ? format(d, "yyyy-MM-dd") : "")
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-xs font-medium">
            Permanent Address *
          </Label>
          <Input
            id="address"
            placeholder="Flat/Door No, Street Name, Landmark"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs font-medium">
              City *
            </Label>
            <Input
              id="city"
              placeholder="e.g. Chennai"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="state" className="text-xs font-medium">
              State *
            </Label>
            <Input
              id="state"
              placeholder="e.g. Tamil Nadu"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="postalCode" className="text-xs font-medium">
              PIN Code (6 Digits) *
            </Label>
            <Input
              id="postalCode"
              maxLength={6}
              placeholder="e.g. 600001"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="documentType" className="text-xs font-medium">
              Identity Document Type *
            </Label>
            <Select
              value={documentType}
              onValueChange={(v) => setDocumentType(v as KycDocumentType)}
            >
              <SelectTrigger id="documentType" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AADHAAR">Aadhaar Card (12 Digits)</SelectItem>
                <SelectItem value="PAN">PAN Card (10 Chars)</SelectItem>
                <SelectItem value="PASSPORT">Indian Passport</SelectItem>
                <SelectItem value="DRIVING_LICENSE">Driving License</SelectItem>
                <SelectItem value="VOTER_ID">Voter ID</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="documentNumber" className="text-xs font-medium">
              Document Number *
            </Label>
            <Input
              id="documentNumber"
              placeholder={
                documentType === "AADHAAR"
                  ? "123456789012"
                  : documentType === "PAN"
                  ? "ABCDE1234F"
                  : "Enter Document Number"
              }
              value={documentNumber}
              onChange={(e) =>
                setDocumentNumber(e.target.value.toUpperCase())
              }
              required
            />
          </div>
        </div>

        {/* Legal Declaration */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              checked={kycAgreed}
              onChange={(e) => setKycAgreed(e.target.checked)}
            />
            <span className="text-xs text-muted-foreground leading-snug">
              I solemnly declare that the details furnished above are accurate and true. I understand this will be verified per Indian Telecom rules prior to SIM allocation.
            </span>
          </label>
        </div>

        {kycError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
            {kycError}
          </div>
        )}

        <div className="flex justify-between items-center pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back
          </Button>

          <Button
            type="submit"
            size="lg"
            className="font-semibold px-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying KYC…
              </>
            ) : (
              <>
                Verify KYC & Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
