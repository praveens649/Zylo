import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/hooks/use-toast";
import {
  onboardingApi,
  ONBOARDING_STATUS_KEY,
  STARTER_PLANS_KEY,
  SubmitKycPayload,
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
  createCheckoutAction,
  verifyCheckoutAction,
  reserveNumberAction,
  generateNumbersAction,
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
    queryKey: [NUMBERS_AVAILABLE_KEY, params.search, params.type, params.category],
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
 * Master hook orchestrating the 5-step customer onboarding lifecycle,
 * state persistence, KYC verification, number reservation, and atomic Stripe activation.
 */
export function useOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const verifiedSessionRef = useRef<string | null>(null);

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);

  // Step 1: SIM Category
  const [simCategory, setSimCategory] = useState<"PERSONAL" | "BUSINESS">("PERSONAL");

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

  // Fetch Available Numbers for Step 3
  const {
    data: numbersData,
    isLoading: isNumbersLoading,
    refetch: refetchNumbers,
  } = useAvailableNumbers(
    {
      category: "PERSONAL",
      type: numberFilter === "ALL" ? undefined : numberFilter,
      search: numberSearch.trim() || undefined,
      limit: 20,
    },
    currentStep === 3
  );

  // Fetch Starter Plans for Step 4 & 5
  const { data: plansData, isLoading: isPlansLoading } = useStarterPlans(
    currentStep === 4 || currentStep === 5
  );

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

  const handleActivationSuccess = (data: ActivationData) => {
    queryClient.invalidateQueries({ queryKey: ONBOARDING_STATUS_KEY });
    queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY });
    setActivationResult(data);
    setIsActivated(true);
    toast({
      title: "SIM Activated!",
      description: `Your Zylo line ${data.phoneNumber} is now active.`,
    });
  };

  // Mutation: Complete Onboarding Action (dev-only fallback, no real charge)
  const completeMutation = useMutation({
    mutationFn: () =>
      completeOnboardingAction({
        simCategory,
        simTechnology: "PHYSICAL",
        phoneNumberId: selectedNumber!.id,
        planId: selectedPlan!.id,
      }),
    onSuccess: (res) => {
      handleActivationSuccess(res.data);
    },
    onError: (err: any) => {
      toast({
        title: "Activation Failed",
        description: err?.message || "Payment or activation failed. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Create Stripe Checkout session and redirect to hosted payment
  const checkoutMutation = useMutation({
    mutationFn: () =>
      createCheckoutAction({
        simCategory,
        simTechnology: "PHYSICAL",
        phoneNumberId: selectedNumber!.id,
        planId: selectedPlan!.id,
      }),
    onSuccess: (res) => {
      if (res.activated && res.data) {
        // A previous pending session already captured the payment.
        handleActivationSuccess(res.data);
        return;
      }
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      toast({
        title: "Checkout Error",
        description: "Could not start the Stripe checkout. Please try again.",
        variant: "destructive",
      });
    },
    onError: (err: any) => {
      if (err?.code === "STRIPE_NOT_CONFIGURED") {
        toast({
          title: "Dev Payment Simulator",
          description:
            "Stripe is not configured — activating via development simulator instead.",
        });
        completeMutation.mutate();
        return;
      }
      toast({
        title: "Checkout Failed",
        description: err?.message || "Could not start payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Verify Stripe session after redirect back from hosted checkout
  const verifyMutation = useMutation({
    mutationFn: (sessionId: string) => verifyCheckoutAction(sessionId),
    onSuccess: (res) => {
      handleActivationSuccess(res.data);
      setSearchParams({}, { replace: true });
    },
    onError: (err: any) => {
      toast({
        title: "Payment Not Confirmed",
        description:
          err?.message || "We could not confirm your payment. If you were charged, please contact support.",
        variant: "destructive",
      });
      setSearchParams({}, { replace: true });
    },
  });

  // Handle the redirect back from Stripe hosted checkout
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const paymentState = searchParams.get("payment");

    if (sessionId) {
      if (verifiedSessionRef.current === sessionId) return;
      verifiedSessionRef.current = sessionId;
      verifyMutation.mutate(sessionId);
      return;
    }

    if (paymentState === "cancelled") {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again whenever you're ready.",
        variant: "destructive",
      });
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

    // Step 2: KYC
    statusData,
    isStatusLoading,
    isSubmittingKyc: submitKycMutation.isPending,
    submitKyc: (payload: SubmitKycPayload) => submitKycMutation.mutate(payload),

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
    isActivating:
      checkoutMutation.isPending ||
      verifyMutation.isPending ||
      completeMutation.isPending,
    activateSim: () => checkoutMutation.mutate(),
    isActivated,
    activationResult,
  };
}
