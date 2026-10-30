import { ArchiveRestore, Loader2 } from "lucide-react";
import type { VaultParking } from "@/api/parking.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";

interface ReactivateDialogProps {
  parking: VaultParking | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (parkingId: string) => void;
}

/** Confirms ending an active parking early — no refund is implied. */
export function ReactivateDialog({
  parking,
  isPending,
  onOpenChange,
  onConfirm,
}: ReactivateDialogProps) {
  return (
    <Dialog open={!!parking} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Reactivate number?
          </DialogTitle>
          <DialogDescription>
            {parking?.number} is parked until{" "}
            {formatDate(parking?.expiresAt)}. Reactivating ends the parking
            now — the paid period is not refunded.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Keep parked
          </Button>
          <Button
            onClick={() => parking && onConfirm(parking.id)}
            disabled={isPending || !parking}
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ArchiveRestore className="mr-1.5 h-4 w-4" />
            )}
            Reactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
