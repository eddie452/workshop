-- Fix CCRS constraint: allow 0-100 scale (was 0-3)
-- The onboarding code and engine use 0-100 for graduated multipliers
-- Ticket: #99

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_ccrs_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_ccrs_check CHECK (ccrs BETWEEN 0 AND 100);

ALTER TABLE user_locations DROP CONSTRAINT IF EXISTS user_locations_ccrs_check;
ALTER TABLE user_locations ADD CONSTRAINT user_locations_ccrs_check CHECK (ccrs BETWEEN 0 AND 100);
