"use client";

/**
 * PlaceFormFields
 *
 * Shared input fields and error display for saved-place forms.
 * Used by AddPlaceForm (create) and EditPlaceForm (update).
 *
 * Collects:
 *  - nickname (required)
 *  - address, zip, state (optional)
 *
 * Lat/lng are NOT exposed in this form — they are populated through
 * geocoding elsewhere and are not manually edited by users.
 */

import type { ChangeEvent } from "react";

export interface PlaceFormFieldsProps {
  /** Prefix for stable ids and testids. "add" | "edit" matches add/edit forms. */
  idPrefix: "add" | "edit";

  nickname: string;
  onNicknameChange: (value: string) => void;

  address: string;
  onAddressChange: (value: string) => void;

  zip: string;
  onZipChange: (value: string) => void;

  state: string;
  onStateChange: (value: string) => void;

  error: string | null;
}

const INPUT_CLASS =
  "w-full rounded-button border border-brand-border px-3 py-2 text-sm text-brand-primary-dark placeholder-brand-text-faint focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";
const LABEL_CLASS = "mb-1 block text-xs font-medium text-brand-text";

export function PlaceFormFields({
  idPrefix,
  nickname,
  onNicknameChange,
  address,
  onAddressChange,
  zip,
  onZipChange,
  state,
  onStateChange,
  error,
}: PlaceFormFieldsProps) {
  const nicknameId = `${idPrefix}-place-nickname`;
  const addressId = `${idPrefix}-place-address`;
  const zipId = `${idPrefix}-place-zip`;
  const stateId = `${idPrefix}-place-state`;
  const errorTestId = `${idPrefix}-place-error`;

  return (
    <>
      {error && (
        <p
          data-testid={errorTestId}
          className="mb-3 rounded-card bg-brand-premium-light p-2 text-xs text-brand-premium"
        >
          {error}
        </p>
      )}

      <div className="mb-3">
        <label htmlFor={nicknameId} className={LABEL_CLASS}>
          Nickname *
        </label>
        <input
          id={nicknameId}
          data-testid={`${idPrefix}-place-nickname-input`}
          type="text"
          required
          maxLength={100}
          value={nickname}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onNicknameChange(e.target.value)
          }
          placeholder="e.g. Grandma's house"
          className={INPUT_CLASS}
        />
      </div>

      <div className="mb-3">
        <label htmlFor={addressId} className={LABEL_CLASS}>
          Address (optional)
        </label>
        <input
          id={addressId}
          data-testid={`${idPrefix}-place-address-input`}
          type="text"
          maxLength={255}
          value={address}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onAddressChange(e.target.value)
          }
          placeholder="Street address"
          className={INPUT_CLASS}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={zipId} className={LABEL_CLASS}>
            ZIP (optional)
          </label>
          <input
            id={zipId}
            data-testid={`${idPrefix}-place-zip-input`}
            type="text"
            maxLength={10}
            value={zip}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onZipChange(e.target.value)
            }
            placeholder="12345"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor={stateId} className={LABEL_CLASS}>
            State (optional)
          </label>
          <input
            id={stateId}
            data-testid={`${idPrefix}-place-state-input`}
            type="text"
            maxLength={2}
            value={state}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onStateChange(e.target.value.toUpperCase())
            }
            placeholder="CA"
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </>
  );
}
