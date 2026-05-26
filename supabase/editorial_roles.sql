-- ============================================================
-- editorial_roles.sql
-- Adds editor / verifier / supervisor roles to the roles table
-- and creates helper RPCs.
--
-- Run ONCE in the Supabase SQL Editor (before editorial_workflow.sql).
-- Safe to re-run (all statements are idempotent).
-- ============================================================

-- 1. Insert the three editorial roles into the roles table.
--    Using descriptive role_id values (same style as the plain-text
--    approach; admin_schema uses ROLE_01/ROLE_04 but those are legacy).
--    ON CONFLICT DO NOTHING makes this safe to re-run.

INSERT INTO roles (role_id, role_name) VALUES
  ('editor',     'Editor'),
  ('verifier',   'Verifier'),
  ('supervisor', 'Supervisor')
ON CONFLICT (role_id) DO NOTHING;


-- 2. RPC: get_editorial_role()
--    Returns the calling user's highest editorial role, or NULL for learners.
--    Priority: supervisor > verifier > editor.
DROP FUNCTION IF EXISTS get_editorial_role();
CREATE OR REPLACE FUNCTION get_editorial_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM user_roles_mapping
      WHERE profile_id = auth.uid() AND role_id = 'supervisor'
    ) THEN 'supervisor'
    WHEN EXISTS (
      SELECT 1 FROM user_roles_mapping
      WHERE profile_id = auth.uid() AND role_id = 'verifier'
    ) THEN 'verifier'
    WHEN EXISTS (
      SELECT 1 FROM user_roles_mapping
      WHERE profile_id = auth.uid() AND role_id = 'editor'
    ) THEN 'editor'
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION get_editorial_role() TO authenticated;


-- 3. RPC: get_editorial_staff()
--    Returns all users with editor / verifier / supervisor roles.
--    Used to populate the "Assign to" dropdown in the supervisor dashboard.
DROP FUNCTION IF EXISTS get_editorial_staff();
CREATE OR REPLACE FUNCTION get_editorial_staff()
RETURNS TABLE (
  profile_id   uuid,
  display_name text,
  role_id      text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id           AS profile_id,
    COALESCE(p.display_name, split_part(p.id::text, '-', 1)) AS display_name,
    urm.role_id
  FROM user_roles_mapping urm
  JOIN profiles p ON p.id = urm.profile_id
  WHERE urm.role_id IN ('editor', 'verifier', 'supervisor')
  ORDER BY urm.role_id, p.display_name;
$$;

GRANT EXECUTE ON FUNCTION get_editorial_staff() TO authenticated;


-- ============================================================
-- HOW TO ASSIGN A ROLE TO A USER
-- ============================================================
-- 1. Find their profile UUID: Table Editor → profiles, filter by display_name.
-- 2. Table Editor → user_roles_mapping → Insert row:
--      profile_id : <the user's UUID>
--      role_id    : 'editor'  |  'verifier'  |  'supervisor'
-- ============================================================
