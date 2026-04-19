/**
 * Saved Places
 *
 * Server-side business logic for managing user_locations rows where
 * `is_home = false`. Home location is NOT mutable through this module.
 *
 * Usage:
 *   import { listPlaces, createPlace, updatePlace, deletePlace } from "@/lib/saved-places";
 */

export {
  listPlaces,
  createPlace,
  updatePlace,
  deletePlace,
  getPlaceForOwner,
} from "./service";

export type {
  CreatePlaceInput,
  UpdatePlaceInput,
  SavedPlaceSummary,
} from "./types";
