"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Database,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format";
import { ApiRequestError } from "@/lib/api";
import {
  dataTransferApi,
  TRANSFER_HISTORY_KEY,
  TRANSFER_OVERVIEW_KEY,
  type TransferRecipient,
  type TransferSimSummary,
} from "@/api/data-transfer.api";

const fmtMb = (mb: number) =>
  mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${mb} MB`;

const errorMessage = (err: unknown, fallback = "Something went wrong") =>
  err instanceof ApiRequestError ? err.message : fallback;

// ------------------------------------------------------------ send card

function SendCard({ sim }: { sim: TransferSimSummary }) {
  const queryClient = useQueryClient();
  const [number, setNumber] = useState("");
  const [recipient, setRecipient] = useState<TransferRecipient | null>(null);
  const [amountMb, setAmountMb] = useState("");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const lookup = useMutation({
    mutationFn: () => dataTransferApi.lookup(number.trim()),
    onSuccess: (d) => setRecipient(d.recipient),
    onError: (err) => {
      setRecipient(null);
      toast({ title: errorMessage(err), variant: "destructive" });
    },
  });

  const send = useMutation({
    mutationFn: () =>
      dataTransferApi.send({
        simId: sim.simId,
        targetNumber: number.trim(),
        amountMb: Number(amountMb),
        message: message.trim() || undefined,
        idempotencyKey,
      }),
    onSuccess: ({ transfer }) => {
      toast({ title: `${fmtMb(transfer.amountMb)} sent to ${recipient?.name ?? number}` });
      setRecipient(null);
      setAmountMb("");
      setMessage("");
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: TRANSFER_OVERVIEW_KEY });
      queryClient.invalidateQueries({ queryKey: TRANSFER_HISTORY_KEY });
      queryClient.invalidateQueries({ queryKey: ["data-bank"] });
    },
    onError: (err) => toast({ title: errorMessage(err), variant: "destructive" }),
  });

  const amount = Number(amountMb) || 0;
  const remainingToday = sim.dailyLimitMb - sim.sentTodayMb;
  const limit = Math.min(sim.perTransferLimitMb ?? remainingToday, remainingToday, sim.shareableTodayMb);
  const amountError =
    amount <= 0
      ? null
      : sim.shareableTodayMb < amount
        ? `Only ${fmtMb(sim.shareableTodayMb)} of today's data is left to share`
        : sim.perTransferLimitMb && amount > sim.perTransferLimitMb
          ? `Your plan allows up to ${fmtMb(sim.perTransferLimitMb)} per transfer`
          : amount > remainingToday
            ? `Only ${fmtMb(remainingToday)} of your daily limit is left today`
            : null;
  const canSend = !!recipient && amount >= 10 && !amountError && !send.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4 text-primary" /> Send data
        </CardTitle>
        <CardDescription>
          Shares come out of today&apos;s remaining data ({fmtMb(sim.shareableTodayMb)} left today) and land in your friend&apos;s Data Bank.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* friend lookup */}
        <div>
          <p className="mb-1.5 text-sm font-medium">Friend&apos;s Zylo number</p>
          <div className="flex gap-2">
            <Input
              value={number}
              onChange={(e) => {
                setNumber(e.target.value.replace(/[^\d\s+-]/g, ""));
                setRecipient(null);
              }}
              placeholder="98XXXXXXXX"
              maxLength={15}
            />
            <Button
              variant="outline"
              disabled={lookup.isPending || number.trim().length < 8}
              onClick={() => lookup.mutate()}
            >
              {lookup.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
              Find
            </Button>
          </div>
          {recipient && (
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20">
                <UserRound className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">{recipient.name}</p>
                <p className="text-xs text-muted-foreground">
                  {recipient.number} · {recipient.category.toLowerCase()} SIM
                </p>
              </div>
            </div>
          )}
        </div>

        {/* amount */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-sm font-medium">Amount (MB)</p>
            <p className="text-xs text-muted-foreground">
              {sim.perTransferLimitMb ? `up to ${fmtMb(sim.perTransferLimitMb)} / transfer · ` : ""}
              {fmtMb(remainingToday)} left today
            </p>
          </div>
          <Input
            inputMode="numeric"
            value={amountMb}
            onChange={(e) => setAmountMb(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 500"
            disabled={!recipient}
          />
          {amountError && <p className="mt-1 text-xs text-destructive">{amountError}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[100, 250, 500, 1024].map((v) => (
              <Button
                key={v}
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                disabled={!recipient || v > limit}
                onClick={() => setAmountMb(String(v))}
              >
                {fmtMb(v)}
              </Button>
            ))}
          </div>
        </div>

        {/* message */}
        <div>
          <p className="mb-1.5 text-sm font-medium">Message (optional)</p>
          <Input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={140} placeholder="Enjoy some extra data!" disabled={!recipient} />
        </div>

        <Button className="w-full" disabled={!canSend} onClick={() => setConfirming(true)}>
          <Send className="mr-1.5 h-4 w-4" />
          Send {amount > 0 ? fmtMb(amount) : "data"}
        </Button>
      </CardContent>

      <AppDialog
        open={confirming}
        onOpenChange={setConfirming}
        size="sm"
        title="Confirm transfer"
        icon={<Send className="h-5 w-5 text-primary" />}
        description="This moves data out of your Data Bank immediately — it can't be undone."
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border bg-muted/40 p-3 text-center">
            <p className="font-display text-2xl font-bold text-primary">{fmtMb(amount)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              to {recipient?.name} · {recipient?.number}
              {message.trim() ? ` — “${message.trim()}”` : ""}
            </p>
          </div>
          <Button className="w-full" disabled={send.isPending} onClick={() => send.mutate()}>
            {send.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Confirm &amp; send
          </Button>
        </div>
      </AppDialog>
    </Card>
  );
}

// ------------------------------------------------------------ history

function HistoryCard() {
  const { data, isLoading } = useQuery({
    queryKey: TRANSFER_HISTORY_KEY,
    queryFn: dataTransferApi.history,
  });
  const rows = data?.transfers ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Transfer history</CardTitle>
        <CardDescription>
          Sent out of today&apos;s data; received into your Data Bank.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transfers yet — send your first one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3"></th>
                  <th className="py-2 pr-3">Friend</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Message</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      {t.direction === "SENT" ? (
                        <ArrowUpRight className="h-4 w-4 text-destructive" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{t.otherParty.name ?? "—"}</span>
                      <span className="block text-xs text-muted-foreground">{t.otherParty.number}</span>
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{fmtMb(t.amountMb)}</td>
                    <td className="max-w-40 truncate py-2.5 pr-3 text-xs text-muted-foreground">{t.message ?? "—"}</td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={t.status === "COMPLETED" ? "success" : "secondary"}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-xs">{formatDateTime(t.completedAt ?? t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------ view

export function DataTransferView() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: TRANSFER_OVERVIEW_KEY,
    queryFn: dataTransferApi.overview,
  });
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);

  const sims = useMemo(() => data?.sims ?? [], [data]);
  const selectedSim = sims.find((s) => s.simId === selectedSimId) ?? sims[0] ?? null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-sky-500/10 to-emerald-500/10 p-6 shadow-sm md:p-8">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="border-primary/30 bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Send className="mr-1 h-3.5 w-3.5" />
              Share the data you saved
            </Badge>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Data Transfer
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Share part of today&apos;s remaining data with a friend on
              another Zylo number — it lands in their Data Bank instantly.
            </p>
          </div>
          {sims.length > 1 && (
            <div className="flex shrink-0 items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedSim?.simId ?? ""} onValueChange={setSelectedSimId}>
                <SelectTrigger className="h-10 w-48 bg-background/70 text-sm font-medium">
                  <SelectValue placeholder="Select number" />
                </SelectTrigger>
                <SelectContent>
                  {sims.map((sim) => (
                    <SelectItem key={sim.simId} value={sim.simId}>
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
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
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
                  {error instanceof Error ? error.message : "Unknown error occurred"}
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

      {!isLoading && !isError && (
        <>
          {selectedSim ? (
            selectedSim.transferEnabled ? (
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
                <SendCard sim={selectedSim} />
                <HistoryCard />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Send className="h-7 w-7" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                  Transfers not available on this plan
                </h3>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                  {selectedSim.planName ?? "Your plan"} doesn&apos;t include P2P
                  data transfers. Switch to a plan with transfers enabled.
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Database className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                No active SIM
              </h3>
              <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                You need an active Zylo SIM with banked data to send a transfer.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DataTransferView;
