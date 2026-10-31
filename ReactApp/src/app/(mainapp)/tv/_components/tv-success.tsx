"use client";

import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { subscriptionsApi } from "@/api/subscriptions.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Landing page after Stripe Checkout. Payment is confirmed server-side against Stripe, not by this redirect. */
export function TvSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const qc = useQueryClient();

  const verify = useQuery({
    queryKey: ["tv", "verify", sessionId],
    queryFn: () => subscriptionsApi.verifyCheckout(sessionId!),
    enabled: !!sessionId,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (verify.isSuccess) qc.invalidateQueries({ queryKey: ["tv", "connections"] });
  }, [verify.isSuccess, qc]);

  const ok = verify.data?.verified;

  return (
    <div className="mx-auto max-w-lg py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          {verify.isPending && sessionId ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Confirming your payment…</p>
            </>
          ) : ok ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h1 className="font-display text-2xl font-black">Payment received</h1>
              <p className="text-sm text-muted-foreground">
                Thank you! We'll assign your box and confirm an installation slot. Track everything in My TV.
              </p>
              <Button asChild><Link to="/tv?tab=my">Go to My TV</Link></Button>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <h1 className="font-display text-2xl font-black">We couldn't confirm the payment</h1>
              <p className="text-sm text-muted-foreground">
                If you were charged, it will appear in My TV shortly. Otherwise you can try again.
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline"><Link to="/tv?tab=my">My TV</Link></Button>
                <Button asChild><Link to="/tv">Back to Zylo TV</Link></Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TvSuccess;
