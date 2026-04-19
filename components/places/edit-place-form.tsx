"use client";

/**
 * EditPlaceForm
 *
 * Inline form for editing an existing saved place.
 * Pre-populates with current values; submits via parent callback.
 * Shares markup with AddPlaceForm via PlaceFormFields.
 */

import { useState } from "react";
import { PlaceFormFields } from "./place-form-fields";
import type { SavedPlaceSummary, UpdatePlaceInput } from "@/lib/saved-places/types";

export interface EditPlaceFormProps {
  place: SavedPlaceSummary;
  onSubmit: (placeId: string, data: UpdatePlaceInput) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

export function EditPlaceForm({
  place,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: EditPlaceFormProps) {
  const [nickname, setNickname] = useState(place.nickname ?? "");
  const [address, setAddress] = useState(place.address ?? "");
  const [zip, setZip] = useState(place.zip ?? "");
  const [state, setState] = useState(place.state ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(place.id, {
      nickname: nickname.trim(),
      address: address.trim() || null,
      zip: zip.trim() || null,
      state: state.trim() || null,
    });
  };

  return (
    <form
      data-testid="edit-place-form"
      onSubmit={handleSubmit}
      className="rounded-card border border-brand-primary-light bg-white p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold text-brand-primary-dark">
        Edit Saved Place
      </h3>

      <PlaceFormFields
        idPrefix="edit"
        nickname={nickname}
        onNicknameChange={setNickname}
        address={address}
        onAddressChange={setAddress}
        zip={zip}
        onZipChange={setZip}
        state={state}
        onStateChange={setState}
        error={error}
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          data-testid="edit-place-cancel-btn"
          className="rounded-button border border-brand-border bg-white px-4 py-2 text-xs font-medium text-brand-text hover:bg-brand-surface-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="edit-place-save-btn"
          disabled={isLoading || !nickname.trim()}
          className="rounded-button bg-brand-premium px-4 py-2 text-xs font-semibold text-white hover:bg-brand-premium/80 disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
