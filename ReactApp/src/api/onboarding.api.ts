import { api } from "@/lib/api";
import { AuthUser } from "./auth.api";
import { PhoneNumber } from "./numbers.api";

export const ONBOARDING_STATUS_KEY = ["onboarding", "status"] as const;
export const STARTER_PLANS_KEY = ["onboarding", "starter-plans"] as const;

export type KycDocumentType =
  | "AADHAAR"
  | "PAN"
  | "PASSPORT"
  | "DRIVING_LICENSE"
  | "VOTER_ID";

export type KycStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface KycVerification {
  id: string;
  userId: string;
  fullName: string;
  dateOfBirth?: string | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  documentType: KycDocumentType;
  status: KycStatus;
  rejectionReason?: string | null;
  submittedAt: string;
  verifiedAt?: string | null;
}

export interface StarterPlan {
  id: string;
  name: string;
  description?: string | null;
  type: "PREPAID" | "POSTPAID" | "BUSINESS" | "VALIDITY_ONLY";
  price: string | number;
  currency: string;
  validityDays: number;
  dataAllowanceGb?: string | number | null;
  callingBenefit: string;
  smsCount?: number | null;
  isFeatured: boolean;
  dataBankEnabled: boolean;
  rolloverLimitMb?: number | null;
  dataTransferEnabled: boolean;
  transferLimitMb?: number | null;
}

export interface OnboardingStatus {
  isComplete: boolean;
  currentStep: number;
  user: AuthUser;
  kyc: KycVerification | null;
  activeSim: {
    id: string;
    phoneNumber?: PhoneNumber;
    category: string;
    technology: string;
    status: string;
  } | null;
}

export interface SubmitKycPayload {
  fullName: string;
  dateOfBirth?: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  documentType: KycDocumentType;
  documentNumber: string;
}

export interface CompleteOnboardingPayload {
  simCategory: "PERSONAL" | "BUSINESS";
  simTechnology: "PHYSICAL" | "ESIM";
  phoneNumberId: string;
  planId: string;
}

export interface CompleteOnboardingResponse {
  success: boolean;
  message: string;
  data: {
    simId: string;
    phoneNumber: string;
    planName: string;
    validityDays: number;
    simTechnology: string;
    orderId: string;
    dataBankBalanceMb: number;
  };
}

export interface CreateCheckoutResponse {
  sessionId?: string;
  url?: string | null;
  activated?: boolean;
  success?: boolean;
  message?: string;
  data?: CompleteOnboardingResponse["data"];
}

export const onboardingApi = {
  getStatus: () => api.get<OnboardingStatus>("/api/v1/onboarding/status"),

  createCheckout: (payload: CompleteOnboardingPayload) =>
    api.post<CreateCheckoutResponse>("/api/v1/onboarding/checkout", payload),

  verifyCheckout: (sessionId: string) =>
    api.get<CompleteOnboardingResponse>(
      `/api/v1/onboarding/checkout/verify?session_id=${encodeURIComponent(sessionId)}`
    ),

  submitKyc: (payload: SubmitKycPayload) =>
    api.post<{ message: string; kyc: KycVerification }>(
      "/api/v1/onboarding/kyc",
      payload
    ),

  getStarterPlans: () =>
    api.get<StarterPlan[]>("/api/v1/onboarding/starter-plans"),

  complete: (payload: CompleteOnboardingPayload) =>
    api.post<CompleteOnboardingResponse>(
      "/api/v1/onboarding/complete",
      payload
    ),
};
