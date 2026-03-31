/**
 * Google Cloud Vision AI Client
 *
 * Sends images to the Google Cloud Vision API for label detection.
 * Returns an array of label annotations with descriptions and confidence scores.
 *
 * Server-side only — GOOGLE_APPLICATION_CREDENTIALS must never be exposed to the client.
 *
 * Reference: https://cloud.google.com/vision/docs/labels
 */

import { fetchWithTimeout } from "./fetch-with-timeout";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** A single label annotation returned by the Vision API */
export interface VisionLabel {
  /** Human-readable label description (e.g., "oak tree") */
  description: string;
  /** Confidence score from 0.0 to 1.0 */
  score: number;
}

/** Result of a Vision AI label detection call */
export interface VisionResult {
  /** Whether the API call succeeded */
  success: boolean;
  /** Array of detected labels (empty on failure) */
  labels: VisionLabel[];
  /** Error message if the call failed */
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Vision API endpoint for annotating images */
const VISION_API_URL =
  "https://vision.googleapis.com/v1/images:annotate";

/** Maximum number of labels to request from the API */
export const MAX_LABELS = 20;

/** Timeout for Vision API calls (10s — image analysis is slower) */
const VISION_TIMEOUT_MS = 10_000;

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

/** Returned when API is unreachable or key is missing */
export const VISION_DEFAULTS: VisionResult = {
  success: false,
  labels: [],
  error: "Vision API unavailable",
};

/* ------------------------------------------------------------------ */
/* API Client                                                          */
/* ------------------------------------------------------------------ */

/**
 * Detect labels in a base64-encoded image using Google Cloud Vision AI.
 *
 * Sends the image to the Vision API's LABEL_DETECTION feature and
 * returns up to MAX_LABELS label annotations with confidence scores.
 *
 * @param imageBase64 — base64-encoded image data (without data URI prefix)
 * @returns VisionResult with detected labels, or defaults if API fails
 */
export async function detectLabels(
  imageBase64: string,
): Promise<VisionResult> {
  if (!imageBase64 || imageBase64.length === 0) {
    return { ...VISION_DEFAULTS, error: "No image data provided" };
  }

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    return { ...VISION_DEFAULTS, error: "GOOGLE_CLOUD_VISION_API_KEY not configured" };
  }

  try {
    const url = `${VISION_API_URL}?key=${apiKey}`;

    const requestBody = {
      requests: [
        {
          image: {
            content: imageBase64,
          },
          features: [
            {
              type: "LABEL_DETECTION",
              maxResults: MAX_LABELS,
            },
          ],
        },
      ],
    };

    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
      VISION_TIMEOUT_MS,
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ...VISION_DEFAULTS,
        error: `Vision API error: ${response.status} ${errorText.slice(0, 200)}`,
      };
    }

    const data = await response.json();

    const annotations =
      data?.responses?.[0]?.labelAnnotations ?? [];

    const labels: VisionLabel[] = annotations.map(
      (a: { description?: string; score?: number }) => ({
        description: (a.description ?? "").toLowerCase(),
        score: a.score ?? 0,
      }),
    );

    return {
      success: true,
      labels,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown Vision API error";
    return { ...VISION_DEFAULTS, error: message };
  }
}
