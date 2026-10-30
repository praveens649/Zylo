import type { ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { AppDialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BoxResolution, TvConnectionStatus, UnitStatus } from "@/api/tv.api";

export const fieldCls =
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50";

type Variant = "success" | "warning" | "destructive" | "secondary" | "outline" | "default";

const CONNECTION: Record<TvConnectionStatus, { label: string; variant: Variant }> = {
  PENDING_INSTALLATION: { label: "Pending installation", variant: "warning" },
  ACTIVE: { label: "Active", variant: "success" },
  PAUSED: { label: "Paused", variant: "secondary" },
  GRACE_PERIOD: { label: "Grace period", variant: "warning" },
  SUSPENDED: { label: "Suspended", variant: "destructive" },
  DISCONNECTED: { label: "Disconnected", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

export function ConnectionStatusBadge({ status }: { status: TvConnectionStatus }) {
  const s = CONNECTION[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const UNIT: Record<UnitStatus, Variant> = {
  IN_STOCK: "success",
  RESERVED: "warning",
  ASSIGNED: "warning",
  INSTALLED: "default",
  FAULTY: "destructive",
  RETURNED: "secondary",
  RETIRED: "outline",
};

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  return <Badge variant={UNIT[status]}>{status.replace("_", " ")}</Badge>;
}

export function ResolutionBadge({ resolution }: { resolution: BoxResolution }) {
  return (
    <Badge variant={resolution === "UHD_4K" ? "default" : "secondary"}>
      {resolution === "UHD_4K" ? "4K UHD" : "HD"}
    </Badge>
  );
}

export function StatusPill({ status }: { status: string }) {
  const good = ["COMPLETED", "SUCCEEDED", "ACTIVE", "SCHEDULED"].includes(status);
  const bad = ["FAILED", "CANCELLED", "REFUNDED", "SUSPENDED"].includes(status);
  return <Badge variant={good ? "success" : bad ? "destructive" : "warning"}>{status.replaceAll("_", " ")}</Badge>;
}

export function TvHero({
  badge,
  title,
  subtitle,
  right,
}: {
  badge: string;
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-teal-500/10 p-6 shadow-sm md:p-8">
      <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge className="border-primary/30 bg-primary/20 text-primary">{badge}</Badge>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {right}
      </div>
    </div>
  );
}

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const SLOT_LABEL = {
  MORNING: "Morning (9 AM – 12 PM)",
  AFTERNOON: "Afternoon (12 – 4 PM)",
  EVENING: "Evening (4 – 7 PM)",
} as const;

/** yyyy-mm-dd for DatePicker min/max. */
export function isoDay(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Styled replacement for window.confirm(). Stays open while `pending` is true. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  confirmLabel = "Confirm",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AppDialog
      open={open}
      onOpenChange={(o) => !pending && onOpenChange(o)}
      size="sm"
      title={title}
      icon={icon ?? <ShieldAlert className="h-5 w-5 text-destructive" />}
      description={description}
    >
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="destructive" size="sm" disabled={pending} onClick={onConfirm}>
          {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {confirmLabel}
        </Button>
      </div>
    </AppDialog>
  );
}
