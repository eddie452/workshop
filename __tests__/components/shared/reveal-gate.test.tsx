/**
 * RevealGate primitive tests (ticket #242).
 *
 * Pins the a11y contract and ephemeral state behavior.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RevealGate } from "@/components/shared/reveal-gate";

describe("RevealGate", () => {
  it("renders a real <button> element with the provided label", () => {
    render(
      <RevealGate label="Show Secret">
        <p>hidden text</p>
      </RevealGate>,
    );
    const btn = screen.getByRole("button", { name: "Show Secret" });
    expect(btn.tagName).toBe("BUTTON");
  });

  it("does not render children by default", () => {
    render(
      <RevealGate label="Show Secret">
        <p data-testid="secret">hidden text</p>
      </RevealGate>,
    );
    expect(screen.queryByTestId("secret")).toBeNull();
  });

  it("renders children after click", () => {
    render(
      <RevealGate label="Show Secret">
        <p data-testid="secret">hidden text</p>
      </RevealGate>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show Secret" }));
    expect(screen.getByTestId("secret")).toBeDefined();
  });

  it("sets aria-expanded=false initially and true after reveal", () => {
    render(
      <RevealGate label="Show Secret" hideLabel="Hide Secret">
        <p>hidden text</p>
      </RevealGate>,
    );
    const btn = screen.getByRole("button", { name: "Show Secret" });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    const hideBtn = screen.getByRole("button", { name: "Hide Secret" });
    expect(hideBtn.getAttribute("aria-expanded")).toBe("true");
  });

  it("wires aria-controls to the panel container", () => {
    render(
      <RevealGate label="Show Secret">
        <p data-testid="secret">hidden text</p>
      </RevealGate>,
    );
    const btn = screen.getByRole("button", { name: "Show Secret" });
    const controlsId = btn.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    expect(document.getElementById(controlsId ?? "")).not.toBeNull();
  });

  it("removes the button entirely after reveal when no hideLabel is provided", () => {
    render(
      <RevealGate label="Show Secret">
        <p>now visible</p>
      </RevealGate>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show Secret" }));
    expect(
      screen.queryByRole("button", { name: "Show Secret" }),
    ).toBeNull();
  });
});
