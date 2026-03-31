/**
 * Processing Screen Messages
 *
 * Exactly 8 sequential messages displayed over 4 seconds during the
 * onboarding processing screen. Each message appears for 500ms.
 */

export const PROCESSING_MESSAGES = [
  "Analyzing your location data...",
  "Loading regional allergen profiles...",
  "Cross-referencing seasonal patterns...",
  "Calculating environmental exposure risks...",
  "Running pairwise tournament simulations...",
  "Applying Elo scoring algorithms...",
  "Ranking your predicted triggers...",
  "Building your personalized leaderboard...",
] as const;

/** Total duration of the processing screen in milliseconds */
export const PROCESSING_DURATION_MS = 4000;

/** Duration each message is displayed in milliseconds */
export const MESSAGE_INTERVAL_MS = PROCESSING_DURATION_MS / PROCESSING_MESSAGES.length;
