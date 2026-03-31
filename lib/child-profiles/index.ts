/**
 * Child Profiles
 *
 * Server-side business logic for managing child profiles.
 * Gated to madness_family subscription tier.
 *
 * Usage:
 *   import { createChild, listChildren, MAX_CHILDREN } from "@/lib/child-profiles";
 */

export {
  getChildCount,
  listChildren,
  getChild,
  createChild,
  updateChild,
  deleteChild,
} from "./service";

export { MAX_CHILDREN } from "./types";

export type {
  CreateChildInput,
  UpdateChildInput,
  ChildProfileSummary,
} from "./types";
