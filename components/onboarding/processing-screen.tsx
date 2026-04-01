"use client";

/**
 * Processing Screen
 *
 * Displays 8 sequential messages over 4 seconds while the onboarding
 * API processes the user's data. Redirects to /dashboard on completion.
 *
 * Per ticket: "Processing screen must show exactly 8 sequential messages
 * over 4 seconds"
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PROCESSING_MESSAGES,
  MESSAGE_INTERVAL_MS,
} from "@/lib/onboarding/processing-messages";
import type { OnboardingFormData } from "./types";

interface ProcessingScreenProps {
  formData: OnboardingFormData;
}

export function ProcessingScreen({ formData }: ProcessingScreenProps) {
  const router = useRouter();
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [apiDone, setApiDone] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);

  // Submit onboarding data to API
  const submitOnboarding = useCallback(async () => {
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: formData.address,
          has_pets: formData.has_pets,
          pet_types: formData.pet_types.length > 0 ? formData.pet_types : undefined,
          prior_allergy_diagnosis: formData.prior_allergy_diagnosis,
          known_allergens:
            formData.known_allergens.length > 0
              ? formData.known_allergens
              : undefined,
          seasonal_pattern: formData.seasonal_pattern,
          cockroach_sighting: formData.cockroach_sighting,
          has_mold_moisture: formData.has_mold_moisture,
          smoking_in_home: formData.smoking_in_home,
          manual_home_type: formData.home_type ?? undefined,
          manual_year_built: formData.year_built ?? undefined,
          manual_sqft: formData.sqft ?? undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Onboarding failed");
      }

      setApiDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    }
  }, [formData]);

  // Start API call on mount
  useEffect(() => {
    submitOnboarding();
  }, [submitOnboarding]);

  // Cycle through messages
  useEffect(() => {
    if (messageIndex >= PROCESSING_MESSAGES.length - 1) {
      setAnimationDone(true);
      return;
    }

    const timer = setTimeout(() => {
      setMessageIndex((prev) => prev + 1);
    }, MESSAGE_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [messageIndex]);

  // Redirect when both API and animation are done
  useEffect(() => {
    if (apiDone && animationDone && !error) {
      router.push("/dashboard");
    }
  }, [apiDone, animationDone, error, router]);

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md border border-[#B8E4F0] bg-[#E0F0F8] p-4">
          <p className="text-sm font-medium text-[#055A8C]">
            Something went wrong
          </p>
          <p className="mt-1 text-sm text-[#056DA5]">
            {error}
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setApiDone(false);
            setMessageIndex(0);
            setAnimationDone(false);
            submitOnboarding();
          }}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  const progress =
    ((messageIndex + 1) / PROCESSING_MESSAGES.length) * 100;

  return (
    <div
      className="space-y-8 text-center"
      data-testid="processing-screen"
    >
      <div>
        <h2 className="text-xl font-bold text-brand-primary-dark">
          Building your prediction
        </h2>
        <p className="mt-2 text-sm text-brand-text-muted">
          Analyzing your data against regional allergen profiles...
        </p>
      </div>

      {/* Spinner */}
      <div className="flex justify-center">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-brand-border border-t-brand-primary"
          role="status"
          aria-label="Processing"
        />
      </div>

      {/* Current message */}
      <p
        className="min-h-5 text-sm font-medium text-brand-text"
        data-testid="processing-message"
        aria-live="polite"
      >
        {PROCESSING_MESSAGES[messageIndex]}
      </p>

      {/* Progress bar */}
      <div className="mx-auto w-full max-w-xs">
        <div className="h-2 w-full overflow-hidden rounded-full bg-brand-border-light">
          <div
            className="h-full rounded-full bg-brand-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </div>
  );
}
