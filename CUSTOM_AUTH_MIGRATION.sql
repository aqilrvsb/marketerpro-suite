-- =====================================================
-- CUSTOM AUTH MIGRATION SCRIPT
-- Converts from Supabase Auth to Staff ID-based auth
-- =====================================================

-- Step 1: Drop the trigger that links to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Remove foreign key constraint from profiles (if exists)
-- The profiles.id will now be auto-generated, not linked to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 3: Add new columns to profiles table
ALTER TABLE public.profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS idstaff text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Step 4: Create unique index on idstaff for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS profiles_idstaff_idx ON public.profiles(idstaff);

-- Step 5: Update user_roles foreign key to reference profiles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 6: Update RLS policies for public access (no auth.uid())
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Create new open policies (app-level auth handles security)
CREATE POLICY "Allow all operations on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on user_roles" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

-- Step 7: Create verify_password function (simple comparison for now)
-- In production, use pgcrypto for proper hashing
CREATE OR REPLACE FUNCTION public.verify_password(input_password text, stored_hash text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Simple comparison (passwords stored as-is for simplicity)
  -- For production, use: RETURN stored_hash = crypt(input_password, stored_hash);
  RETURN input_password = stored_hash;
END;
$$;

-- Step 8: Create login function
CREATE OR REPLACE FUNCTION public.login_user(p_idstaff text, p_password text)
RETURNS TABLE(
  user_id uuid,
  username text,
  full_name text,
  idstaff text,
  role text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.username,
    p.full_name,
    p.idstaff,
    ur.role::text,
    p.is_active
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.idstaff = p_idstaff
    AND public.verify_password(p_password, p.password_hash)
    AND p.is_active = true;
END;
$$;

-- Step 9: Create register function
CREATE OR REPLACE FUNCTION public.register_user(
  p_idstaff text,
  p_password text,
  p_full_name text,
  p_role text DEFAULT 'marketer'
)
RETURNS TABLE(
  user_id uuid,
  username text,
  full_name text,
  idstaff text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if idstaff already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE profiles.idstaff = p_idstaff) THEN
    RAISE EXCEPTION 'Staff ID already exists';
  END IF;

  -- Insert new profile
  INSERT INTO public.profiles (username, full_name, password_hash, idstaff, is_active)
  VALUES (p_idstaff, p_full_name, p_password, p_idstaff, true)
  RETURNING id INTO new_user_id;

  -- Insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, p_role::app_role);

  -- Return the new user data
  RETURN QUERY
  SELECT
    new_user_id as user_id,
    p_idstaff as username,
    p_full_name as full_name,
    p_idstaff as idstaff,
    p_role as role;
END;
$$;

-- Step 10: Insert default users (password = Staff ID)
-- Delete existing data first to avoid conflicts
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- Insert default users (password is same as Staff ID)
INSERT INTO public.profiles (id, username, full_name, password_hash, idstaff, is_active)
VALUES
  (gen_random_uuid(), 'AD-001', 'Administrator', 'AD-001', 'AD-001', true),
  (gen_random_uuid(), 'MR-001', 'Marketer One', 'MR-001', 'MR-001', true),
  (gen_random_uuid(), 'BOD', 'Board of Directors', 'BOD', 'BOD', true),
  (gen_random_uuid(), 'LOGHQ', 'Logistic HQ', 'LOGHQ', 'LOGHQ', true),
  (gen_random_uuid(), 'ACCHQ', 'Account HQ', 'ACCHQ', 'ACCHQ', true);

-- Insert roles for default users
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role FROM public.profiles p WHERE p.idstaff = 'AD-001'
UNION ALL
SELECT p.id, 'marketer'::app_role FROM public.profiles p WHERE p.idstaff = 'MR-001'
UNION ALL
SELECT p.id, 'bod'::app_role FROM public.profiles p WHERE p.idstaff = 'BOD'
UNION ALL
SELECT p.id, 'logistic'::app_role FROM public.profiles p WHERE p.idstaff = 'LOGHQ'
UNION ALL
SELECT p.id, 'account'::app_role FROM public.profiles p WHERE p.idstaff = 'ACCHQ';

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Default users created (password = Staff ID):
-- | Staff ID | Password | Role     |
-- |----------|----------|----------|
-- | AD-001   | AD-001   | admin    |
-- | MR-001   | MR-001   | marketer |
-- | BOD      | BOD      | bod      |
-- | LOGHQ    | LOGHQ    | logistic |
-- | ACCHQ    | ACCHQ    | account  |
-- =====================================================
