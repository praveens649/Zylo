import { useRef, useState } from "react";
import {
  Building2,
  ChevronRight,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  BusinessOrganization,
  RegisterBusinessPayload,
} from "@/api/onboarding.api";
import { storageApi } from "@/api/storage.api";
import { InvitePanel } from "./invite-panel";

const BUSINESS_TYPES = [
  "Private Limited",
  "LLP",
  "Partnership",
  "Sole Proprietorship",
  "Public Limited",
  "Other",
];

interface StepBusinessDetailsProps {
  existingOrg: BusinessOrganization | null;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (payload: RegisterBusinessPayload) => void;
}

export function StepBusinessDetails({
  existingOrg,
  isSubmitting,
  onBack,
  onSubmit,
}: StepBusinessDetailsProps) {
  const [name, setName] = useState(existingOrg?.name ?? "");
  const [businessType, setBusinessType] = useState(
    existingOrg?.businessType ?? BUSINESS_TYPES[0]
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    existingOrg?.registrationNumber ?? ""
  );
  const [businessEmail, setBusinessEmail] = useState(
    existingOrg?.businessEmail ?? ""
  );
  const [address, setAddress] = useState(existingOrg?.address ?? "");
  const [city, setCity] = useState(existingOrg?.city ?? "");
  const [state, setState] = useState(existingOrg?.state ?? "");
  const [postalCode, setPostalCode] = useState(existingOrg?.postalCode ?? "");
  const [numberPrefix, setNumberPrefix] = useState(
    existingOrg?.numberPrefix ?? ""
  );
  const [agreed, setAgreed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Verification document upload (optional)
  const docInputRef = useRef<HTMLInputElement>(null);
  const [documentFileId, setDocumentFileId] = useState<string | null>(
    existingOrg?.verificationDocumentId ?? null
  );
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const handleDocumentSelect = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setDocError("File must be under 10 MB.");
      return;
    }
    try {
      setDocError(null);
      setIsUploadingDoc(true);
      const saved = await storageApi.uploadDocument(file);
      setDocumentFileId(saved.id);
      setDocumentName(saved.filename);
    } catch (err: any) {
      setDocError(err?.message || "Upload failed. Try a different file.");
    } finally {
      setIsUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !name.trim() ||
      !businessEmail.trim() ||
      !address.trim() ||
      !city.trim() ||
      !state.trim() ||
      !postalCode.trim() ||
      !numberPrefix.trim()
    ) {
      setFormError("Please complete all mandatory business fields.");
      return;
    }
    if (!/^\d{6}$/.test(postalCode.trim())) {
      setFormError("PIN code must be a valid 6-digit Indian postal code.");
      return;
    }
    if (!/^\d{4}$/.test(numberPrefix.trim())) {
      setFormError("Corporate prefix must be exactly 4 digits (e.g. 0482).");
      return;
    }
    if (
      registrationNumber.trim() &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
        registrationNumber.trim().toUpperCase()
      )
    ) {
      setFormError("GSTIN must be a valid 15-character registration number.");
      return;
    }
    if (!agreed) {
      setFormError("You must accept the business verification declaration.");
      return;
    }
    setFormError(null);
    onSubmit({
      name: name.trim(),
      businessType,
      registrationNumber: registrationNumber.trim().toUpperCase() || undefined,
      businessEmail: businessEmail.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      numberPrefix: numberPrefix.trim(),
      verificationDocumentId: documentFileId ?? undefined,
    });
  };

  return (
    <Card className="border-border bg-card shadow-sm p-6 sm:p-8 animate-fade-up">
      <CardHeader className="p-0 mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
          <Building2 className="h-4 w-4" />
          Enterprise Verification
        </div>
        <CardTitle className="text-2xl font-display font-bold text-foreground">
          Step 2: Business Details
        </CardTitle>
        <CardDescription className="text-sm">
          Register your organization and request a dedicated 4-digit corporate
          number prefix for your team&apos;s SIMs.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="orgName" className="text-xs font-medium">
              Organization Name *
            </Label>
            <Input
              id="orgName"
              placeholder="e.g. Acme Industries Pvt Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="businessType" className="text-xs font-medium">
              Business Type *
            </Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger id="businessType" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="businessEmail" className="text-xs font-medium">
            Business Email *
          </Label>
          <Input
            id="businessEmail"
            type="email"
            placeholder="ops@yourcompany.com"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="registrationNumber" className="text-xs font-medium">
            GSTIN / Registration Number{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="registrationNumber"
            maxLength={15}
            placeholder="e.g. 29ABCDE1234F1Z5"
            value={registrationNumber}
            onChange={(e) =>
              setRegistrationNumber(e.target.value.toUpperCase())
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bizAddress" className="text-xs font-medium">
            Registered Office Address *
          </Label>
          <Input
            id="bizAddress"
            placeholder="Building, Street, Landmark"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bizCity" className="text-xs font-medium">
              City *
            </Label>
            <Input
              id="bizCity"
              placeholder="e.g. Mumbai"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bizState" className="text-xs font-medium">
              State *
            </Label>
            <Input
              id="bizState"
              placeholder="e.g. Maharashtra"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bizPostalCode" className="text-xs font-medium">
              PIN Code (6 Digits) *
            </Label>
            <Input
              id="bizPostalCode"
              maxLength={6}
              placeholder="e.g. 400001"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="numberPrefix" className="text-xs font-medium">
            Corporate Number Prefix (4 Digits) *
          </Label>
          <Input
            id="numberPrefix"
            maxLength={4}
            placeholder="e.g. 0482"
            value={numberPrefix}
            onChange={(e) => setNumberPrefix(e.target.value)}
            required
          />
          <p className="text-[11px] text-muted-foreground">
            All your team&apos;s numbers will begin with +91 followed by this
            prefix — e.g. +91 0482 XXXXXX.
          </p>
        </div>

        {/* Verification document upload */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Verification Document{" "}
            <span className="text-muted-foreground">
              (optional — GST certificate / registration proof)
            </span>
          </Label>

          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => handleDocumentSelect(e.target.files?.[0])}
          />

          {documentFileId ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate text-xs font-medium text-foreground">
                  {documentName ?? "Verification document uploaded"}
                </span>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setDocumentFileId(null);
                  setDocumentName(null);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              disabled={isUploadingDoc}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60"
            >
              {isUploadingDoc ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading document…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload PDF, JPG, PNG or WEBP (max 10 MB)
                </>
              )}
            </button>
          )}

          {docError && (
            <p className="text-[11px] font-medium text-destructive">
              {docError}
            </p>
          )}
        </div>

        {/* Legal Declaration */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="text-xs text-muted-foreground leading-snug">
              I solemnly declare that I am authorized to register this
              organization and that the details furnished above are accurate.
              This is a demo verification — the organization is auto-approved.
            </span>
          </label>
        </div>

        {formError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
            {formError}
          </div>
        )}

        {existingOrg?.status === "APPROVED" && (
          <InvitePanel organizationId={existingOrg.id} />
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
            disabled={isSubmitting || isUploadingDoc}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying Business…
              </>
            ) : (
              <>
                Verify Business & Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
