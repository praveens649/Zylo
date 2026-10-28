import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Sparkles,
  Database,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  XCircle,
  Eye,
  Edit3,
  Copy,
  Trash2,
  MoreVertical,
} from "lucide-react";
import type { Plan } from "@/api/plans.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import GenericTable from "@/components/ui/generic-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlansTableProps {
  plans: Plan[];
  onView: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
  onDuplicate: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onToggleStatus: (plan: Plan) => void;
}

export function PlansTable({
  plans,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
}: PlansTableProps) {
  const columns = useMemo<ColumnDef<Plan, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Plan Name",
        cell: ({ row }) => (
          <div className="flex flex-col py-1 min-w-[200px]">
            <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
              {row.original.name}
              {row.original.isFeatured && (
                <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] py-0 px-1.5">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  Featured
                </Badge>
              )}
            </div>
            {row.original.description && (
              <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {row.original.description}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Category",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className={
                row.original.type === "BUSINESS"
                  ? "border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs"
                  : row.original.type === "POSTPAID"
                  ? "border-purple-500/30 text-purple-400 bg-purple-500/10 text-xs"
                  : row.original.type === "VALIDITY_ONLY"
                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs"
                  : "border-primary/30 text-primary bg-primary/10 text-xs"
              }
            >
              {row.original.type}
            </Badge>
            {row.original.businessOnly && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                <Building2 className="h-3 w-3 mr-0.5" />
                Biz
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => (
          <div className="font-display font-bold text-sm text-foreground">
            ₹{Number(row.original.price).toLocaleString("en-IN")}
          </div>
        ),
      },
      {
        accessorKey: "validityDays",
        header: "Validity",
        cell: ({ row }) => (
          <span className="text-xs text-foreground font-medium">
            {row.original.validityDays} Days
          </span>
        ),
      },
      {
        accessorKey: "dataAllowanceGb",
        header: "Data Allowance",
        cell: ({ row }) => (
          <div className="text-xs">
            <span className="font-semibold text-foreground">
              {row.original.dataAllowanceGb
                ? `${row.original.dataAllowanceGb} GB ${row.original.type === "POSTPAID" ? "Pool" : "/ day"}`
                : "No Data"}
            </span>
          </div>
        ),
      },
      {
        id: "innovations",
        header: "Zylo Features",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            {row.original.dataBankEnabled && (
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-[10px]">
                <Database className="h-3 w-3 mr-0.5" />
                Bank {row.original.rolloverLimitMb ? `${Math.round(row.original.rolloverLimitMb / 1024)}G` : ""}
              </Badge>
            )}
            {row.original.dataTransferEnabled && (
              <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30 text-[10px]">
                <ArrowRightLeft className="h-3 w-3 mr-0.5" />
                Transfer
              </Badge>
            )}
            {!row.original.dataBankEnabled && !row.original.dataTransferEnabled && (
              <span className="text-xs text-muted-foreground/60">—</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <button
            onClick={() => onToggleStatus(row.original)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              row.original.isActive
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
            }`}
          >
            {row.original.isActive ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Active
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Inactive
              </>
            )}
          </button>
        ),
      },
      {
        id: "activity",
        header: "Orders / Subs",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original._count?.orders ?? 0} orders • {row.original._count?.planSubscriptions ?? 0} subs
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs px-2"
              onClick={() => onView(row.original)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              View
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => onEdit(row.original)}>
                  <Edit3 className="h-3.5 w-3.5 mr-2" />
                  Edit plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(row.original)}>
                  <Copy className="h-3.5 w-3.5 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(row.original)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [onView, onEdit, onDuplicate, onDelete, onToggleStatus]
  );

  return (
    <GenericTable
      columns={columns}
      data={plans}
      sort
      filter
      filterColumn="name"
      filterPlaceHolder="Search recharge plans..."
      pagination
    />
  );
}
