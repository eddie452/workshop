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
      <div
        className="mx-auto max-w-md px-4 py-16"
        style={{
          maxWidth: "28rem",
          margin: "0 auto",
          padding: "4rem 1rem",
        }}
      >
        <ProcessingScreen formData={formData} />
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-md px-4 py-8"
      style={{
        maxWidth: "28rem",
        margin: "0 auto",
        padding: "2rem 1rem",
      }}
    >
      {/* Step indicator */}
      <nav
        aria-label="Onboarding progress"
        className="mb-8"
        style={{ marginBottom: "2rem" }}
      >
        <ol
          className="flex items-center justify-between"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {STEPS.filter((s) => s !== "processing").map((step, i) => {
            const isActive = i === stepIndex;
            const isCompleted = i < stepIndex;
            return (
              <li
                key={step}
                className="flex flex-col items-center"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : isCompleted
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-200 text-gray-500"
                  }`}
                  style={{
                    display: "flex",
                    height: "2rem",
                    width: "2rem",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    backgroundColor: isActive
                      ? "#2563eb"
                      : isCompleted
                        ? "#dbeafe"
                        : "#e5e7eb",
                    color: isActive
                      ? "#ffffff"
                      : isCompleted
                        ? "#2563eb"
                        : "#6b7280",
                  }}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? "\u2713" : i + 1}
                </div>
                <span
                  className={`mt-1 text-xs ${
                    isActive
                      ? "font-medium text-blue-600"
                      : "text-gray-500"
                  }`}
                  style={{
                    marginTop: "0.25rem",
                    fontSize: "0.75rem",
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? "#2563eb" : "#6b7280",
                  }}
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
