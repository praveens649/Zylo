import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import type { InternationalPlan } from "@/api/travel-esim.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useDeleteEsimPlan } from "../_hooks/use-esim-plans";

interface EsimPlanDeleteDialogProps {
  plan: InternationalPlan | null;
  onOpenChange: (open: boolean) => void;
}

export function EsimPlanDeleteDialog({
  plan,
  onOpenChange,
}: EsimPlanDeleteDialogProps) {
  const { toast } = useToast();
  const deletePlan = useDeleteEsimPlan((res) => {
    toast({
      title: res.deleted ? "Plan deleted" : "Plan deactivated",
      description: res.message,
    });
    onOpenChange(false);
  });

  const hasOrders = (plan?._count?.orders ?? 0) > 0;

  return (
    <Dialog open={!!plan} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Delete eSIM plan
          </DialogTitle>
          <DialogDescription>
            {hasOrders
              ? `"${plan?.name}" has ${plan?._count?.orders} purchase(s) — it will be deactivated instead of deleted so order history stays intact.`
              : `"${plan?.name}" will be permanently deleted. This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deletePlan.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!plan || deletePlan.isPending}
            onClick={() => plan && deletePlan.mutate(plan.id)}
          >
            {deletePlan.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1.5" />
            )}
            {hasOrders ? "Deactivate" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
