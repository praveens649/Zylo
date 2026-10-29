"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Loader2,
  RefreshCw,
  Smartphone,
  User,
} from "lucide-react";

import { type AdminSim, type SimStatus } from "@/api/sims.api";
import { formatDate, formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { initials } from "../../_components/console-utils";
import { useSims } from "../_hooks/use-sims";

/* ------------------------------------------------------------------ */
/*  Badges                                                            */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<SimStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  READY_TO_INSTALL: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  PENDING_ACTIVATION: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  GRACE_PERIOD: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  SUSPENDED: "bg-muted text-muted-foreground border-border/40",
  DEACTIVATED: "bg-muted text-muted-foreground border-border/40",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABELS: Record<SimStatus, string> = {
  ACTIVE: "Active",
  READY_TO_INSTALL: "Ready to install",
  PENDING_ACTIVATION: "Pending activation",
  GRACE_PERIOD: "Grace period",
  SUSPENDED: "Suspended",
  DEACTIVATED: "Deactivated",
  CANCELLED: "Cancelled",
};

type SimFilter = "ALL" | "ESIM" | "PHYSICAL" | "BUSINESS";

const FILTERS: { value: SimFilter; label: string }[] = [
  { value: "ALL", label: "All SIMs" },
  { value: "ESIM", label: "eSIMs" },
  { value: "PHYSICAL", label: "Physical" },
  { value: "BUSINESS", label: "Business" },
];

function StatusBadge({ status }: { status: SimStatus }) {
  return (
    <Badge variant="outline" className={`text-xs ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: AdminSim["category"] }) {
  return (
    <Badge
      variant="outline"
      className={
        category === "BUSINESS"
          ? "gap-1 border-primary/25 bg-primary/10 text-xs text-primary"
          : "gap-1 text-xs"
      }
    >
      {category === "BUSINESS" ? (
        <Building2 className="h-3 w-3" />
      ) : (
        <User className="h-3 w-3" />
      )}
      {category === "BUSINESS" ? "Business" : "Personal"}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  Customer cell                                                     */
/* ------------------------------------------------------------------ */

function CustomerCell({ user }: { user: AdminSim["user"] }) {
  return (
    <div className="flex items-center gap-3">
      {user.image ? (
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
          <img
            src={user.image}
            alt={user.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
          {initials(user.name)}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main view                                                         */
/* ------------------------------------------------------------------ */

export function SimsView() {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useSims();
  const [filter, setFilter] = useState<SimFilter>("ALL");
  const allSims = useMemo(() => data?.sims ?? [], [data]);

  const sims = useMemo(
    () =>
      allSims.filter((s) => {
        if (filter === "ESIM") return s.technology === "ESIM";
        if (filter === "PHYSICAL") return s.technology === "PHYSICAL";
        if (filter === "BUSINESS") return s.category === "BUSINESS";
        return true;
      }),
    [allSims, filter]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            SIMs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every purchased SIM across your customers — owner, number,
            category, and active plan.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all border ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">
              {
                allSims.filter((s) =>
                  f.value === "ESIM"
                    ? s.technology === "ESIM"
                    : f.value === "PHYSICAL"
                      ? s.technology === "PHYSICAL"
                      : f.value === "BUSINESS"
                        ? s.category === "BUSINESS"
                        : true
                ).length
              }
            </span>
          </button>
        ))}
      </div>

      {/* Table card */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Smartphone className="h-4 w-4 text-primary" />
            Purchased SIMs
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {sims.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading SIMs…
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Failed to load SIMs."}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone number</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Activated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sims.map((sim) => (
                    <TableRow key={sim.id}>
                      <TableCell>
                        <CustomerCell user={sim.user} />
                      </TableCell>
                      <TableCell>
                        {sim.phoneNumber ? (
                          <>
                            <p className="font-mono text-sm">
                              {sim.phoneNumber.number}
                            </p>
                            {sim.phoneNumber.type === "PREMIUM" && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                                Premium
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No number picked
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <CategoryBadge category={sim.category} />
                        {sim.organization && (
                          <p className="mt-1 max-w-40 truncate text-[11px] text-muted-foreground">
                            {sim.organization.name}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sim.technology === "ESIM" ? (
                          <span className="flex items-center gap-1.5">
                            eSIM
                            {sim.destinationCountry && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-sky-500/30 text-sky-500"
                              >
                                {sim.destinationCountry}
                              </Badge>
                            )}
                          </span>
                        ) : (
                          "Physical"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sim.status} />
                      </TableCell>
                      <TableCell>
                        {sim.activePlan ? (
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {sim.activePlan.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatINR(sim.activePlan.price)} ·{" "}
                              {sim.activePlan.validityDays}d
                            </p>
                            {sim.reference && (
                              <p className="font-mono text-[10px] text-muted-foreground/70">
                                ref {sim.reference.slice(0, 8).toUpperCase()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No plan
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sim.activatedAt
                          ? formatDate(sim.activatedAt)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SimsView;
