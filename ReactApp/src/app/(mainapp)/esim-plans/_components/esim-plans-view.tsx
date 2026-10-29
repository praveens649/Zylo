"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Hash,
  Loader2,
  Plane,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import type { InternationalPlan } from "@/api/travel-esim.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminEsimPlans, useToggleEsimPlan } from "../_hooks/use-esim-plans";
import { AdminEsimPlanCard } from "./admin-esim-plan-card";
import { EsimPlanFormDialog } from "./esim-plan-form-dialog";
import { EsimPlanDetailsDialog } from "./esim-plan-details-dialog";
import { EsimPlanDeleteDialog } from "./esim-plan-delete-dialog";
import { EsimNumbersDialog } from "./esim-numbers-dialog";

export function EsimPlansView() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InternationalPlan | null>(
    null
  );
  const [viewingPlan, setViewingPlan] = useState<InternationalPlan | null>(
    null
  );
  const [deletingPlan, setDeletingPlan] = useState<InternationalPlan | null>(
    null
  );
  const [isNumbersOpen, setIsNumbersOpen] = useState(false);

  const {
    data: plansData = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminEsimPlans();

  const toggleMutation = useToggleEsimPlan(() => {
    toast({
      title: "Status updated",
      description: "eSIM plan visibility changed.",
    });
  });

  const plans = useMemo(
    () =>
      plansData.filter((p) => {
        if (statusFilter === "ACTIVE" && !p.isActive) return false;
        if (statusFilter === "INACTIVE" && p.isActive) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.destinationCountry.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [plansData, statusFilter, searchQuery]
  );

  const handleEdit = (plan: InternationalPlan) => {
    setEditingPlan(plan);
    setIsFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-7 pb-10">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-sky-500/10 to-indigo-500/10 p-6 md:p-8 shadow-sm">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-2.5 py-0.5 font-semibold">
                <Plane className="h-3.5 w-3.5 mr-1" />
                Travel eSIM Catalog
              </Badge>
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground border-border/60"
              >
                Super Admin Console
              </Badge>
            </div>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              International eSIM Plans
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Create per-country travel packs — data, optional call minutes
              and SMS — that customers buy on the Travel eSIM page.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsNumbersOpen(true)}
              className="h-11 px-5 font-semibold border-sky-500/40 text-sky-500 hover:bg-sky-500/10"
            >
              <Hash className="h-4 w-4 mr-2" />
              eSIM Numbers
            </Button>
            <Button
              onClick={() => {
                setEditingPlan(null);
                setIsFormOpen(true);
              }}
              className="h-11 px-5 font-bold shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create eSIM Plan
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by plan name or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v: "ALL" | "ACTIVE" | "INACTIVE") =>
            setStatusFilter(v)
          }
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
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading travel eSIM catalog…</p>
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  Unable to fetch travel eSIM plans
                </p>
                <p className="text-xs text-destructive/80">
                  {error instanceof Error
                    ? error.message
                    : "Unknown error occurred"}
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

      {/* Empty */}
      {!isLoading && !isError && plans.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Plane className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            No travel eSIM plans
          </h3>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
            {searchQuery || statusFilter !== "ALL"
              ? "No plans match the current filters."
              : "Create your first country pack to offer international eSIMs."}
          </p>
          {!searchQuery && statusFilter === "ALL" && (
            <Button
              size="sm"
              className="mt-5"
              onClick={() => {
                setEditingPlan(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Plan
            </Button>
          )}
        </div>
      )}

      {/* Cards */}
      {!isLoading && !isError && plans.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <AdminEsimPlanCard
              key={plan.id}
              plan={plan}
              onView={setViewingPlan}
              onEdit={handleEdit}
              onToggle={(p) => toggleMutation.mutate(p.id)}
              onDelete={setDeletingPlan}
              isToggling={toggleMutation.isPending}
            />
          ))}
        </div>
      )}

      <EsimPlanFormDialog
        open={isFormOpen}
        plan={editingPlan}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingPlan(null);
        }}
      />

      <EsimPlanDetailsDialog
        plan={viewingPlan}
        onOpenChange={(open) => !open && setViewingPlan(null)}
      />

      <EsimPlanDeleteDialog
        plan={deletingPlan}
        onOpenChange={(open) => !open && setDeletingPlan(null)}
      />

      <EsimNumbersDialog
        open={isNumbersOpen}
        onOpenChange={setIsNumbersOpen}
      />
    </div>
  );
}

export default EsimPlansView;
