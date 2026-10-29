import { api } from "@/lib/api";
import { AuthUser } from "./auth.api";
import { PhoneNumber } from "./numbers.api";

export const ONBOARDING_STATUS_KEY = ["onboarding", "status"] as const;
export const STARTER_PLANS_KEY = ["onboarding", "starter-plans"] as const;
export const BUSINESS_PLANS_KEY = ["onboarding", "business-plans"] as const;

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

export type OrganizationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export interface BusinessOrganization {
  id: string;
  name: string;
  businessType?: string | null;
  registrationNumber?: string | null;
  businessEmail: string;
  address: string;
  city: string;
  state: string;
  postalCode?: string | null;
  numberPrefix?: string | null;
  verificationDocumentId?: string | null;
  status: OrganizationStatus;
  ownerUserId: string;
  createdAt: string;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  employeeId: string;
  role: "OWNER" | "ADMIN" | "EMPLOYEE";
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "REMOVED";
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
  organization: BusinessOrganization | null;
  membership: OrganizationMembership | null;
  allocatedNumber: { id: string; number: string } | null;
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

export interface RegisterBusinessPayload {
  name: string;
  businessType?: string;
  registrationNumber?: string;
  businessEmail: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  numberPrefix: string;
  employeeId?: string;
  verificationDocumentId?: string;
}

export interface RegisterBusinessResponse {
  message: string;
  organization: BusinessOrganization;
  membership: OrganizationMembership | null;
  numbersGenerated: number;
}

export interface CompleteOnboardingPayload {
  simCategory: "PERSONAL" | "BUSINESS";
  simTechnology: "PHYSICAL" | "ESIM";
  phoneNumberId: string;
  planId: string;
  organizationId?: string;
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
    organizationName: string | null;
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

export interface BusinessInvite {
  id: string;
  email: string;
  employeeId: string | null;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  phoneNumber: { id: string; number: string } | null;
}

export interface MyInvite {
  id: string;
  email: string;
  employeeId: string | null;
  expiresAt: string;
  organization: { name: string; numberPrefix: string };
  phoneNumber: { id: string; number: string } | null;
}

export interface InvitePreview {
  email: string;
  status: BusinessInvite["status"];
  expiresAt: string;
  organization: { name: string; numberPrefix: string };
}

export interface AcceptInviteResponse {
  message: string;
  organization: BusinessOrganization;
  membership: { id: string; role: string; status: string };
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

  listInvites: () =>
    api.get<BusinessInvite[]>("/api/v1/onboarding/invites"),

  createInvite: (payload: {
    email: string;
    phoneNumberId: string;
    employeeId?: string;
  }) =>
    api.post<{ invite: BusinessInvite; token: string }>(
      "/api/v1/onboarding/invites",
      payload,
    ),

  cancelInvite: (id: string) =>
    api.delete(`/api/v1/onboarding/invites/${id}`),

  lookupInvite: (token: string) =>
    api.get<InvitePreview>(
      `/api/v1/onboarding/invites/lookup?token=${encodeURIComponent(token)}`
    ),

  acceptInvite: (token: string) =>
    api.post<AcceptInviteResponse>("/api/v1/onboarding/invites/accept", {
      token,
    }),

  declineInvite: (token: string) =>
    api.post<{ message: string }>("/api/v1/onboarding/invites/decline", {
      token,
    }),

  myInvites: () => api.get<MyInvite[]>("/api/v1/onboarding/invites/mine"),

  acceptInviteById: (id: string) =>
    api.post<AcceptInviteResponse>(
      `/api/v1/onboarding/invites/${id}/accept`,
      {},
    ),

  declineInviteById: (id: string) =>
    api.post<{ message: string }>(
      `/api/v1/onboarding/invites/${id}/decline`,
      {},
    ),

  getBusinessPlans: () =>
    api.get<StarterPlan[]>("/api/v1/onboarding/business-plans"),

  registerBusiness: (payload: RegisterBusinessPayload) =>
    api.post<RegisterBusinessResponse>(
      "/api/v1/onboarding/business",
      payload
    ),

  complete: (payload: CompleteOnboardingPayload) =>
    api.post<CompleteOnboardingResponse>(
      "/api/v1/onboarding/complete",
      payload
    ),
};
