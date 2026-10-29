"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Database, RefreshCw, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useRechargeOverview } from "../../recharge/_hooks/use-recharge";
import { DataUsageCard } from "./data-usage-card";
import { DataBankCard } from "./data-bank-card";
import { DataLoanCard } from "../../loans/_components/data-loan-card";
import { LoanHistory } from "../../loans/_components/loan-history";

/**
 * Zylo Data Bank page — the daily usage simulation and the Data Bank
 * vault for the customer's own SIM(s), side by side.
 */
export function DataBankView() {
  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
  } = useRechargeOverview();

  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);

  const sims = useMemo(() => overview?.sims ?? [], [overview]);
  const activeSims = useMemo(
    () => sims.filter((s) => s.status === "ACTIVE"),
    [sims],
  );
  const selectedSim =
    activeSims.find((s) => s.id === selectedSimId) ?? activeSims[0] ?? null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-sky-500/10 to-emerald-500/10 p-6 shadow-sm md:p-8">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="border-primary/30 bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Database className="mr-1 h-3.5 w-3.5" />
              Never lose unused data
            </Badge>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Zylo Data Bank
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Simulate today&apos;s data usage, save the unused portion into
              your vault before midnight, and redeem it back whenever you need
              extra data.
            </p>
          </div>

          {activeSims.length > 1 && (
            <div className="flex shrink-0 items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedSim?.id ?? ""}
                onValueChange={setSelectedSimId}
              >
                <SelectTrigger className="h-10 w-48 bg-background/70 text-sm font-medium">
                  <SelectValue placeholder="Select number" />
                </SelectTrigger>
                <SelectContent>
                  {activeSims.map((sim) => (
                    <SelectItem key={sim.id} value={sim.id}>
                      {sim.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to load your SIMs</p>
                <p className="text-xs text-destructive/80">
                  {error instanceof Error
                    ? error.message
                    : "Unknown error occurred"}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {selectedSim ? (
            <>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <DataUsageCard simId={selectedSim.id} />
                <DataBankCard simId={selectedSim.id} />
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <DataLoanCard simId={selectedSim.id} />
                <LoanHistory simId={selectedSim.id} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Database className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                No active SIM
              </h3>
              <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                You need an active Zylo SIM with a Data Bank–enabled plan to
                simulate usage and save data. Head to Recharge to get started.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DataBankView;
