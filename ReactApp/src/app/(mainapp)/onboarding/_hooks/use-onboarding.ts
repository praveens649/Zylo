import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/hooks/use-toast";
import {
  onboardingApi,
  ONBOARDING_STATUS_KEY,
  STARTER_PLANS_KEY,
  BUSINESS_PLANS_KEY,
  SubmitKycPayload,
  RegisterBusinessPayload,
  BusinessOrganization,
} from "@/api/onboarding.api";
import {
  numbersApi,
  NUMBERS_AVAILABLE_KEY,
  PhoneNumber,
  ListAvailableNumbersParams,
} from "@/api/numbers.api";
import { AUTH_ME_KEY } from "@/api/auth.api";

import {
  submitKycAction,
  completeOnboardingAction,
  reserveNumberAction,
  generateNumbersAction,
  registerBusinessAction,
} from "../_actions/onboarding.actions";
import { OnboardingStep } from "../_components/onboarding-stepper";
import { ActivationData } from "../_components/activation-success";

/**
 * Hook to retrieve onboarding status and verify if current customer already has an active SIM.
 */
export function useOnboardingStatus() {
  return useQuery({
    queryKey: ONBOARDING_STATUS_KEY,
    queryFn: onboardingApi.getStatus,
  });
}

/**
 * Hook to retrieve available inventory of phone numbers with optional search and type filtering.
 */
export function useAvailableNumbers(
  params: ListAvailableNumbersParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: [
      NUMBERS_AVAILABLE_KEY,
      params.search,
      params.type,
      params.category,
      params.organizationId,
    ],
    queryFn: () => numbersApi.getAvailable(params),
    enabled,
  });
}

/**
 * Hook to fetch starter 5G mobile packs.
 */
export function useStarterPlans(enabled = true) {
  return useQuery({
    queryKey: STARTER_PLANS_KEY,
    queryFn: onboardingApi.getStarterPlans,
    enabled,
  });
}

/**
 * Hook to fetch business-only plans for Business SIM onboarding.
 */
export function useBusinessPlans(enabled = true) {
  return useQuery({
    queryKey: BUSINESS_PLANS_KEY,
    queryFn: onboardingApi.getBusinessPlans,
    enabled,
  });
}

/**
 * Master hook orchestrating the 5-step customer onboarding lifecycle,
 * state persistence, KYC verification, number reservation, and atomic Stripe activation.
 */
