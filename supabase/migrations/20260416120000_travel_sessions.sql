-- Travel Sessions — transient per-user travel mode
--
-- Ticket: #223 — feat(travel): Travel Mode API + schema
-- Parent Epic: #27 — Travel Mode + Saved Places
--
-- Represents an active "travel mode" session. When a user activates travel
-- mode, the tournament engine re-seeds Elo scoped to the travel location_id
-- without touching home Elo. Only one active session per user is allowed,
-- enforced by a partial unique index where ended_at IS NULL.
--
-- HIPAA note: location PII (lat/lng/address) lives in user_locations — we
-- intentionally store only the foreign key here to avoid duplicating PHI.
--
-- Idempotent: safe to run against an environment that already has the table.

CREATE TABLE IF NOT EXISTS travel_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES user_locations(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ
);

ALTER TABLE travel_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: four-policy pattern mirroring user_locations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'travel_sessions_select_own' AND tablename = 'travel_sessions'
  ) THEN
    CREATE POLICY travel_sessions_select_own ON travel_sessions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'travel_sessions_insert_own' AND tablename = 'travel_sessions'
  ) THEN
    CREATE POLICY travel_sessions_insert_own ON travel_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'travel_sessions_update_own' AND tablename = 'travel_sessions'
  ) THEN
    CREATE POLICY travel_sessions_update_own ON travel_sessions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'travel_sessions_delete_own' AND tablename = 'travel_sessions'
  ) THEN
    CREATE POLICY travel_sessions_delete_own ON travel_sessions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Partial unique index: only one active session per user at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_travel_sessions_one_active_per_user
  ON travel_sessions(user_id)
  WHERE ended_at IS NULL;

-- Lookup index for the common GET (active session) query.
CREATE INDEX IF NOT EXISTS idx_travel_sessions_user_id
  ON travel_sessions(user_id);
