import { Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ONBOARDING_STATUS_KEY } from "@/api/onboarding.api";
import { InviteAccept } from "./_components/invite-accept";
import { PendingInviteCard } from "../dashboard/_components/pending-invite-card";
import { OnboardingHeader } from "./_components/onboarding-header";
import { OnboardingStepper } from "./_components/onboarding-stepper";
import { StepSimType } from "./_components/step-sim-type";
import { StepKyc } from "./_components/step-kyc";
import { StepBusinessDetails } from "./_components/step-business-details";
import { StepNumberSelection } from "./_components/step-number-selection";
import { StepStarterPlan } from "./_components/step-starter-plan";
import { StepPaymentActivation } from "./_components/step-payment-activation";
import { ActivationSuccess } from "./_components/activation-success";
import { useOnboarding } from "./_hooks/use-onboarding";

export default function OnboardingPage() {
  const {
    currentStep,
    setCurrentStep,
    goToDashboard,
    simCategory,
    setSimCategory,
    isBusiness,
    statusData,
    isStatusLoading,
    isSubmittingKyc,
    submitKyc,
    organization,
    isSubmittingBusiness,
    submitBusiness,
    numbers,
    isNumbersLoading,
    selectedNumber,
    isReserving,
    reservingNumberId,
    handleSelectNumber,
    handleGenerateNumbers,
    numberFilter,
    setNumberFilter,
    setNumberSearch,
    plans,
    isPlansLoading,
    selectedPlan,
    setSelectedPlanId,
    isActivating,
    activateSim,
    isActivated,
    activationResult,
  } = useOnboarding();

  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  if (inviteToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <InviteAccept
          token={inviteToken}
          onAccepted={() => {
            setSimCategory("BUSINESS");
            queryClient.invalidateQueries({ queryKey: ONBOARDING_STATUS_KEY });
            setSearchParams({}, { replace: true });
          }}
          onDone={() => setSearchParams({}, { replace: true })}
        />
      </div>
    );
  }

  if (isStatusLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingHeader />

      <OnboardingStepper
        currentStep={currentStep}
        isActivated={isActivated}
        simCategory={simCategory}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PendingInviteCard />
        {isActivated && activationResult ? (
          <ActivationSuccess
            data={activationResult}
            onGoToDashboard={goToDashboard}
          />
        ) : (
          <>
            {/* Step 1: SIM Type */}
            {currentStep === 1 && (
              <StepSimType
                simCategory={simCategory}
                setSimCategory={setSimCategory}
                onNext={() => setCurrentStep(2)}
              />
            )}

            {/* Step 2: KYC (personal) or Business verification (business) */}
            {currentStep === 2 &&
              (isBusiness ? (
                <StepBusinessDetails
                  existingOrg={organization}
                  isSubmitting={isSubmittingBusiness}
                  onBack={() => setCurrentStep(1)}
                  onSubmit={submitBusiness}
                />
              ) : (
                <StepKyc
                  initialFullName={statusData?.kyc?.fullName || ""}
                  initialAddress={statusData?.kyc?.address || ""}
                  initialCity={statusData?.kyc?.city || ""}
                  initialState={statusData?.kyc?.state || ""}
                  initialPostalCode={statusData?.kyc?.postalCode || ""}
                  initialDocumentType={statusData?.kyc?.documentType || "AADHAAR"}
                  isSubmitting={isSubmittingKyc}
                  onBack={() => setCurrentStep(1)}
                  onSubmit={submitKyc}
                />
              ))}

            {/* Step 3: Number Selection */}
            {currentStep === 3 && (
              <StepNumberSelection
                numbers={numbers}
                isLoading={isNumbersLoading}
                selectedNumber={selectedNumber}
                isReserving={isReserving}
                reservingNumberId={reservingNumberId}
                onSelectNumber={handleSelectNumber}
                onGenerateNumbers={handleGenerateNumbers}
                onBack={() => setCurrentStep(2)}
                onNext={() => setCurrentStep(4)}
                onSearchChange={setNumberSearch}
                filter={numberFilter}
                onFilterChange={setNumberFilter}
                isBusiness={isBusiness}
              />
            )}

            {/* Step 4: Starter Plan */}
            {currentStep === 4 && (
              <StepStarterPlan
                plans={plans}
                isLoading={isPlansLoading}
                selectedPlan={selectedPlan}
                onSelectPlanId={(id) => setSelectedPlanId(id)}
                onBack={() => setCurrentStep(3)}
                onNext={() => setCurrentStep(5)}
              />
            )}

            {/* Step 5: Activation & Stripe Payment */}
            {currentStep === 5 && (
              <StepPaymentActivation
                selectedNumber={selectedNumber}
                selectedPlan={selectedPlan}
                isActivating={isActivating}
                onBack={() => setCurrentStep(4)}
                onActivate={activateSim}
                simCategory={simCategory}
                organizationName={organization?.name}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
