/**
 * Structured Logger
 *
 * Wraps console methods with structured context for production observability.
 * In development, logs remain human-readable. In production, logs are
 * JSON-structured for integration with log aggregators and Sentry.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.error("Elo seeding failed", { userId, error: err.message });
 *   logger.warn("Location save failed", { userId, error: err.message });
 */

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

interface LogContext {
  [key: string]: unknown;
}

function formatMessage(
  level: "error" | "warn" | "info",
  message: string,
  context?: LogContext,
): [string, ...unknown[]] {
  if (isProduction()) {
    return [JSON.stringify({ level, message, ...context, timestamp: new Date().toISOString() })];
  }

  // Development: human-readable format
  if (context) {
    return [`[${level.toUpperCase()}] ${message}`, context];
  }
  return [`[${level.toUpperCase()}] ${message}`];
}

export const logger = {
  error(message: string, context?: LogContext): void {
    const args = formatMessage("error", message, context);
    console.error(...args);
  },

  warn(message: string, context?: LogContext): void {
    const args = formatMessage("warn", message, context);
    console.warn(...args);
  },

  info(message: string, context?: LogContext): void {
    const args = formatMessage("info", message, context);
    console.info(...args);
  },
};
