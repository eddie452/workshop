-- Travel Sessions — add WITH CHECK clause to update policy
--
-- Ticket: #236 — polish(travel): pre-#224 blockers
-- Parent: #223 — Travel Mode API + schema (migration 20260416120000)
--
-- The original `travel_sessions_update_own` policy used only a `USING`
-- clause (`auth.uid() = user_id`). Without `WITH CHECK`, a malicious
-- UPDATE that passes the USING row-level check could re-assign
-- `user_id` to another user in the SET clause — the post-row would
-- belong to a different user but the UPDATE would succeed because only
-- the PRE-row is gated.
--
-- Defense-in-depth for HIPAA: add `WITH CHECK (auth.uid() = user_id)` so
-- the POST-row must also be self-owned. Postgres cannot ALTER a policy's
-- WITH CHECK in place, so we DROP and recreate with both clauses.
--
-- Idempotent: guarded by a pg_policies check; safe to re-run.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
      WHERE policyname = 'travel_sessions_update_own'
        AND tablename = 'travel_sessions'
  ) THEN
    DROP POLICY travel_sessions_update_own ON travel_sessions;
  END IF;

  CREATE POLICY travel_sessions_update_own ON travel_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END $$;
