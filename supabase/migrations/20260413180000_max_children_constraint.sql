-- Enforce a maximum of 5 child profiles per parent at the database level.
-- This is a defense-in-depth constraint — the application layer in
-- lib/child-profiles/service.ts is the primary guard.
--
-- Uses a trigger + function rather than a CHECK constraint because
-- CHECK cannot reference other rows in the same table.

CREATE OR REPLACE FUNCTION enforce_max_children()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM child_profiles
    WHERE parent_id = NEW.parent_id
  ) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 child profiles per parent'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger first if it already exists (idempotent)
DROP TRIGGER IF EXISTS trg_max_children ON child_profiles;

CREATE TRIGGER trg_max_children
  BEFORE INSERT ON child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_children();
