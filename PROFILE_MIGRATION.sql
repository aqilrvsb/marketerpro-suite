-- Migration: Add WhatsApp Number and Change Password Function
-- Run this in Supabase SQL Editor

-- Add whatsapp_number column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Create change_password function
CREATE OR REPLACE FUNCTION change_password(
  p_user_id UUID,
  p_current_password TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  -- Get the current password hash
  SELECT password_hash INTO v_stored_hash
  FROM profiles
  WHERE id = p_user_id;

  -- Check if user exists
  IF v_stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verify current password (simple comparison since we store uppercase password)
  IF v_stored_hash != UPPER(p_current_password) THEN
    RETURN FALSE;
  END IF;

  -- Update to new password
  UPDATE profiles
  SET password_hash = UPPER(p_new_password),
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;
