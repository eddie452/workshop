-- Referral system tables for 3-friend unlock mechanism
--
-- Ticket: #30 — Implement referral link generation and 3-friend tracking
--
-- Two additions:
-- 1. referral_code + referral_count + features_unlocked columns on user_profiles
-- 2. referrals table tracking who-referred-whom
--
-- IMPORTANT: All statements use IF NOT EXISTS guards so this migration
-- is safe to run against a database that already has these objects.

-- =====================================================================
-- 1. Add referral columns to user_profiles
-- =====================================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS features_unlocked BOOLEAN NOT NULL DEFAULT FALSE;

-- =====================================================================
-- 2. referrals table (who referred whom)
-- =====================================================================

CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referred_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referrals_unique_pair UNIQUE (referrer_id, referred_id),
  CONSTRAINT referrals_no_self_referral CHECK (referrer_id != referred_id)
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Referrer can see their own referrals
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'referrals_select_referrer' AND tablename = 'referrals'
  ) THEN
    CREATE POLICY referrals_select_referrer ON referrals
      FOR SELECT USING (auth.uid() = referrer_id);
  END IF;
END $$;

-- Referred user can see their own referral record
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'referrals_select_referred' AND tablename = 'referrals'
  ) THEN
    CREATE POLICY referrals_select_referred ON referrals
      FOR SELECT USING (auth.uid() = referred_id);
  END IF;
END $$;

-- Only server (service role) inserts referrals — no direct client insert
-- This is enforced by NOT having an INSERT policy for authenticated users.

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);
