"use client";

/**
 * AddPlaceForm
 *
 * Form for creating a new saved place.
 * Collects nickname and optional address/zip/state via the shared
 * PlaceFormFields component.
 */

import { useState } from "react";
import { PlaceFormFields } from "./place-form-fields";
import type { CreatePlaceInput } from "@/lib/saved-places/types";

export interface AddPlaceFormProps {
  onSubmit: (data: CreatePlaceInput) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

export function AddPlaceForm({
  onSubmit,
  onCancel,
  isLoading,
  error,
}: AddPlaceFormProps) {
  const [nickname, setNickname] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [state, setState] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      nickname: nickname.trim(),
      address: address.trim() || null,
      zip: zip.trim() || null,
      state: state.trim() || null,
    });
  };

  return (
    <form
      data-testid="add-place-form"
      onSubmit={handleSubmit}
      className="rounded-card border border-brand-primary-light bg-white p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold text-brand-primary-dark">
        Add Saved Place
      </h3>

      <PlaceFormFields
        idPrefix="add"
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
          className="rounded-button border border-brand-border bg-white px-4 py-2 text-xs font-medium text-brand-text hover:bg-brand-surface-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="save-place-btn"
          disabled={isLoading || !nickname.trim()}
          className="rounded-button bg-brand-premium px-4 py-2 text-xs font-semibold text-white hover:bg-brand-premium/80 disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
