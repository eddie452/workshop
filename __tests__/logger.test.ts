/**
 * Structured Logger Tests
 *
 * Tests the shared logger utility for both development and production modes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("logs error with context in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { logger } = await import("@/lib/logger");

    logger.error("Something failed", { userId: "u1" });

    expect(console.error).toHaveBeenCalledWith(
      "[ERROR] Something failed",
      { userId: "u1" },
    );
  });

  it("logs error without context in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { logger } = await import("@/lib/logger");

    logger.error("Something failed");

    expect(console.error).toHaveBeenCalledWith("[ERROR] Something failed");
  });

  it("logs warn in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { logger } = await import("@/lib/logger");

    logger.warn("Watch out", { detail: "x" });

    expect(console.warn).toHaveBeenCalledWith(
      "[WARN] Watch out",
      { detail: "x" },
    );
  });

  it("logs info in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { logger } = await import("@/lib/logger");

    logger.info("Status update");

    expect(console.info).toHaveBeenCalledWith("[INFO] Status update");
  });

  it("logs structured JSON in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { logger } = await import("@/lib/logger");

    logger.error("DB connection lost", { service: "supabase" });

    expect(console.error).toHaveBeenCalledTimes(1);
    const logOutput = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const parsed = JSON.parse(logOutput);
    expect(parsed.level).toBe("error");
    expect(parsed.message).toBe("DB connection lost");
    expect(parsed.service).toBe("supabase");
    expect(parsed.timestamp).toBeDefined();
  });

  it("logs structured JSON warn in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { logger } = await import("@/lib/logger");

    logger.warn("Slow query", { duration: 5000 });

    expect(console.warn).toHaveBeenCalledTimes(1);
    const logOutput = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const parsed = JSON.parse(logOutput);
    expect(parsed.level).toBe("warn");
    expect(parsed.message).toBe("Slow query");
    expect(parsed.duration).toBe(5000);
  });
});
