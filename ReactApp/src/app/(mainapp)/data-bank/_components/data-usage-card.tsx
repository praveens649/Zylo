"use client";

import { Activity, Loader2, Play, Square, Wifi } from "lucide-react";

import { ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import { useStartUsage, useStopUsage, useUsageStatus } from "../_hooks/use-usage-simulation";

function formatMb(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb % 1 === 0 ? gb : gb.toFixed(2)} GB`;
  }
  return `${mb} MB`;
}

interface DataUsageCardProps {
  simId: string;
}

/**
 * Live data usage simulation for the customer's active SIM.
 * The server computes consumption from elapsed time at 100 MB/s (demo rate);
 * this card polls the status endpoint once per second while a session runs.
 */
export function DataUsageCard({ simId }: DataUsageCardProps) {
  const { toast } = useToast();
  const status = useUsageStatus(simId);
  const start = useStartUsage(simId);
  const stop = useStopUsage(simId);

  const data = status.data;
  const running = data?.running ?? false;
  const usedMb = data?.usedMb ?? 0;
  const bankedMb = data?.bankedMb ?? 0;
  const redeemedMb = data?.redeemedMb ?? 0;
  const allowanceMb = data?.allowanceMb ?? 0;
  const remainingMb = data?.remainingMb ?? allowanceMb;

  // Bar segments: consumed vs banked vs remaining — redeemed data is part of
  // the remaining pool so it doesn't get its own segment.
  const usedPct = allowanceMb > 0 ? (usedMb / allowanceMb) * 100 : 0;
  const bankedPct = allowanceMb > 0 ? (bankedMb / allowanceMb) * 100 : 0;
  const exhausted = remainingMb <= 0 && allowanceMb > 0;

  const busy = start.isPending || stop.isPending;

  const handleError = (err: unknown, fallback: string) => {
    toast({
      variant: "destructive",
      title: fallback,
      description:
        err instanceof ApiRequestError ? err.message : "Please try again.",
    });
  };

  const handleStart = () =>
    start.mutate(undefined, {
      onError: (err) => handleError(err, "Could not start simulation"),
    });

  const handleStop = () =>
    stop.mutate(undefined, {
      onSuccess: (res) => {
        toast({
          title: "Simulation stopped",
          description: `Consumed ${formatMb(res.consumedThisSession)} this session.`,
        });
      },
      onError: (err) => handleError(err, "Could not stop simulation"),
    });

  return (
    <Card className="relative overflow-hidden border-border bg-card shadow-sm">
      {/* Ambient accent */}
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl transition-colors ${
          running ? "bg-emerald-500/15" : "bg-primary/10"
        }`}
      />

      <CardHeader className="relative pb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Data Usage
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              running
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                running ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/60"
              }`}
            />
            {running ? "Simulating" : "Idle"}
          </span>
        </div>

        {/* Hero number */}
        <div className="mt-3 flex items-end gap-2">
          {status.isPending ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </span>
          ) : (
            <>
              <span className="font-display text-4xl font-black tracking-tight text-foreground">
                {formatMb(remainingMb)}
              </span>
              <span className="pb-1 text-sm font-medium text-muted-foreground">
                left of {formatMb(allowanceMb)}
              </span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Segmented progress bar */}
        <div className="space-y-1.5">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-[width] duration-500 ${
                exhausted ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, usedPct)}%` }}
            />
            <div
              className="h-full bg-sky-500/70 transition-[width] duration-500"
              style={{ width: `${Math.min(100 - usedPct, bankedPct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>0</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${exhausted ? "bg-destructive" : "bg-primary"}`} />
                Used {formatMb(usedMb)}
              </span>
              {bankedMb > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  Banked {formatMb(bankedMb)}
                </span>
              )}
              {redeemedMb > 0 && (
                <span className="text-emerald-600">
                  +{formatMb(redeemedMb)} redeemed
                </span>
              )}
            </span>
            <span>{formatMb(allowanceMb)}</span>
          </div>
        </div>

        {status.isError ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {status.error instanceof ApiRequestError
              ? status.error.message
              : "Unable to load usage for this SIM."}
          </p>
        ) : null}

        <Button
          size="lg"
          variant={running ? "destructive" : "default"}
          className="h-11 w-full gap-2 rounded-xl text-sm font-bold shadow-sm"
          disabled={
            busy || status.isPending || status.isError || (!running && exhausted)
          }
          onClick={running ? handleStop : handleStart}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : running ? (
            <Square className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {busy
            ? running
              ? "Stopping…"
              : "Starting…"
            : running
              ? "Stop usage simulation"
              : exhausted
                ? "Daily data exhausted"
                : "Start usage simulation"}
        </Button>

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Wifi className="mt-0.5 h-3 w-3 shrink-0" />
          Demo simulation at {data?.simulatedRateMbPerSecond ?? 100} MB/s — it
          does not consume real network data. Save unused data to your Data
          Bank before midnight.
        </p>
      </CardContent>
    </Card>
  );
}

export default DataUsageCard;
