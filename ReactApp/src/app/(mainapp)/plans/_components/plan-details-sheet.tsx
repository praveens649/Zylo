import {
  Phone,
  MessageSquare,
  Wifi,
  Sparkles,
  Database,
  Calendar,
  CheckCircle2,
  XCircle,
  Copy,
  Edit3,
  Trash2,
  ShoppingBag,
  Users,
} from "lucide-react";
import type { Plan } from "@/api/plans.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface PlanDetailsSheetProps {
  plan: Plan | null;
  onClose: () => void;
  onEdit: (plan: Plan) => void;
  onDuplicate: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onToggleStatus: (plan: Plan) => void;
}

export function PlanDetailsSheet({
  plan,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
}: PlanDetailsSheetProps) {
  if (!plan) return null;

  return (
    <Sheet open={!!plan} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs font-semibold uppercase tracking-wider"
            >
              {plan.type}
            </Badge>
            {plan.isFeatured && (
              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Featured Deal
              </Badge>
            )}
            <Badge
              className={
                plan.isActive
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs"
                  : "bg-muted text-muted-foreground text-xs"
              }
            >
              {plan.isActive ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Inactive
                </span>
              )}
            </Badge>
          </div>

          <SheetTitle className="font-display text-2xl font-bold tracking-tight">
            {plan.name}
          </SheetTitle>
          {plan.description && (
            <SheetDescription className="text-xs text-muted-foreground">
              {plan.description}
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Big Price & Validity Block */}
        <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs uppercase font-semibold text-muted-foreground">
                Plan Price
              </span>
              <div className="font-display text-3xl font-black text-foreground">
                ₹{Number(plan.price).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase font-semibold text-muted-foreground">
                Validity
              </span>
              <div className="font-display text-xl font-bold text-foreground">
                {plan.validityDays} Days
              </div>
            </div>
          </div>
        </div>

        {/* Quotas & Allowances */}
        <div className="mt-6 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Telecom Allowances
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-primary">
                <Wifi className="h-4 w-4" />
                <span className="text-xs font-semibold">Data Allowance</span>
              </div>
              <p className="mt-2 text-base font-bold text-foreground">
                {plan.dataAllowanceGb ? `${plan.dataAllowanceGb} GB / day` : "None"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {plan.dailyDataAllowanceMb
                  ? `Daily sim pool: ${plan.dailyDataAllowanceMb} MB`
                  : "No daily sim pool"}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-emerald-500">
                <Phone className="h-4 w-4" />
                <span className="text-xs font-semibold">Voice Calls</span>
              </div>
              <p className="mt-2 text-base font-bold text-foreground truncate">
                {plan.callingBenefit || "Unlimited"}
              </p>
              <p className="text-[11px] text-muted-foreground">Pan-India coverage</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-cyan-500">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs font-semibold">SMS Quota</span>
              </div>
              <p className="mt-2 text-base font-bold text-foreground">
                {plan.smsCount ? `${plan.smsCount} / day` : "Standard"}
              </p>
              <p className="text-[11px] text-muted-foreground">National & local</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-amber-500">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-semibold">Billing Term</span>
              </div>
              <p className="mt-2 text-base font-bold text-foreground">
                {plan.validityDays} Days
              </p>
              <p className="text-[11px] text-muted-foreground">One-time recharge</p>
            </div>
          </div>
        </div>

        {/* Zylo Innovations Section */}
        <div className="mt-6 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            Zylo Core Innovations
          </h4>

          {/* Data Bank Details */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400">Zylo Data Bank Rollover</span>
              <Badge
                variant="outline"
                className={
                  plan.dataBankEnabled
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-xs"
                    : "text-muted-foreground text-xs"
                }
              >
                {plan.dataBankEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            {plan.dataBankEnabled ? (
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Rollover Cap:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {plan.rolloverLimitMb
                      ? `${Math.round(plan.rolloverLimitMb / 1024)} GB (${plan.rolloverLimitMb} MB)`
                      : "Uncapped"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Lot Expiry:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {plan.rolloverExpiryDays ? `${plan.rolloverExpiryDays} Days` : "90 Days"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Unused daily data expires at midnight and is not saved to the bank.
              </p>
            )}
          </div>

          {/* Peer Data Transfer */}
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-400">Peer-to-Peer Data Transfer</span>
              <Badge
                variant="outline"
                className={
                  plan.dataTransferEnabled
                    ? "bg-teal-500/10 text-teal-400 border-teal-500/30 text-xs"
                    : "text-muted-foreground text-xs"
                }
              >
                {plan.dataTransferEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            {plan.dataTransferEnabled ? (
              <div className="text-xs pt-1">
                <span className="text-muted-foreground">Max Per Transfer:</span>{" "}
                <span className="font-semibold text-foreground">
                  {plan.transferLimitMb
                    ? `${Math.round(plan.transferLimitMb / 1024)} GB (${plan.transferLimitMb} MB)`
                    : "No Limit"}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Subscribers cannot transfer data lots from this plan to other users.
              </p>
            )}
          </div>
        </div>

        {/* Activity & System Meta */}
        <div className="mt-6 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            System Records & Activity
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Total Orders</p>
                <p className="font-bold text-foreground">{plan._count?.orders ?? 0} Purchased</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5">
              <Users className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Active SIM Subs</p>
                <p className="font-bold text-foreground">{plan._count?.planSubscriptions ?? 0} Active</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/10 p-3 space-y-1.5 text-[11px] text-muted-foreground font-mono">
            <div>
              <span className="text-foreground/70">ID:</span> {plan.id}
            </div>
            <div>
              <span className="text-foreground/70">Created:</span>{" "}
              {new Date(plan.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="text-foreground/70">Last Updated:</span>{" "}
              {new Date(plan.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Sheet Actions */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToggleStatus(plan)}
            className="flex-1"
          >
            {plan.isActive ? "Deactivate Plan" : "Activate Plan"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onClose();
              onDuplicate(plan);
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Duplicate
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onClose();
              onEdit(plan);
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onClose();
              onDelete(plan);
            }}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
