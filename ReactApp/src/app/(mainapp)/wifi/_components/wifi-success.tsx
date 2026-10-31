import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { subscriptionsApi } from "@/api/subscriptions.api";
import { useWifiConnections } from "../_hooks/use-wifi";

export function WifiSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const qc = useQueryClient();
  const conns = useWifiConnections();

  const verify = useQuery({
    queryKey: ["wifi", "verify", sessionId],
    queryFn: () => subscriptionsApi.verifyCheckout(sessionId!),
    enabled: !!sessionId,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (verify.isSuccess) {
      qc.invalidateQueries({ queryKey: ["wifi"] });
    }
  }, [verify.isSuccess, qc]);

  const pending = (conns.data ?? []).find((c) => c.status === "PENDING_INSTALLATION");

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            {verify.isPending ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <CheckCircle2 className="h-6 w-6" />}
          </div>
          <CardTitle className="text-xl">Payment successful!</CardTitle>
          <CardDescription>
            {pending
              ? "Your installation visit has been booked. Our technician will contact you before arriving."
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
              <Link to="/wifi?tab=my">
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

export default WifiSuccess;
