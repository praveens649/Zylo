import {
  onboardingApi,
  SubmitKycPayload,
  CompleteOnboardingPayload,
  RegisterBusinessPayload,
} from "@/api/onboarding.api";
import {
  numbersApi,
  GenerateNumbersPayload,
} from "@/api/numbers.api";

/**
 * Submits customer KYC verification payload to the backend DoT verification gateway.
 */
export async function submitKycAction(payload: SubmitKycPayload) {
  return onboardingApi.submitKyc(payload);
}

/**
 * Business onboarding — registers the organization and activates its
 * 4-digit corporate number prefix.
 */
export async function registerBusinessAction(payload: RegisterBusinessPayload) {
  return onboardingApi.registerBusiness(payload);
}

/**
 * Executes atomic SIM activation, starter plan subscription, and Stripe payment record.
 */
export async function completeOnboardingAction(payload: CompleteOnboardingPayload) {
  return onboardingApi.complete(payload);
}

/**
 * Creates a Stripe Checkout session for the SIM activation payment.
 */
export async function createCheckoutAction(payload: CompleteOnboardingPayload) {
  return onboardingApi.createCheckout(payload);
}

/**
 * Verifies the Stripe checkout session server-side after redirect and activates the SIM.
 */
export async function verifyCheckoutAction(sessionId: string) {
  return onboardingApi.verifyCheckout(sessionId);
}

export async function listInvitesAction() {
  return onboardingApi.listInvites();
}

export async function createInviteAction(payload: {
  email: string;
  phoneNumberId: string;
  employeeId?: string;
}) {
  return onboardingApi.createInvite(payload);
}

export async function cancelInviteAction(id: string) {
  return onboardingApi.cancelInvite(id);
}

export async function lookupInviteAction(token: string) {
  return onboardingApi.lookupInvite(token);
}

export async function acceptInviteAction(token: string) {
  return onboardingApi.acceptInvite(token);
}

export async function declineInviteAction(token: string) {
  return onboardingApi.declineInvite(token);
}

export async function myInvitesAction() {
  return onboardingApi.myInvites();
}

export async function acceptInviteByIdAction(id: string) {
  return onboardingApi.acceptInviteById(id);
}

export async function declineInviteByIdAction(id: string) {
  return onboardingApi.declineInviteById(id);
}

/**
 * Places a temporary 15-minute reservation hold on a selected phone number during checkout.
 */
export async function reserveNumberAction(numberId: string, holdMinutes = 15) {
  return numbersApi.reserve(numberId, holdMinutes);
}

/**
 * Generates fresh batch of standard and VIP phone numbers via the server engine.
 */
export async function generateNumbersAction(params: GenerateNumbersPayload) {
  return numbersApi.generate(params);
}
