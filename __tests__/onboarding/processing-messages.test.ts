/**
 * Processing Messages Tests
 *
 * Validates the processing screen message configuration matches
 * the ticket requirement: exactly 8 messages over 4 seconds.
 */

import { describe, it, expect } from "vitest";
import {
  PROCESSING_MESSAGES,
  PROCESSING_DURATION_MS,
  MESSAGE_INTERVAL_MS,
} from "@/lib/onboarding/processing-messages";

describe("Processing Messages", () => {
  it("has exactly 8 messages", () => {
    expect(PROCESSING_MESSAGES).toHaveLength(8);
  });

  it("total duration is 4 seconds", () => {
    expect(PROCESSING_DURATION_MS).toBe(4000);
  });

  it("each message displays for 500ms", () => {
    expect(MESSAGE_INTERVAL_MS).toBe(500);
  });

  it("all messages are non-empty strings", () => {
    for (const msg of PROCESSING_MESSAGES) {
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("messages x interval = total duration", () => {
    expect(PROCESSING_MESSAGES.length * MESSAGE_INTERVAL_MS).toBe(
      PROCESSING_DURATION_MS,
    );
  });
});
