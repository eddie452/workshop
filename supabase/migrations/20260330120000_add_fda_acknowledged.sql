-- Add fda_acknowledged column to user_profiles
-- Tracks whether the user has acknowledged the FDA disclaimer.
-- Default false — first-time users must acknowledge before viewing leaderboard.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS fda_acknowledged BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quick lookup during leaderboard gating
CREATE INDEX IF NOT EXISTS idx_user_profiles_fda_acknowledged
  ON user_profiles (id)
  WHERE fda_acknowledged = FALSE;
