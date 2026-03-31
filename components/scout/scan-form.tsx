"use client";

/**
 * Trigger Scout Scan Form
 *
 * Client component that handles image capture (camera or file upload),
 * sends it to the Trigger Scout API, and displays matched allergens
 * with active/dormant status badges.
 *
 * Photos are sent as base64 but NOT stored — only Vision labels (metadata)
 * are persisted in the database.
 */

import { useState, useRef, useCallback } from "react";
import type { ScanMatchResult, ScanResponse, ScanErrorResponse } from "./types";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ScanForm() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      if (file.size > 4 * 1024 * 1024) {
        setError("Image must be under 4MB");
        return;
      }

      setError(null);
      setResults(null);
      setIsScanning(true);

      try {
        const base64 = await fileToBase64(file);
        setPreviewUrl(base64);

        const response = await fetch("/api/trigger-scout/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: base64 }),
        });

        const data: ScanResponse | ScanErrorResponse = await response.json();

        if (!data.success) {
          setError((data as ScanErrorResponse).error);
          return;
        }

        setResults(data as ScanResponse);
      } catch {
        setError("Failed to scan image. Please try again.");
      } finally {
        setIsScanning(false);
      }
    },
    [fileToBase64],
  );

  const handleCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleReset = useCallback(() => {
    setError(null);
    setResults(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div>
      {/* Hidden file input — accepts camera and gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload plant photo"
        data-testid="scout-file-input"
      />

      {/* Image preview */}
      {previewUrl && (
        <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Plant photo preview"
            className="h-48 w-full object-cover"
            data-testid="scout-preview"
          />
        </div>
      )}

      {/* Action buttons */}
      {!results && (
        <button
          type="button"
          onClick={handleCapture}
          disabled={isScanning}
          className="w-full cursor-pointer rounded-lg border-none bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          data-testid="scout-capture-btn"
        >
          {isScanning ? "Scanning..." : "Take Photo or Upload"}
        </button>
      )}

      {/* Scanning spinner */}
      {isScanning && (
        <p
          className="mt-3 text-center text-sm text-gray-500"
          data-testid="scout-scanning"
        >
          Analyzing plant image with AI...
        </p>
      )}

      {/* Error message */}
      {error && (
        <div
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3"
          data-testid="scout-error"
        >
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div
          className="mt-4"
          data-testid="scout-results"
        >
          {results.matches.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">
                No allergen-producing plants identified in this photo.
                Try taking a closer photo of the plant.
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700">
                  {results.matches.length} plant
                  {results.matches.length === 1 ? "" : "s"} identified
                </p>
                {results.active_count > 0 && (
                  <p className="text-xs text-green-700">
                    {results.active_count} active — {results.proximity_multiplier}x
                    proximity multiplier applied
                  </p>
                )}
              </div>

              {/* Match cards */}
              <div className="space-y-2">
                {results.matches.map((match) => (
                  <MatchCard key={match.allergen_id} match={match} />
                ))}
              </div>
            </>
          )}

          {/* Scan again button */}
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            data-testid="scout-reset-btn"
          >
            Scan Another Plant
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Match Card                                                          */
/* ------------------------------------------------------------------ */

function MatchCard({ match }: { match: ScanMatchResult }) {
  const isActive = match.status === "active";

  return (
    <div
      className={`rounded-md border px-4 py-3 ${
        isActive
          ? "border-green-200 bg-green-50"
          : "border-amber-200 bg-amber-50"
      }`}
      data-testid={`scout-match-${match.allergen_id}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {match.common_name}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {match.category} &middot; {Math.round(match.confidence * 100)}%
            confidence
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            isActive
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
          data-testid={`scout-badge-${match.allergen_id}`}
        >
          {isActive ? "Active" : "Dormant"}
        </span>
      </div>
    </div>
  );
}
