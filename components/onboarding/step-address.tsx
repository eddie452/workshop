"use client";

/**
 * Step 1: Address Entry
 *
 * User enters their home address. The address is geocoded server-side
 * to derive lat/lng, state, region, and auto-populate property data.
 */

import { useState } from "react";
import type { StepProps } from "./types";

export function StepAddress({ formData, onUpdate, onNext }: StepProps) {
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = formData.address.trim();
    if (!trimmed) {
      setError("Please enter your home address");
      return;
    }
    if (trimmed.length < 5) {
      setError("Please enter a complete address");
      return;
    }
    setError(null);
    onNext();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-dusty-denim">
            Where do you live?
          </h2>
          <p className="mt-2 text-sm text-dusty-denim">
            Your address helps us identify regional allergens and auto-populate
            your home profile. We use it to predict which allergens are most
            likely to affect you.
          </p>
        </div>

        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-dusty-denim"
          >
            Home address
          </label>
          <input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => {
              onUpdate({ address: e.target.value });
              if (error) setError(null);
            }}
            placeholder="123 Main St, City, State ZIP"
            autoFocus
            autoComplete="street-address"
            className="mt-1 block w-full rounded-button border border-champ-blue px-3 py-2 text-sm shadow-sm focus:border-champ-blue focus:outline-none focus:ring-1 focus:ring-champ-blue"
          />
          {error && (
            <p
              className="mt-1 text-sm text-dusty-denim"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <p className="text-xs text-dusty-denim">
          Your address is geocoded server-side. It is never shared or sold. We
          use it to look up property age, type, and regional pollen data.
        </p>

        <button
          type="submit"
          className="w-full rounded-button bg-dusty-denim px-4 py-2 text-sm font-medium text-white hover:bg-dusty-denim/80 focus:outline-none focus:ring-2 focus:ring-champ-blue focus:ring-offset-2"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
