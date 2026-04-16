"use client";

/**
 * Onboarding Wizard
 *
 * Multi-step wizard that collects user information and processes
 * their first allergen prediction. Steps:
 *
 * 1. Address entry
 * 2. Home details (auto-populated from BatchData when available)
 * 3. Health questions (pets, diagnosis, seasonal pattern)
 * 4. Confirmation review
 * 5. Processing screen (4 seconds, 8 messages)
 */

import { useState, useCallback } from "react";
import {
  INITIAL_FORM_DATA,
  type OnboardingFormData,
  type OnboardingStep,
} from "./types";
import { StepAddress } from "./step-address";
import { StepHomeDetails } from "./step-home-details";
import { StepHealthQuestions } from "./step-health-questions";
import { StepConfirmation } from "./step-confirmation";
import { ProcessingScreen } from "./processing-screen";

const STEPS: OnboardingStep[] = [
  "address",
  "home-details",
  "health-questions",
  "confirmation",
  "processing",
];

/** Labels for the step indicator */
const STEP_LABELS: Record<OnboardingStep, string> = {
  address: "Location",
  "home-details": "Home",
  "health-questions": "Health",
  confirmation: "Confirm",
  processing: "Results",
};

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("address");
  const [formData, setFormData] =
    useState<OnboardingFormData>(INITIAL_FORM_DATA);

  const stepIndex = STEPS.indexOf(currentStep);

  const handleUpdate = useCallback(
    (updates: Partial<OnboardingFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const handleNext = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [stepIndex]);

  const handleBack = useCallback(() => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [stepIndex]);

  const stepProps = {
    formData,
    onUpdate: handleUpdate,
    onNext: handleNext,
    onBack: handleBack,
  };

  // Processing screen has its own layout
  if (currentStep === "processing") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <ProcessingScreen formData={formData} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      {/* Step indicator */}
      <nav
        aria-label="Onboarding progress"
        className="mb-8"
      >
        <ol className="flex list-none items-center justify-between p-0 m-0">
          {STEPS.filter((s) => s !== "processing").map((step, i) => {
            const isActive = i === stepIndex;
            const isCompleted = i < stepIndex;
            return (
              <li
                key={step}
                className="flex flex-1 flex-col items-center"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-brand-premium text-white"
                      : isCompleted
                        ? "bg-brand-primary-light text-brand-primary"
                        : "bg-brand-border-light text-brand-text-muted"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? "\u2713" : i + 1}
                </div>
                <span
                  className={`mt-1 text-xs ${
                    isActive
                      ? "font-medium text-brand-primary"
                      : "text-brand-text-muted"
                  }`}
                >
                  {STEP_LABELS[step]}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      {currentStep === "address" && <StepAddress {...stepProps} />}
      {currentStep === "home-details" && <StepHomeDetails {...stepProps} />}
      {currentStep === "health-questions" && (
        <StepHealthQuestions {...stepProps} />
      )}
      {currentStep === "confirmation" && (
        <StepConfirmation {...stepProps} />
      )}
    </div>
  );
}
