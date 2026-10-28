import { useState } from "react";
import {
  Flame,
  Globe,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PhoneNumber,
  NumberCategory,
  PhoneNumberType,
  PhoneNumberStatus,
} from "@/api/numbers.api";

interface NumbersInventoryTableProps {
  numbers: PhoneNumber[];
  isLoading: boolean;
  onRefresh: () => void;
  search: string;
  onSearchChange: (search: string) => void;
  categoryFilter: "ALL" | NumberCategory;
  onCategoryFilterChange: (cat: "ALL" | NumberCategory) => void;
  typeFilter: "ALL" | PhoneNumberType;
  onTypeFilterChange: (type: "ALL" | PhoneNumberType) => void;
  statusFilter: "ALL" | PhoneNumberStatus;
  onStatusFilterChange: (status: "ALL" | PhoneNumberStatus) => void;
  onDeleteNumber: (id: string) => void;
  isDeleting: boolean;
  onOpenGenerateModal: () => void;
}

export function NumbersInventoryTable({
  numbers,
  isLoading,
  onRefresh,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  onDeleteNumber,
  isDeleting,
  onOpenGenerateModal,
}: NumbersInventoryTableProps) {
  const [searchInput, setSearchInput] = useState(search);

  const handleSearchSubmit = (val: string) => {
    setSearchInput(val);
    onSearchChange(val);
  };

  const getStatusBadge = (status: PhoneNumberStatus) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
            Available
          </Badge>
        );
      case "RESERVED":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30">
            Hold (15m)
          </Badge>
        );
      case "ASSIGNED":
        return (
          <Badge className="bg-violet-500/10 text-violet-600 border border-violet-500/30">
            Assigned SIM
          </Badge>
        );
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="p-5 pb-4 border-b border-border/70 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle className="text-lg font-bold font-display text-foreground">
            Inventory & Distribution Pool
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time catalog of all telephone numbers synthesized by the backend engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={onOpenGenerateModal} className="text-xs font-semibold shadow-sm">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Generate Numbers
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search digits (e.g. 777, 9876)..."
              value={searchInput}
              onChange={(e) => handleSearchSubmit(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="flex items-center rounded-lg border border-border p-1 bg-muted/30">
              <button
                type="button"
                onClick={() => onCategoryFilterChange("ALL")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  categoryFilter === "ALL"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onCategoryFilterChange("PERSONAL")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  categoryFilter === "PERSONAL"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => onCategoryFilterChange("BUSINESS")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  categoryFilter === "BUSINESS"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Business
              </button>
            </div>

            {/* Type / VIP Filter */}
            <div className="flex items-center rounded-lg border border-border p-1 bg-muted/30">
              <button
                type="button"
                onClick={() => onTypeFilterChange("ALL")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  typeFilter === "ALL"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Tiers
              </button>
              <button
                type="button"
                onClick={() => onTypeFilterChange("PREMIUM")}
                className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                  typeFilter === "PREMIUM"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flame className="h-3 w-3" />
                VIP Only
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center rounded-lg border border-border p-1 bg-muted/30">
              {(["ALL", "AVAILABLE", "RESERVED", "ASSIGNED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => onStatusFilterChange(st)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    statusFilter === st
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Numbers Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Tier & Pattern</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      Loading inventory records...
                    </td>
                  </tr>
                ) : numbers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <p className="text-sm font-medium text-foreground">No numbers found</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        No phone numbers match the active filters. Generate a fresh batch with the Number Engine to replenish customer onboarding inventory.
                      </p>
                      <Button
                        size="sm"
                        onClick={onOpenGenerateModal}
                        className="mt-4 text-xs font-semibold"
                      >
                        Generate Numbers Now
                      </Button>
                    </td>
                  </tr>
                ) : (
                  numbers.map((item) => {
                    const isPremium = item.type === "PREMIUM";
                    const isAvailable = item.status === "AVAILABLE";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {/* Number */}
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground text-sm tracking-wide">
                          {item.number}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          {item.prefix ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-violet-600 border-violet-300 font-semibold flex items-center gap-1 w-fit"
                            >
                              <Globe className="h-3 w-3" />
                              Biz ({item.prefix})
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-blue-600 border-blue-200 font-semibold flex items-center gap-1 w-fit"
                            >
                              <Phone className="h-3 w-3" />
                              Personal
                            </Badge>
                          )}
                        </td>

                        {/* Tier */}
                        <td className="py-3.5 px-4">
                          {isPremium ? (
                            <Badge className="bg-amber-500 text-white font-bold text-[10px] flex items-center gap-1 w-fit shadow-xs">
                              <Flame className="h-3 w-3" />
                              VIP Number
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Standard
                            </span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          {Number(item.price) > 0 ? (
                            <span className="text-amber-600 font-bold">₹{item.price}</span>
                          ) : (
                            <span className="text-muted-foreground font-normal">Free</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {getStatusBadge(item.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          {isAvailable ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isDeleting}
                              onClick={() => onDeleteNumber(item.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete number from inventory"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Locked
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
