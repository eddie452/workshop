-- Atomic record_referral RPC function
--
-- Ticket: #69 — Wrap recordReferral in a transaction for atomicity
--
-- Replaces the 3-step client-side sequence (insert referral, increment count,
-- conditionally unlock) with a single Postgres function that runs in one
-- transaction. If any step fails, the entire operation rolls back.

CREATE OR REPLACE FUNCTION record_referral(
  p_referral_code TEXT,
  p_referred_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer RECORD;
  v_existing RECORD;
  v_new_count INTEGER;
  v_should_unlock BOOLEAN;
  v_unlock_threshold INTEGER := 3;
BEGIN
  -- 1. Find referrer by code
  SELECT id, referral_count, features_unlocked
    INTO v_referrer
    FROM user_profiles
   WHERE referral_code = p_referral_code;

  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- 2. Prevent self-referral
  IF v_referrer.id = p_referred_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- 3. Check for duplicate
  SELECT id INTO v_existing
    FROM referrals
   WHERE referrer_id = v_referrer.id
     AND referred_id = p_referred_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already recorded');
  END IF;

  -- 4. Insert referral record
  INSERT INTO referrals (referrer_id, referred_id)
  VALUES (v_referrer.id, p_referred_id);

  -- 5. Increment count and conditionally unlock
  v_new_count := COALESCE(v_referrer.referral_count, 0) + 1;
  v_should_unlock := v_new_count >= v_unlock_threshold;

  IF v_should_unlock AND NOT COALESCE(v_referrer.features_unlocked, false) THEN
    UPDATE user_profiles
       SET referral_count = v_new_count,
           features_unlocked = true
     WHERE id = v_referrer.id;
  ELSE
    UPDATE user_profiles
       SET referral_count = v_new_count
     WHERE id = v_referrer.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'features_unlocked', v_should_unlock OR COALESCE(v_referrer.features_unlocked, false)
  );
END;
$$;
