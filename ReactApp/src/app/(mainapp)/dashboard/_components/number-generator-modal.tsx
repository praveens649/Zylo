import { AlertCircle, CheckCircle2, Flame, Globe, Loader2, Phone, Sparkles, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NumberCategory, GenerateNumbersResponse } from "@/api/numbers.api";

interface NumberGeneratorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category: NumberCategory;
  onCategoryChange: (cat: NumberCategory) => void;
  count: number;
  onCountChange: (count: number) => void;
  prefix: string;
  onPrefixChange: (prefix: string) => void;
  allowPremium: boolean;
  onAllowPremiumChange: (allow: boolean) => void;
  error: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  lastResult: GenerateNumbersResponse | null;
}

const COUNT_OPTIONS = [10, 25, 50, 100];

export function NumberGeneratorModal({
  isOpen,
  onOpenChange,
  category,
  onCategoryChange,
  count,
  onCountChange,
  prefix,
  onPrefixChange,
  allowPremium,
  onAllowPremiumChange,
  error,
  isGenerating,
  onGenerate,
  lastResult,
}: NumberGeneratorModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1 text-primary">
            <Zap className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Zylo Telecom Engine
            </span>
          </div>
          <DialogTitle className="text-xl font-display font-bold">
            Generate Mobile Numbers
          </DialogTitle>
          <DialogDescription className="text-xs">
            Synthesize unique, DoT-compliant Indian phone numbers (+91) with automated VIP tier detection. Numbers generated here immediately appear in Customer Onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Number Category Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">1. Select Number Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => onCategoryChange("PERSONAL")}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  category === "PERSONAL"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                    : "border-border bg-card hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">Personal</div>
                    <div className="text-[11px] text-muted-foreground">+91 [6-9]xxxxxxxxx</div>
                  </div>
                </div>
              </div>

              <div
                onClick={() => onCategoryChange("BUSINESS")}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  category === "BUSINESS"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                    : "border-border bg-card hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">Business</div>
                    <div className="text-[11px] text-muted-foreground">+91 [Prefix] xxxxxx</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Business 4-Digit Prefix (Conditional) */}
          {category === "BUSINESS" && (
            <div className="space-y-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 animate-fade-up">
              <Label htmlFor="prefixInput" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>Corporate 4-Digit Series Prefix *</span>
                <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-300">
                  Required
                </Badge>
              </Label>
              <Input
                id="prefixInput"
                placeholder="e.g. 7001, 8888, 9900"
                maxLength={4}
                value={prefix}
                onChange={(e) => onPrefixChange(e.target.value.replace(/\D/g, ""))}
                className="font-mono text-base tracking-widest bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                The engine locks this 4-digit corporate series prefix for the organization and randomizes the remaining 6 digits with Indian telecom validation.
              </p>
            </div>
          )}

          {/* Batch Generation Count */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">2. Batch Size</Label>
            <div className="grid grid-cols-4 gap-2">
              {COUNT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onCountChange(opt)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                    count === opt
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 hover:bg-muted text-foreground border-border"
                  }`}
                >
                  {opt} Numbers
                </button>
              ))}
            </div>
          </div>

          {/* VIP Pattern Classification Toggle */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">3. VIP Pattern Analyzer</Label>
            <div
              onClick={() => onAllowPremiumChange(!allowPremium)}
              className={`cursor-pointer rounded-xl border p-3 flex items-center justify-between transition-all ${
                allowPremium
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    Classify & Price VIP Numbers
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Detect repeating digits, mirror patterns, triplets, and ladders (Gold, Diamond, Royal)
                  </div>
                </div>
              </div>
              <Badge className={allowPremium ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}>
                {allowPremium ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Recent Generation Result Preview */}
          {lastResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 animate-fade-up">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Successfully Generated {lastResult.totalGenerated} Numbers
                </span>
                <span className="text-[11px]">
                  {lastResult.premiumCount || 0} VIP / {lastResult.standardCount || 0} Standard
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {lastResult.numbers.slice(0, 6).map((num) => (
                  <Badge
                    key={num.id}
                    variant="outline"
                    className="font-mono text-[11px] bg-background border-border/80"
                  >
                    {num.number}
                    {num.type === "PREMIUM" && (
                      <Sparkles className="h-3 w-3 text-amber-500 ml-1 inline" />
                    )}
                  </Badge>
                ))}
                {lastResult.numbers.length > 6 && (
                  <Badge variant="secondary" className="text-[10px]">
                    +{lastResult.numbers.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Close
          </Button>
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            className="font-semibold shadow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Synthesizing Numbers...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate {count} {category} Numbers
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