export function useOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);

  // Step 1: SIM Category
  const [simCategory, setSimCategory] = useState<"PERSONAL" | "BUSINESS">("PERSONAL");
  const isBusiness = simCategory === "BUSINESS";

  // Step 2 (business): registered organization — from status (resume) or the
  // register mutation response.
  const [registeredOrg, setRegisteredOrg] = useState<BusinessOrganization | null>(null);

  // Step 3: Number Selection State
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [numberSearch, setNumberSearch] = useState("");
  const [numberFilter, setNumberFilter] = useState<"ALL" | "STANDARD" | "PREMIUM">("ALL");
  const [isReserving, setIsReserving] = useState(false);

  // Step 4: Plan Selection State
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Step 5: Activation & Success State
  const [isActivated, setIsActivated] = useState(false);
  const [activationResult, setActivationResult] = useState<ActivationData | null>(null);

  // Fetch Onboarding Status
  const { data: statusData, isLoading: isStatusLoading } = useOnboardingStatus();

  // Redirect to dashboard if user has already completed onboarding
  useEffect(() => {
    if (statusData?.isComplete && !isActivated) {
      navigate("/dashboard", { replace: true });
    }
  }, [statusData?.isComplete, isActivated, navigate]);

  const organization = registeredOrg ?? statusData?.organization ?? null;

  // Fetch Available Numbers for Step 3 — business uses the org prefix pool.
  const {
    data: numbersData,
    isLoading: isNumbersLoading,
    refetch: refetchNumbers,
  } = useAvailableNumbers(
    {
      category: simCategory,
      type: numberFilter === "ALL" ? undefined : numberFilter,
      search: numberSearch.trim() || undefined,
      organizationId: isBusiness ? organization?.id : undefined,
      limit: 20,
    },
    currentStep === 3 && (!isBusiness || !!organization)
  );

  // Fetch Plans for Step 4 & 5 — business-only plans for Business SIMs.
  const { data: personalPlans, isLoading: isPersonalPlansLoading } =
    useStarterPlans((currentStep === 4 || currentStep === 5) && !isBusiness);
  const { data: businessPlans, isLoading: isBusinessPlansLoading } =
    useBusinessPlans((currentStep === 4 || currentStep === 5) && isBusiness);

  const plansData = isBusiness ? businessPlans : personalPlans;
  const isPlansLoading = isBusiness
    ? isBusinessPlansLoading
    : isPersonalPlansLoading;

  // Derived active selected plan
  const selectedPlan =
    plansData?.find((p) => p.id === selectedPlanId) ||
    plansData?.find((p) => p.isFeatured) ||
    plansData?.[0] ||
    null;

  // Mutation: Submit KYC Action
  const submitKycMutation = useMutation({
    mutationFn: (payload: SubmitKycPayload) => submitKycAction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY });
      toast({
        title: "KYC Verified!",
        description: "Your DoT identity check passed successfully.",
      });
      setCurrentStep(3);
    },
    onError: (err: any) => {
      toast({
        title: "KYC Verification Failed",
        description:
          err?.message || "Failed to verify KYC. Please check your document details.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Register & verify business organization (business step 2)
  const registerBusinessMutation = useMutation({
    mutationFn: (payload: RegisterBusinessPayload) =>
      registerBusinessAction(payload),
    onSuccess: (res) => {
      setRegisteredOrg(res.organization);
      queryClient.invalidateQueries({ queryKey: ONBOARDING_STATUS_KEY });
      toast({
        title: "Business Verified!",
        description: `${res.organization.name} approved — prefix ${res.organization.numberPrefix} activated.`,
      });
      setCurrentStep(3);
    },
    onError: (err: any) => {
      toast({
        title: "Verification Failed",
        description:
          err?.message || "Could not verify the organization. Check the details.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Complete Onboarding Action
  const completeMutation = useMutation({
    mutationFn: () =>
      completeOnboardingAction({
        simCategory,
        simTechnology: "PHYSICAL",
        phoneNumberId: selectedNumber!.id,
        planId: selectedPlan!.id,
        organizationId: isBusiness ? organization?.id : undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY });
      setActivationResult(res.data);
      setIsActivated(true);
      toast({
        title: "SIM Activated!",
        description: `Your Zylo line ${res.data.phoneNumber} is now active.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Activation Failed",
        description: err?.message || "Payment or activation failed. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handler: Reserve a selected number for 15 minutes
  const handleSelectNumber = async (num: PhoneNumber) => {
    try {
      setIsReserving(true);
      await reserveNumberAction(num.id, 15);
      setSelectedNumber(num);
      toast({
        title: "Number Held (15 Mins)",
        description: `${num.number} has been reserved for your checkout.`,
      });
    } catch (err: any) {
      toast({
        title: "Number Unavailable",
        description: err?.message || "Could not reserve this number. Please select another.",
        variant: "destructive",
      });
    } finally {
      setIsReserving(false);
    }
  };

  // Handler: Quick-generate fresh batch of numbers
  const handleGenerateNumbers = async () => {
    try {
      await generateNumbersAction({ type: "PERSONAL", count: 10, allowPremium: true });
      refetchNumbers();
      toast({
        title: "Numbers Generated",
        description: "10 fresh phone numbers added to inventory.",
      });
    } catch (err: any) {
      toast({
        title: "Generation Error",
        description: err?.message || "Failed to generate numbers.",
        variant: "destructive",
      });
    }
  };

  return {
    // Stepper & Navigation
    currentStep,
    setCurrentStep,
    goToDashboard: () => navigate("/dashboard"),

    // Step 1: SIM Type
    simCategory,
    setSimCategory,
    isBusiness,

    // Step 2: KYC
    statusData,
    isStatusLoading,
    isSubmittingKyc: submitKycMutation.isPending,
    submitKyc: (payload: SubmitKycPayload) => submitKycMutation.mutate(payload),

    // Step 2 (business): Organization registration
    organization,
    isSubmittingBusiness: registerBusinessMutation.isPending,
    submitBusiness: (payload: RegisterBusinessPayload) =>
      registerBusinessMutation.mutate(payload),

    // Step 3: Number Selection
    numbers: numbersData?.data || [],
    isNumbersLoading,
    selectedNumber,
    isReserving,
    handleSelectNumber,
    handleGenerateNumbers,
    numberFilter,
    setNumberFilter,
    setNumberSearch,

    // Step 4: Starter Plans
    plans: plansData,
    isPlansLoading,
    selectedPlan,
    setSelectedPlanId,

    // Step 5: Activation & Success
    isActivating: completeMutation.isPending,
    activateSim: () => completeMutation.mutate(),
    isActivated,
    activationResult,
  };
}
