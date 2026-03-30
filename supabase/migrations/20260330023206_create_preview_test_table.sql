-- Preview environment verification table
-- This table exists solely to confirm Supabase preview branches
-- are created and migrated correctly on PR environments.
--
-- HOW TO VERIFY:
--   1. Open the preview environment URL from the PR
--   2. Navigate to /api/health (or a test endpoint)
--   3. In Supabase Dashboard, switch to the preview branch
--   4. Confirm this table exists with the seeded row
--   5. Run: SELECT * FROM preview_test;
--      Expected: one row with verified = false

CREATE TABLE IF NOT EXISTS preview_test (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  branch_name TEXT DEFAULT 'unknown',
  message     TEXT NOT NULL DEFAULT 'Preview branch migration ran successfully',
  verified    BOOLEAN DEFAULT FALSE
);

-- Seed a verification row
INSERT INTO preview_test (message)
VALUES ('If you can see this row, Supabase preview branching is working');

-- Enable RLS (good practice even for test tables)
ALTER TABLE preview_test ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for verification)
CREATE POLICY "preview_test_read" ON preview_test
  FOR SELECT USING (true);
