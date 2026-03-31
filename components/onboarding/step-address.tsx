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
          <h2 className="text-xl font-bold text-gray-900">
            Where do you live?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your address helps us identify regional allergens and auto-populate
            your home profile. We use it to predict which allergens are most
            likely to affect you.
          </p>
        </div>

        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700"
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
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {error && (
            <p
              className="mt-1 text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Your address is geocoded server-side. It is never shared or sold. We
          use it to look up property age, type, and regional pollen data.
        </p>

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
