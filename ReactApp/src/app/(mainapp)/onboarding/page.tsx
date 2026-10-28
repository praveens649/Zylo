import { Loader2 } from "lucide-react";
import { OnboardingHeader } from "./_components/onboarding-header";
import { OnboardingStepper } from "./_components/onboarding-stepper";
import { StepSimType } from "./_components/step-sim-type";
import { StepKyc } from "./_components/step-kyc";
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
    statusData,
    isStatusLoading,
    isSubmittingKyc,
    submitKyc,
    numbers,
    isNumbersLoading,
    selectedNumber,
    isReserving,
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

      <OnboardingStepper currentStep={currentStep} isActivated={isActivated} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
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

            {/* Step 2: KYC Verification */}
            {currentStep === 2 && (
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
            )}

            {/* Step 3: Number Selection */}
            {currentStep === 3 && (
              <StepNumberSelection
                numbers={numbers}
                isLoading={isNumbersLoading}
                selectedNumber={selectedNumber}
                isReserving={isReserving}
                onSelectNumber={handleSelectNumber}
                onGenerateNumbers={handleGenerateNumbers}
                onBack={() => setCurrentStep(2)}
                onNext={() => setCurrentStep(4)}
                onSearchChange={setNumberSearch}
                filter={numberFilter}
                onFilterChange={setNumberFilter}
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
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
