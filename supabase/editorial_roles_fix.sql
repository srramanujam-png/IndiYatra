-- ============================================================
-- editorial_roles_fix.sql
-- Fixes get_editorial_role() and get_editorial_staff() to match
-- roles by role_name (case-insensitive) instead of role_id text.
-- This handles both the ROLE_XX format (pre-existing roles like
-- ROLE_02 = Editor) AND the plain-text format ('editor', 'supervisor')
-- added by editorial_roles.sql.
--
-- Run this in the Supabase SQL Editor to fix the Editor tab bug.
-- Safe to re-run (CREATE OR REPLACE).
-- ============================================================

-- Helper: normalise a role_name to our internal role string
-- Returns 'supervisor' | 'verifier' | 'editor' | NULL
CREATE OR REPLACE FUNCTION get_editorial_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      LEFT JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND (
          urm.role_id = 'supervisor'
          OR LOWER(r.role_name) = 'supervisor'
        )
    ) THEN 'supervisor'

    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      LEFT JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND (
          urm.role_id = 'verifier'
          OR LOWER(r.role_name) = 'verifier'
        )
    ) THEN 'verifier'

    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      LEFT JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND (
          urm.role_id = 'editor'
          OR LOWER(r.role_name) = 'editor'
        )
    ) THEN 'editor'

    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION get_editorial_role() TO authenticated;


-- Also fix get_editorial_staff() so the assignment dropdown
-- picks up users whose role_id is ROLE_XX with a matching role_name.
DROP FUNCTION IF EXISTS get_editorial_staff();
CREATE OR REPLACE FUNCTION get_editorial_staff()
RETURNS TABLE (
  profile_id   uuid,
  display_name text,
  role_id      text,
  role_label   text   -- normalised: 'editor' | 'verifier' | 'supervisor'
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS profile_id,
    COALESCE(p.display_name, split_part(p.id::text, '-', 1)) AS display_name,
    urm.role_id,
    CASE
      WHEN urm.role_id = 'supervisor' OR LOWER(r.role_name) = 'supervisor' THEN 'supervisor'
      WHEN urm.role_id = 'verifier'   OR LOWER(r.role_name) = 'verifier'   THEN 'verifier'
      WHEN urm.role_id = 'editor'     OR LOWER(r.role_name) = 'editor'     THEN 'editor'
    END AS role_label
  FROM user_roles_mapping urm
  JOIN profiles p ON p.id = urm.profile_id
  LEFT JOIN roles r ON r.role_id = urm.role_id
  WHERE
    urm.role_id IN ('editor', 'verifier', 'supervisor')
    OR LOWER(r.role_name) IN ('editor', 'verifier', 'supervisor')
  ORDER BY role_label, p.display_name;
$$;

GRANT EXECUTE ON FUNCTION get_editorial_staff() TO authenticated;


-- Also fix is_supervisor_or_admin() used in editorial_workflow RLS
-- so it recognises both 'supervisor' text AND ROLE_XX with name 'Supervisor'
CREATE OR REPLACE FUNCTION is_supervisor_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles_mapping urm
    LEFT JOIN roles r ON r.role_id = urm.role_id
    WHERE urm.profile_id = auth.uid()
      AND (
        urm.role_id IN ('supervisor', 'admin', 'ROLE_01')
        OR LOWER(r.role_name) IN ('supervisor', 'admin')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION is_supervisor_or_admin() TO authenticated;


-- Fix is_editorial_staff() similarly
CREATE OR REPLACE FUNCTION is_editorial_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles_mapping urm
    LEFT JOIN roles r ON r.role_id = urm.role_id
    WHERE urm.profile_id = auth.uid()
      AND (
        urm.role_id IN ('editor', 'verifier', 'supervisor', 'admin')
        OR LOWER(r.role_name) IN ('editor', 'verifier', 'supervisor', 'admin')
        OR urm.role_id = 'ROLE_01'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION is_editorial_staff() TO authenticated;
