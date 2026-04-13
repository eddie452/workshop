-- Add FK constraint from user_allergen_elo.location_id to user_locations
--
-- Ticket: #52 — fix(supabase): add FK constraint from user_allergen_elo.location_id to user_locations
--
-- The location_id column was created without a foreign key constraint.
-- Other tables (checkin_logs, environmental_forecasts) already reference
-- user_locations(id) ON DELETE SET NULL. This migration aligns user_allergen_elo
-- with the same pattern.
--
-- Uses NOT VALID to skip checking existing rows (safe for production with
-- existing data), then validates separately so the constraint is fully enforced
-- for future writes.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'fk_user_allergen_elo_location'
  ) THEN
    ALTER TABLE user_allergen_elo
      ADD CONSTRAINT fk_user_allergen_elo_location
      FOREIGN KEY (location_id) REFERENCES user_locations(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

-- Validate separately — locks are lighter this way on large tables
ALTER TABLE user_allergen_elo
  VALIDATE CONSTRAINT fk_user_allergen_elo_location;
