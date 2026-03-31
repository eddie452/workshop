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

  /**
   * Convert a File to base64 string (without the data URI prefix).
   */
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Return the full data URI — the API will strip the prefix
        resolve(result);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }, []);

  /**
   * Handle file selection (from camera or gallery).
   */
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Validate file size (4MB max)
      if (file.size > 4 * 1024 * 1024) {
        setError("Image must be under 4MB");
        return;
      }

      setError(null);
      setResults(null);
      setIsScanning(true);

      try {
        // Create preview
        const base64 = await fileToBase64(file);
        setPreviewUrl(base64);

        // Send to API
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

  /**
   * Trigger the file input (camera or gallery).
   */
  const handleCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Reset state for a new scan.
   */
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
        style={{ display: "none" }}
        aria-label="Upload plant photo"
        data-testid="scout-file-input"
      />

      {/* Image preview */}
      {previewUrl && (
        <div
          className="mb-4 overflow-hidden rounded-lg border border-gray-200"
          style={{
            marginBottom: "1rem",
            overflow: "hidden",
            borderRadius: "0.5rem",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Plant photo preview"
            className="h-48 w-full object-cover"
            style={{
              width: "100%",
              height: "12rem",
              objectFit: "cover",
            }}
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
          className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          style={{
            width: "100%",
            borderRadius: "0.5rem",
            backgroundColor: isScanning ? "#9ca3af" : "#16a34a",
            padding: "0.75rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#ffffff",
            border: "none",
            cursor: isScanning ? "wait" : "pointer",
            opacity: isScanning ? 0.5 : 1,
          }}
          data-testid="scout-capture-btn"
        >
          {isScanning ? "Scanning..." : "Take Photo or Upload"}
        </button>
      )}

      {/* Scanning spinner */}
      {isScanning && (
        <p
          className="mt-3 text-center text-sm text-gray-500"
          style={{
            marginTop: "0.75rem",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "#6b7280",
          }}
          data-testid="scout-scanning"
        >
          Analyzing plant image with AI...
        </p>
      )}

      {/* Error message */}
      {error && (
        <div
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3"
          style={{
            marginTop: "0.75rem",
            borderRadius: "0.375rem",
            border: "1px solid #fecaca",
            backgroundColor: "#fef2f2",
            padding: "0.75rem 1rem",
          }}
          data-testid="scout-error"
        >
          <p
            className="text-sm text-red-700"
            style={{ fontSize: "0.875rem", color: "#b91c1c", margin: 0 }}
          >
            {error}
          </p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div
          className="mt-4"
          style={{ marginTop: "1rem" }}
          data-testid="scout-results"
        >
          {results.matches.length === 0 ? (
            <div
              className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3"
              style={{
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                padding: "0.75rem 1rem",
              }}
            >
              <p
                className="text-sm text-gray-600"
                style={{ fontSize: "0.875rem", color: "#4b5563", margin: 0 }}
              >
                No allergen-producing plants identified in this photo.
                Try taking a closer photo of the plant.
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div
                className="mb-3"
                style={{ marginBottom: "0.75rem" }}
              >
                <p
                  className="text-sm font-medium text-gray-700"
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#374151",
                    margin: "0 0 0.25rem 0",
                  }}
                >
                  {results.matches.length} plant
                  {results.matches.length === 1 ? "" : "s"} identified
                </p>
                {results.active_count > 0 && (
                  <p
                    className="text-xs text-green-700"
                    style={{
                      fontSize: "0.75rem",
                      color: "#15803d",
                      margin: 0,
                    }}
                  >
                    {results.active_count} active — {results.proximity_multiplier}x
                    proximity multiplier applied
                  </p>
                )}
              </div>

              {/* Match cards */}
              <div
                className="space-y-2"
                style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
              >
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
            className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            style={{
              marginTop: "1rem",
              width: "100%",
              borderRadius: "0.5rem",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#374151",
              cursor: "pointer",
            }}
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
      style={{
        borderRadius: "0.375rem",
        border: `1px solid ${isActive ? "#bbf7d0" : "#fde68a"}`,
        backgroundColor: isActive ? "#f0fdf4" : "#fffbeb",
        padding: "0.75rem 1rem",
      }}
      data-testid={`scout-match-${match.allergen_id}`}
    >
      <div
        className="flex items-center justify-between"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            className="text-sm font-semibold text-gray-900"
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#111827",
              margin: 0,
            }}
          >
            {match.common_name}
          </p>
          <p
            className="text-xs text-gray-500"
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              margin: "0.125rem 0 0 0",
            }}
          >
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
          style={{
            borderRadius: "9999px",
            padding: "0.25rem 0.5rem",
            fontSize: "0.75rem",
            fontWeight: 500,
            backgroundColor: isActive ? "#dcfce7" : "#fef3c7",
            color: isActive ? "#15803d" : "#b45309",
          }}
          data-testid={`scout-badge-${match.allergen_id}`}
        >
          {isActive ? "Active" : "Dormant"}
        </span>
      </div>
    </div>
  );
}
