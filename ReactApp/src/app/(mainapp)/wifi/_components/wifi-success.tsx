import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWifiConnections } from "../_hooks/use-wifi";

/**
 * Stripe redirects here with ?session_id=. The payment is confirmed by the
 * Stripe webhook (server-side); this page just reflects the result. If the
 * webhook is slow, My WiFi lets the customer check the payment status again.
 */
export function WifiSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { data, refetch } = useWifiConnections();

  useEffect(() => {
    refetch();
  }, [refetch]);

  const pending = (data ?? []).find((c) => c.status === "PENDING_INSTALLATION");

  return (
    <div className="mx-auto flex max-w-2xl justify-center p-4">
      <Card className="w-full border-primary/30 text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Payment received</CardTitle>
          <CardDescription>
            {sessionId
              ? "Your Zylo WiFi order is being processed. We will assign your router and schedule the installation — your connection goes live once the visit is completed."
              : "Your Zylo WiFi order is being processed."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending && (
            <div className="mx-auto w-fit rounded-lg border bg-muted/40 px-4 py-2 text-sm">
              <span className="text-muted-foreground">Connection number: </span>
              <span className="font-mono font-semibold">{pending.connectionNumber}</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <Button className="w-full sm:w-auto" asChild>
              <Link to="/wifi/my">
                <Wifi className="mr-2 h-4 w-4" /> Track installation in My WiFi
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
