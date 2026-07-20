-- ============================================================
-- editorial_roles_uniform.sql
-- Enforces uniform ROLE_XX FK syntax throughout the system.
--
-- Background
-- ----------
-- editorial_roles.sql previously inserted plain-text role_ids
-- ('editor', 'verifier', 'supervisor') into the roles table.
-- Rama's supervisor mapping was also stored as plain text 'supervisor'
-- in user_roles_mapping.
--
-- This migration:
--  1. Inserts proper ROLE_XX rows for all editorial roles
--        ROLE_02 = Editor     (pre-existing — kept as-is)
--        ROLE_05 = Supervisor (new)
--        ROLE_06 = Verifier   (new)
--  2. Migrates any user_roles_mapping rows that use plain-text
--     role_ids to the canonical ROLE_XX equivalents.
--  3. Deletes the plain-text rows from the roles table.
--  4. Replaces all four RPCs so they identify roles ONLY by
--     joining the roles table on role_name — no plain-text
--     role_id checks remain.
--
-- Run ONCE in the Supabase SQL Editor.
-- Safe to re-run (idempotent).
-- ============================================================


-- ── 1. Insert canonical ROLE_XX rows ─────────────────────────────────────────
-- ROLE_01 = Admin    (admin_schema.sql)
-- ROLE_02 = Editor   (pre-existing)
-- ROLE_04 = Learner  (default, set by handle_new_user trigger)
-- ROLE_05 = Supervisor  ← new
-- ROLE_06 = Verifier    ← new

INSERT INTO roles (role_id, role_name) VALUES
  ('ROLE_02', 'Editor')
ON CONFLICT (role_id) DO UPDATE SET role_name = 'Editor';

INSERT INTO roles (role_id, role_name) VALUES
  ('ROLE_05', 'Supervisor')
ON CONFLICT (role_id) DO UPDATE SET role_name = 'Supervisor';

INSERT INTO roles (role_id, role_name) VALUES
  ('ROLE_06', 'Verifier')
ON CONFLICT (role_id) DO UPDATE SET role_name = 'Verifier';


-- ── 2. Migrate plain-text user_roles_mapping entries ─────────────────────────
-- If a user has role_id = 'supervisor'   → replace with ROLE_05
-- If a user has role_id = 'verifier'     → replace with ROLE_06
-- If a user has role_id = 'editor'       → replace with ROLE_02
--
-- We INSERT the canonical row first (ON CONFLICT DO NOTHING so we
-- don't create a duplicate if ROLE_XX already exists for that user),
-- then DELETE the old plain-text row.

INSERT INTO user_roles_mapping (profile_id, role_id)
  SELECT profile_id, 'ROLE_05'
  FROM user_roles_mapping
  WHERE role_id = 'supervisor'
ON CONFLICT DO NOTHING;

DELETE FROM user_roles_mapping WHERE role_id = 'supervisor';

INSERT INTO user_roles_mapping (profile_id, role_id)
  SELECT profile_id, 'ROLE_06'
  FROM user_roles_mapping
  WHERE role_id = 'verifier'
ON CONFLICT DO NOTHING;

DELETE FROM user_roles_mapping WHERE role_id = 'verifier';

INSERT INTO user_roles_mapping (profile_id, role_id)
  SELECT profile_id, 'ROLE_02'
  FROM user_roles_mapping
  WHERE role_id = 'editor'
ON CONFLICT DO NOTHING;

DELETE FROM user_roles_mapping WHERE role_id = 'editor';


-- ── 3. Remove plain-text role rows from roles table ──────────────────────────
-- These were inserted by editorial_roles.sql and are no longer needed.

DELETE FROM roles WHERE role_id IN ('editor', 'verifier', 'supervisor');


-- ── 4. Update RPCs to use role_name join only (no plain-text role_id checks) ─

-- 4a. get_editorial_role()
--     Returns 'supervisor' | 'verifier' | 'editor' | NULL for the current user.
--     Priority: supervisor > verifier > editor.
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
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'supervisor'
    ) THEN 'supervisor'

    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'verifier'
    ) THEN 'verifier'

    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'editor'
    ) THEN 'editor'

    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION get_editorial_role() TO authenticated;


-- 4b. get_editorial_staff()
--     Returns all users with editor / verifier / supervisor roles.
--     Used to populate the "Assign to" dropdown in the supervisor dashboard.
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
    LOWER(r.role_name) AS role_label
  FROM user_roles_mapping urm
  JOIN profiles p ON p.id = urm.profile_id
  JOIN roles r ON r.role_id = urm.role_id
  WHERE LOWER(r.role_name) IN ('editor', 'verifier', 'supervisor')
  ORDER BY role_label, p.display_name;
$$;

GRANT EXECUTE ON FUNCTION get_editorial_staff() TO authenticated;


-- 4c. is_supervisor_or_admin()
--     Used in editorial_workflow RLS policies.
CREATE OR REPLACE FUNCTION is_supervisor_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles_mapping urm
    JOIN roles r ON r.role_id = urm.role_id
    WHERE urm.profile_id = auth.uid()
      AND LOWER(r.role_name) IN ('supervisor', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION is_supervisor_or_admin() TO authenticated;


-- 4d. is_editorial_staff()
--     Used in editorial_publish.sql RLS policies.
CREATE OR REPLACE FUNCTION is_editorial_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles_mapping urm
    JOIN roles r ON r.role_id = urm.role_id
    WHERE urm.profile_id = auth.uid()
      AND LOWER(r.role_name) IN ('editor', 'verifier', 'supervisor', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION is_editorial_staff() TO authenticated;


-- ── 5. Verify ────────────────────────────────────────────────────────────────
-- Run this SELECT after executing the migration to confirm the state:
--
-- SELECT role_id, role_name FROM roles ORDER BY role_id;
-- Expected:
--   ROLE_01  Admin
--   ROLE_02  Editor
--   ROLE_04  Learner
--   ROLE_05  Supervisor
--   ROLE_06  Verifier
--   (no plain-text rows)
--
-- SELECT profile_id, role_id FROM user_roles_mapping ORDER BY role_id;
-- Expected: all entries use ROLE_XX format only.
-- ============================================================
