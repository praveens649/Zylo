import { Cpu, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthUser } from "@/api/auth.api";

import { useAdminNumbers } from "../_hooks/use-admin-numbers";
import { InventoryStatsCards } from "./inventory-stats-cards";
import { NumberGeneratorModal } from "./number-generator-modal";
import { NumbersInventoryTable } from "./numbers-inventory-table";

interface AdminDashboardProps {
  user: AuthUser;
}

export function AdminDashboard({ user: _user }: AdminDashboardProps) {
  const {
    numbers,
    stats,
    isLoading,
    refetch,
    categoryFilter,
    setCategoryFilter,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    isGenerateOpen,
    setIsGenerateOpen,
    genCategory,
    setGenCategory,
    genCount,
    setGenCount,
    genPrefix,
    setGenPrefix,
    allowPremium,
    setAllowPremium,
    genError,
    lastGeneratedResult,
    isGenerating,
    handleTriggerGenerate,
    isDeleting,
    deleteNumber,
  } = useAdminNumbers();

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Admin Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-primary text-primary-foreground font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              Super Admin Control Center
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              Engine: Online
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">
            Telecom Number Engine & Inventory
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Synthesize batches of validated Indian mobile numbers with automated pattern classification (Standard vs VIP Gold/Diamond/Royal). Numbers generated here immediately populate the Customer Onboarding pool.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={() => setIsGenerateOpen(true)}
            className="font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Zap className="h-4 w-4 mr-2" />
            Generate Numbers
          </Button>
        </div>
      </div>

      {/* Onboarding Connection Banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
          <Sparkles className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Onboarding Live Sync:</strong> When new customers register and reach Step 3 ("Choose Number"), they pick directly from the available numbers generated below.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsGenerateOpen(true)}
          className="text-xs font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 flex-shrink-0 hidden sm:inline-flex"
        >
          Quick Generate +10
        </Button>
      </div>

      {/* Summary Metrics */}
      <InventoryStatsCards stats={stats} />

      {/* Main Numbers Inventory Table */}
      <NumbersInventoryTable
        numbers={numbers}
        isLoading={isLoading}
        onRefresh={refetch}
        search={search}
        onSearchChange={setSearch}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onDeleteNumber={deleteNumber}
        isDeleting={isDeleting}
        onOpenGenerateModal={() => setIsGenerateOpen(true)}
      />

      {/* Generator Dialog Modal */}
      <NumberGeneratorModal
        isOpen={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        category={genCategory}
        onCategoryChange={setGenCategory}
        count={genCount}
        onCountChange={setGenCount}
        prefix={genPrefix}
        onPrefixChange={setGenPrefix}
        allowPremium={allowPremium}
        onAllowPremiumChange={setAllowPremium}
        error={genError}
        isGenerating={isGenerating}
        onGenerate={handleTriggerGenerate}
        lastResult={lastGeneratedResult}
      />
    </div>
  );
}
