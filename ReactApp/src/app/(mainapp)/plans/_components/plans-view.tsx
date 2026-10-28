"use client";

import { useState } from "react";
import {
  Zap,
  Plus,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Building2,
} from "lucide-react";
import type { Plan, PlanType } from "@/api/plans.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthUser } from "@/lib/use-auth-user";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenState } from "../../_components/forbidden-state";
import { usePlans, usePlanStats, useTogglePlanStatus } from "../_hooks/use-plans";
import { PlansStatsCards } from "./plans-stats-cards";
import { PlanCard } from "./plan-card";
import { PlansTable } from "./plans-table";
import { PlanFormDialog } from "./plan-form-dialog";
import { PlanDetailsSheet } from "./plan-details-sheet";
import { PlanDeleteDialog } from "./plan-delete-dialog";
import { useToast } from "@/hooks/use-toast";

type CategoryFilter = "ALL" | PlanType | "FEATURED";

export function PlansView() {
  const { user: currentUser } = useAuthUser();
  const admin = isAdmin(currentUser);
  const { toast } = useToast();

  // View state
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [duplicatePlan, setDuplicatePlan] = useState<Plan | null>(null);
  const [inspectingPlan, setInspectingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);

  // Queries
  const { data: statsData, isLoading: isStatsLoading } = usePlanStats(admin);

  const { data: plansData, isLoading, isError, error, refetch } = usePlans({
    search: searchQuery || undefined,
    type: categoryFilter !== "ALL" && categoryFilter !== "FEATURED" ? categoryFilter : undefined,
    isFeatured: categoryFilter === "FEATURED" ? true : undefined,
    isActive: statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE",
    limit: 100,
  });

  const plans = plansData?.data ?? [];

  // Toggle mutation
  const toggleMutation = useTogglePlanStatus(() => {
    toast({
      title: "Status Updated",
      description: "Recharge plan active status changed successfully.",
    });
  });

  const handleToggleStatus = (plan: Plan) => {
    toggleMutation.mutate(plan.id);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setDuplicatePlan(null);
    setIsCreateOpen(true);
  };

  const handleDuplicate = (plan: Plan) => {
    setEditingPlan(null);
    setDuplicatePlan(plan);
    setIsCreateOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setDuplicatePlan(null);
    setIsCreateOpen(true);
  };

  if (currentUser && !admin) {
    return (
      <ForbiddenState message="Administrator access is required to manage recharge plans." />
    );
  }

  return (
    <div className="flex flex-col gap-7 pb-10">
      {/* Massive Attractive Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-teal-500/10 p-6 md:p-8 shadow-sm">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-2.5 py-0.5 font-semibold">
                <Zap className="h-3.5 w-3.5 mr-1" />
                Telecommunications Engine
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground border-border/60">
                Super Admin Console
              </Badge>
            </div>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Recharge Plans & Quota Management
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Define customer mobile tariffs, daily data quotas, voice allowances, and Zylo innovation features like Data Bank Rollover and Peer Data Transfer.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={handleOpenCreate}
              className="h-11 px-5 font-bold shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Recharge Plan
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Metric Cards */}
      <PlansStatsCards stats={statsData} isLoading={isStatsLoading} />

      {/* Filter Toolbar & View Toggle */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search plans by name, benefits, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Quick Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant={categoryFilter === "ALL" ? "default" : "outline"}
              className="h-8 text-xs font-semibold px-3"
              onClick={() => setCategoryFilter("ALL")}
            >
              All Plans
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === "PREPAID" ? "default" : "outline"}
              className="h-8 text-xs font-semibold px-3"
              onClick={() => setCategoryFilter("PREPAID")}
            >
              Prepaid
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === "POSTPAID" ? "default" : "outline"}
              className="h-8 text-xs font-semibold px-3"
              onClick={() => setCategoryFilter("POSTPAID")}
            >
              Postpaid
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === "BUSINESS" ? "default" : "outline"}
              className="h-8 text-xs font-semibold px-3"
              onClick={() => setCategoryFilter("BUSINESS")}
            >
              <Building2 className="h-3 w-3 mr-1 text-blue-400" />
              Business
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === "VALIDITY_ONLY" ? "default" : "outline"}
              className="h-8 text-xs font-semibold px-3"
              onClick={() => setCategoryFilter("VALIDITY_ONLY")}
            >
              Validity Only
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === "FEATURED" ? "default" : "outline"}
              className="h-8 text-xs font-semibold px-3"
              onClick={() => setCategoryFilter("FEATURED")}
            >
              <Sparkles className="h-3 w-3 mr-1 text-amber-500" />
              Featured Deals
            </Button>
          </div>

          {/* Status Filter & View Toggle */}
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val: "ALL" | "ACTIVE" | "INACTIVE") => setStatusFilter(val)}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active Only</SelectItem>
                <SelectItem value="INACTIVE">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            {/* View Switcher */}
            <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
              <Button
                size="icon"
                variant={viewMode === "grid" ? "default" : "ghost"}
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode("grid")}
                title="Grid Catalog View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === "table" ? "default" : "ghost"}
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode("table")}
                title="Table Density View"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading Zylo recharge catalog…</p>
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to fetch recharge plans</p>
                <p className="text-xs text-destructive/80">
                  {error instanceof Error ? error.message : "Unknown error occurred"}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && plans.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Zap className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            No Recharge Plans Found
          </h3>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
            {searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
              ? "No plans match your current filters. Try resetting your search query or status criteria."
              : "No recharge packages have been configured yet. Create your first plan to start offering mobile services."}
          </p>
          <div className="mt-5 flex items-center gap-3">
            {searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("ALL");
                  setStatusFilter("ALL");
                }}
              >
                Reset Filters
              </Button>
            ) : null}
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Plan
            </Button>
          </div>
        </div>
      )}

      {/* Plans Content */}
      {!isLoading && !isError && plans.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onEdit={handleEdit}
                  onView={(p) => setInspectingPlan(p)}
                  onDuplicate={handleDuplicate}
                  onDelete={(p) => setDeletingPlan(p)}
                  onToggleStatus={handleToggleStatus}
                  isToggling={toggleMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <PlansTable
              plans={plans}
              onView={(p) => setInspectingPlan(p)}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={(p) => setDeletingPlan(p)}
              onToggleStatus={handleToggleStatus}
            />
          )}
        </>
      )}

      {/* Modals & Sheets */}
      <PlanFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingPlan(null);
            setDuplicatePlan(null);
          }
        }}
        plan={editingPlan}
        duplicateFrom={duplicatePlan}
      />

      <PlanDetailsSheet
        plan={inspectingPlan}
        onClose={() => setInspectingPlan(null)}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={(p) => setDeletingPlan(p)}
        onToggleStatus={handleToggleStatus}
      />

      <PlanDeleteDialog
        plan={deletingPlan}
        open={!!deletingPlan}
        onOpenChange={(open) => !open && setDeletingPlan(null)}
      />
    </div>
  );
}

export default PlansView;
