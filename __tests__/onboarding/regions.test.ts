/**
 * State → Region Mapping Tests
 */

import { describe, it, expect } from "vitest";
import { getRegionFromState } from "@/lib/onboarding/regions";

describe("getRegionFromState", () => {
  it("maps Texas to South Central", () => {
    expect(getRegionFromState("TX")).toBe("South Central");
  });

  it("maps New York to Northeast", () => {
    expect(getRegionFromState("NY")).toBe("Northeast");
  });

  it("maps California to Southwest", () => {
    expect(getRegionFromState("CA")).toBe("Southwest");
  });

  it("maps Washington to Northwest", () => {
    expect(getRegionFromState("WA")).toBe("Northwest");
  });

  it("maps Illinois to Midwest", () => {
    expect(getRegionFromState("IL")).toBe("Midwest");
  });

  it("maps Georgia to Southeast", () => {
    expect(getRegionFromState("GA")).toBe("Southeast");
  });

  it("handles lowercase state abbreviations", () => {
    expect(getRegionFromState("tx")).toBe("South Central");
  });

  it("handles whitespace in state abbreviations", () => {
    expect(getRegionFromState(" NY ")).toBe("Northeast");
  });

  it("returns null for null input", () => {
    expect(getRegionFromState(null)).toBeNull();
  });

  it("returns null for unrecognized state", () => {
    expect(getRegionFromState("XX")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getRegionFromState("")).toBeNull();
  });

  it("maps DC to Northeast", () => {
    expect(getRegionFromState("DC")).toBe("Northeast");
  });

  it("maps Alaska to Northwest", () => {
    expect(getRegionFromState("AK")).toBe("Northwest");
  });

  it("maps Hawaii to Southwest", () => {
    expect(getRegionFromState("HI")).toBe("Southwest");
  });
});
