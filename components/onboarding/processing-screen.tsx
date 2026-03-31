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
      <div
        className="space-y-4 text-center"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          textAlign: "center",
        }}
      >
        <div
          className="rounded-md border border-red-200 bg-red-50 p-4"
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #fecaca",
            backgroundColor: "#fef2f2",
            padding: "1rem",
          }}
        >
          <p
            className="text-sm font-medium text-red-800"
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#991b1b",
              margin: 0,
            }}
          >
            Something went wrong
          </p>
          <p
            className="mt-1 text-sm text-red-600"
            style={{
              fontSize: "0.875rem",
              color: "#dc2626",
              marginTop: "0.25rem",
            }}
          >
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
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          style={{
            borderRadius: "0.375rem",
            backgroundColor: "#2563eb",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
          }}
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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        textAlign: "center",
      }}
      data-testid="processing-screen"
    >
      <div>
        <h2
          className="text-xl font-bold text-gray-900"
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          Building your prediction
        </h2>
        <p
          className="mt-2 text-sm text-gray-500"
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            marginTop: "0.5rem",
          }}
        >
          Analyzing your data against regional allergen profiles...
        </p>
      </div>

      {/* Spinner */}
      <div
        className="flex justify-center"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
          style={{
            height: "3rem",
            width: "3rem",
            borderRadius: "9999px",
            border: "4px solid #e5e7eb",
            borderTopColor: "#2563eb",
            animation: "spin 1s linear infinite",
          }}
          role="status"
          aria-label="Processing"
        />
      </div>

      {/* Current message */}
      <p
        className="text-sm font-medium text-gray-700"
        style={{
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "#374151",
          minHeight: "1.25rem",
        }}
        data-testid="processing-message"
        aria-live="polite"
      >
        {PROCESSING_MESSAGES[messageIndex]}
      </p>

      {/* Progress bar */}
      <div
        className="mx-auto w-full max-w-xs"
        style={{ maxWidth: "20rem", margin: "0 auto", width: "100%" }}
      >
        <div
          className="h-2 w-full rounded-full bg-gray-200"
          style={{
            height: "0.5rem",
            width: "100%",
            borderRadius: "9999px",
            backgroundColor: "#e5e7eb",
            overflow: "hidden",
          }}
        >
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{
              height: "100%",
              borderRadius: "9999px",
              backgroundColor: "#2563eb",
              width: `${progress}%`,
              transition: "width 0.5s ease",
            }}
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
