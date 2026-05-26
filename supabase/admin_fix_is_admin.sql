-- ============================================================
-- admin_fix_is_admin.sql
-- Fixes is_admin() to check ONLY for ROLE_01 (Admin role).
--
-- Problem
-- -------
-- The original is_admin() used `role_id != 'ROLE_04'` as its
-- condition. This was safe when only ROLE_01 (Admin) and ROLE_04
-- (Learner) existed. After adding editorial roles ROLE_02/ROLE_05/
-- ROLE_06 the condition incorrectly returns TRUE for editors,
-- verifiers, and supervisors — causing the Admin nav tab to appear
-- for all editorial staff.
--
-- Fix
-- ---
-- Check specifically for ROLE_01, or for any role whose role_name
-- is 'Admin' (defensive join so future role_id changes don't break it).
--
-- Run in Supabase SQL Editor.  Safe to re-run (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS bool
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles_mapping urm
    JOIN roles r ON r.role_id = urm.role_id
    WHERE urm.profile_id = auth.uid()
      AND (urm.role_id = 'ROLE_01' OR LOWER(r.role_name) = 'admin')
  );
$$;

-- No GRANT needed — function already exists and is SECURITY DEFINER;
-- the REPLACE preserves existing grants.


-- ── Verify ───────────────────────────────────────────────────────────────────
-- After running, confirm the logic is correct:
--
--   SELECT role_id, role_name FROM roles ORDER BY role_id;
--
-- Only ROLE_01 (Admin) should cause is_admin() to return true.
-- ROLE_02 (Editor), ROLE_05 (Supervisor), ROLE_06 (Verifier),
-- and ROLE_04 (Learner) should all return false.
-- ============================================================
