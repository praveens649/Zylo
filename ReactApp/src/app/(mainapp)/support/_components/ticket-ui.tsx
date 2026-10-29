import { Badge } from "@/components/ui/badge";
import type {
  SupportCategory,
  TicketPriority,
  TicketStatus,
} from "@/api/support.api";

/** Shared field styling — same as the TV screens use for native inputs. */
export const fieldCls =
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50";

export const CATEGORY_LABELS: Record<SupportCategory, string> = {
  SIM_ACTIVATION: "SIM activation",
  RECHARGE: "Recharge",
  PLAN: "Plan",
  PAYMENT: "Payment",
  SIM_REPLACEMENT: "SIM replacement",
  BUSINESS_SIM: "Business SIM",
  SET_TOP_BOX: "Zylo TV",
  OTHER: "Other",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const STATUS_VARIANT: Record<
  TicketStatus,
  "warning" | "default" | "success" | "outline"
> = {
  OPEN: "warning",
  IN_PROGRESS: "default",
  RESOLVED: "success",
  CLOSED: "outline",
};

const PRIORITY_VARIANT: Record<
  TicketPriority,
  "secondary" | "warning" | "destructive"
> = {
  LOW: "secondary",
  MEDIUM: "warning",
  HIGH: "destructive",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
