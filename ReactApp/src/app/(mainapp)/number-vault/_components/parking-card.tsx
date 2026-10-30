import {
  ArchiveRestore,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  Plus,
  Smartphone,
} from "lucide-react";
import type { VaultParking } from "@/api/parking.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  VaultParking["status"],
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Parked",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  },
  PENDING_PAYMENT: {
    label: "Awaiting payment",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  },
  EXPIRED: {
    label: "Expired",
    className: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  },
  REACTIVATED: {
    label: "Reactivated",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  },
};

interface ParkingCardProps {
  parking: VaultParking;
  onExtend: (parking: VaultParking) => void;
  onReactivate: (parking: VaultParking) => void;
  actionPending?: boolean;
}

export function ParkingCard({
  parking,
  onExtend,
  onReactivate,
  actionPending,
}: ParkingCardProps) {
  const status = STATUS_STYLES[parking.status];
  const paidOrders = parking.orders.filter((o) => o.paymentStatus === "SUCCEEDED");

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <CardContent className="flex flex-col gap-5 p-5">
        {/* Header — number, category, status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-base font-bold text-foreground">
                {parking.number}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="border-border/60 text-[10px] uppercase tracking-wide"
                >
                  {parking.category === "BUSINESS" ? "Business SIM" : "Normal SIM"}
                </Badge>
                {parking.organizationName && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-primary/30 text-[10px] text-primary"
                  >
                    <Building2 className="h-3 w-3" />
                    {parking.organizationName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Badge className={cn("text-[11px] font-semibold", status.className)}>
            {status.label}
          </Badge>
        </div>

        {/* Dates + remaining */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-muted/30 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Parked on
            </p>
            <p className="mt-0.5 text-xs font-semibold text-foreground">
              {formatDate(parking.parkedAt)}
            </p>
          </div>
          <div className="rounded-xl bg-muted/30 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Expires on
            </p>
            <p className="mt-0.5 text-xs font-semibold text-foreground">
              {formatDate(parking.expiresAt)}
            </p>
          </div>
          <div className="rounded-xl bg-muted/30 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Clock3 className="h-3 w-3" /> Days left
            </p>
            <p className="mt-0.5 text-xs font-semibold text-foreground">
              {parking.status === "ACTIVE" ? parking.remainingDays : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/30 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Extensions
            </p>
            <p className="mt-0.5 text-xs font-semibold text-foreground">
              {parking.extensionsUsed} / {parking.maxExtensions} used
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {parking.canExtend && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={actionPending}
              onClick={() => onExtend(parking)}
            >
              <Plus className="h-3.5 w-3.5" />
              Extend (
              {parking.maxExtensions - parking.extensionsUsed} left)
            </Button>
          )}
          {parking.canReactivate && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
              disabled={actionPending}
              onClick={() => onReactivate(parking)}
            >
              <ArchiveRestore className="h-3.5 w-3.5" />
              Reactivate
            </Button>
          )}
          {parking.status === "ACTIVE" && !parking.canExtend && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              All extensions used — reactivates after expiry
            </span>
          )}
        </div>

        {/* Payment history / receipts */}
        {paidOrders.length > 0 && (
          <div className="rounded-xl border border-border/50">
            <p className="flex items-center gap-1.5 border-b border-border/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Payments
            </p>
            <ul className="divide-y divide-border/50">
              {paidOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between px-3 py-2 text-xs"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {order.type === "NUMBER_PARKING_EXTENSION"
                      ? "Extension"
                      : "Parking"}
                    <span className="text-muted-foreground/70">
                      {formatDateTime(order.paidAt ?? order.createdAt)}
                    </span>
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatINR(order.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
