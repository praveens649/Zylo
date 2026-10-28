import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/hooks/use-toast";
import {
  NUMBERS_ADMIN_KEY,
  NUMBERS_AVAILABLE_KEY,
  NumberCategory,
  PhoneNumberType,
  PhoneNumberStatus,
  GenerateNumbersResponse,
} from "@/api/numbers.api";

import {
  generateNumbersAction,
  fetchAdminInventoryAction,
  deleteNumberAction,
} from "../_actions/admin-numbers.actions";

export function useAdminNumbers() {
  const queryClient = useQueryClient();

  // Inventory Table Filter & Search State
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | NumberCategory>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | PhoneNumberType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PhoneNumberStatus>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Generator Dialog State
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [genCategory, setGenCategory] = useState<NumberCategory>("PERSONAL");
  const [genCount, setGenCount] = useState<number>(10);
  const [genPrefix, setGenPrefix] = useState<string>("");
  const [allowPremium, setAllowPremium] = useState<boolean>(true);
  const [genError, setGenError] = useState<string | null>(null);
  const [lastGeneratedResult, setLastGeneratedResult] = useState<GenerateNumbersResponse | null>(null);

  // Fetch Inventory and Summary Stats
  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: [NUMBERS_ADMIN_KEY, categoryFilter, typeFilter, search, page],
    queryFn: () =>
      fetchAdminInventoryAction({
        category: categoryFilter === "ALL" ? undefined : categoryFilter,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        search: search.trim() || undefined,
        page,
        limit,
      }),
  });

  // Mutation: Generate Numbers
  const generateMutation = useMutation({
    mutationFn: () => {
      const cleanPrefix = genPrefix.trim();
      return generateNumbersAction({
        type: genCategory,
        count: genCount,
        prefix: genCategory === "BUSINESS" && cleanPrefix ? cleanPrefix : undefined,
        allowPremium,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: NUMBERS_ADMIN_KEY });
      queryClient.invalidateQueries({ queryKey: NUMBERS_AVAILABLE_KEY });
      setLastGeneratedResult(res);
      setGenError(null);
      toast({
        title: "Numbers Generated Successfully!",
        description: `Generated ${res.totalGenerated} ${res.category.toLowerCase()} numbers (${res.premiumCount || 0} VIP, ${res.standardCount || 0} Standard).`,
      });
    },
    onError: (err: any) => {
      setGenError(err?.message || "Failed to generate phone numbers. Please try again.");
      toast({
        title: "Generation Failed",
        description: err?.message || "Failed to generate numbers.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Delete Number
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNumberAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NUMBERS_ADMIN_KEY });
      queryClient.invalidateQueries({ queryKey: NUMBERS_AVAILABLE_KEY });
      toast({
        title: "Number Deleted",
        description: "Number has been removed from active inventory.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Deletion Failed",
        description: err?.message || "Cannot delete an assigned number.",
        variant: "destructive",
      });
    },
  });

  // Handler to submit generation with validation
  const handleTriggerGenerate = () => {
    if (genCategory === "BUSINESS") {
      const cleanPrefix = genPrefix.trim();
      if (!cleanPrefix) {
        setGenError("Please provide a 4-digit corporate prefix for business numbers.");
        return;
      }
      if (!/^[6-9]\d{3}$/.test(cleanPrefix)) {
        setGenError("Business prefix must be 4 digits starting with 6, 7, 8, or 9.");
        return;
      }
    }
    setGenError(null);
    generateMutation.mutate();
  };

  // Filter numbers client-side for statusFilter if needed
  const numbersList = (inventoryData?.data || []).filter((item) => {
    if (statusFilter === "ALL") return true;
    return item.status === statusFilter;
  });

  return {
    // Inventory Data & Stats
    numbers: numbersList,
    stats: inventoryData?.stats || { AVAILABLE: 0, RESERVED: 0, ASSIGNED: 0 },
    meta: inventoryData?.meta,
    isLoading,
    refetch,

    // Filter controls
    categoryFilter,
    setCategoryFilter,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    page,
    setPage,

    // Generator Modal State & Handlers
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
    setGenError,
    lastGeneratedResult,
    isGenerating: generateMutation.isPending,
    handleTriggerGenerate,

    // Deletion
    isDeleting: deleteMutation.isPending,
    deleteNumber: (id: string) => deleteMutation.mutate(id),
  };
}
