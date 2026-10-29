"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Gift,
  Loader2,
  Phone,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import {
  rechargeApi,
  type RechargeRecipient,
} from "@/api/recharge.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GiftRechargeProps {
  recipient: RechargeRecipient | null;
  onSelect: (recipient: RechargeRecipient | null) => void;
}

export function GiftRecharge({ recipient, onSelect }: GiftRechargeProps) {
  const [number, setNumber] = useState("");

  // Exact-match lookup — only fires once the input looks like a full number.
  const lookup = useQuery({
    queryKey: ["recharge", "lookup", number.trim()],
    queryFn: () => rechargeApi.lookup(number.trim()),
    enabled: !recipient && number.trim().replace(/\D/g, "").length >= 10,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const found = lookup.data?.recipient;
    if (found) onSelect(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup.data]);

  if (recipient) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              Recharging for {recipient.name}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {recipient.number} — any plan you pick goes to their number.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={() => {
            onSelect(null);
            setNumber("");
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Gift className="h-4 w-4 text-primary" />
        Recharge for someone else
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Enter their full Zylo number (e.g. +91 98765 43210)"
            className="pl-9 h-10 text-sm font-mono"
          />
        </div>
        {lookup.isFetching && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {lookup.isError && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-destructive">
          <Phone className="h-3 w-3" />
          No Zylo customer found for that number — check it and try again.
        </p>
      )}
      {lookup.data && !lookup.data.recipient && !lookup.isFetching && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Type the complete number — exact matches only.
        </p>
      )}
    </div>
  );
}
