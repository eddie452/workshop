/**
 * Report Download Button
 *
 * Client component that triggers PDF report generation and download.
 * Calls the /api/report/pdf endpoint and triggers a browser download.
 */

"use client";

import { useState } from "react";

export interface DownloadReportButtonProps {
  /** Additional CSS class names */
  className?: string;
}

export function DownloadReportButton({
  className = "",
}: DownloadReportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/report/pdf");

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body?.error ?? `Failed to generate report (${response.status})`;
        setError(message);
        return;
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "allergy-madness-report.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isLoading}
        data-testid="download-report-button"
        className="inline-flex items-center gap-2 rounded-button bg-dusty-denim px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-dusty-denim/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {/* Download icon (inline SVG to avoid dependency) */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path
            d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v8m0 0l3-3m-3 3L5 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {isLoading ? "Generating..." : "Share Report (PDF)"}
      </button>

      {error && (
        <p
          role="alert"
          data-testid="download-report-error"
          className="mt-2 text-sm text-alert-red"
        >
          {error}
        </p>
      )}
    </div>
  );
}
