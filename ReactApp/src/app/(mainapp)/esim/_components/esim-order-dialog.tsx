import { BadgeCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useActivateTravelEsim,
  useTravelOrderDetail,
} from "../_hooks/use-esim";
import { EsimReady } from "./esim-ready";
import { countryName } from "../_lib/countries";

interface EsimOrderDialogProps {
  reference: string | null;
  onOpenChange: (open: boolean) => void;
}

export function EsimOrderDialog({
  reference,
  onOpenChange,
}: EsimOrderDialogProps) {
  const { toast } = useToast();
  const { data: order, isLoading } = useTravelOrderDetail(reference);
  const activate = useActivateTravelEsim();

  const handleActivate = () => {
    if (!order) return;
    activate.mutate(order.reference, {
      onSuccess: () => {
        toast({
          title: "eSIM activated",
          description:
            "Your travel eSIM profile is installed and ready to connect abroad.",
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Activation failed",
          description:
            err instanceof Error ? err.message : "Please try again.",
        });
      },
    });
  };

  return (
    <Dialog open={!!reference} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {order
              ? `${countryName(order.destinationCountry)} eSIM`
              : "eSIM details"}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !order ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        ) : order.esim ? (
          <div className="flex flex-col gap-4">
            <EsimReady order={order} showHeading={false} />
            {order.status === "READY_TO_ACTIVATE" && (
              <Button
                onClick={handleActivate}
                disabled={activate.isPending}
                className="self-end font-bold"
              >
                {activate.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <BadgeCheck className="h-4 w-4 mr-1.5" />
                )}
                Mark as installed
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            This order is <b>{order.status.toLowerCase().replace(/_/g, " ")}</b>
            . eSIM credentials appear here once payment is confirmed.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
