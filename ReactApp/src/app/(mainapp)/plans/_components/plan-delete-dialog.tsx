import { useState } from "react";
import { AlertCircle, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { AppDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/api/plans.api";
import { useDeletePlan } from "../_hooks/use-plans";
import { useToast } from "@/hooks/use-toast";

interface PlanDeleteDialogProps {
  plan: Plan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanDeleteDialog({
  plan,
  open,
  onOpenChange,
}: PlanDeleteDialogProps) {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useDeletePlan(() => {
    toast({
      title: "Plan Deleted",
      description: `Plan has been removed or archived safely.`,
    });
    onOpenChange(false);
  });

  if (!plan) return null;

  const hasActivity =
    (plan._count?.orders ?? 0) > 0 || (plan._count?.planSubscriptions ?? 0) > 0;

  const handleDelete = () => {
    setError(null);
    deleteMutation.mutate(plan.id, {
      onError: (err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to delete plan");
      },
    });
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Delete Recharge Plan"
      icon={<ShieldAlert className="h-5 w-5 text-destructive" />}
      description="Review deletion conditions for this recharge package."
    >
      <div className="space-y-4 pt-2">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">{plan.name}</p>
          <p className="text-xs text-muted-foreground">
            Price: ₹{Number(plan.price).toLocaleString("en-IN")} • Validity: {plan.validityDays} Days • Category: {plan.type}
          </p>
        </div>

        {hasActivity ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-500 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              Existing Customer Subscriptions Found
            </p>
            <p className="text-muted-foreground">
              This plan has {plan._count?.orders ?? 0} orders and {plan._count?.planSubscriptions ?? 0} active subscriptions. To safeguard billing and audit history, it will be safely <strong>deactivated and hidden</strong> from users rather than deleted.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Are you sure you want to permanently delete this plan? This action cannot be undone.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                {hasActivity ? "Deactivate & Archive" : "Delete Permanently"}
              </span>
            )}
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
