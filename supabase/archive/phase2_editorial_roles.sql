-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · PHASE 2.9 — EDITORIAL ROLE-MODEL CONSOLIDATION (ED-A)
-- Date: 20 July 2026
--
-- HOW TO RUN: paste the ENTIRE file into Supabase SQL Editor → Run. Idempotent.
--
-- What this consolidates (see EDITORIAL_REVIEW.md Part 1):
--   Before: three parallel mechanisms — is_admin RPC, get_editorial_role RPC
--   (+ a drift-prone client-side fallback), and a separate direct-table read
--   for ROLE_07 Creator. Granting any role required hand-written SQL.
--   After:  ONE RPC (get_workspace_access) answers "may enter the workspace"
--   AND "default view"; roles are granted from the Admin → Team tab via a
--   permission-checked RPC. Workspace entry is also granted by having any
--   content_role_assignments row (ED-A.1).
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. get_workspace_access() — the one answer ───────────────────────────────
-- Returns jsonb:
--   role            'supervisor'|'verifier'|'editor'|NULL  (highest global role)
--   is_creator      bool   (ROLE_07 / role_name 'creator')
--   has_assignments bool   (any content_role_assignments row)
--   is_admin        bool
--   can_enter       bool   (admin OR role OR creator OR has_assignments)
--   default_view    'supervisor'|'verifier'|'editor'|NULL

CREATE OR REPLACE FUNCTION get_workspace_access()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_role   text;
  v_creator boolean;
  v_assign boolean;
  v_admin  boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('role', NULL, 'is_creator', false,
      'has_assignments', false, 'is_admin', false, 'can_enter', false,
      'default_view', NULL);
  END IF;

  SELECT CASE
    WHEN bool_or(LOWER(r.role_name) = 'supervisor') THEN 'supervisor'
    WHEN bool_or(LOWER(r.role_name) = 'verifier')   THEN 'verifier'
    WHEN bool_or(LOWER(r.role_name) = 'editor')     THEN 'editor'
    ELSE NULL END,
    COALESCE(bool_or(LOWER(r.role_name) = 'creator'), false),
    COALESCE(bool_or(LOWER(r.role_name) = 'admin'),   false)
  INTO v_role, v_creator, v_admin
  FROM user_roles_mapping urm
  JOIN roles r ON r.role_id = urm.role_id
  WHERE urm.profile_id = v_uid;

  v_assign := EXISTS (SELECT 1 FROM content_role_assignments cra
                      WHERE cra.profile_id = v_uid);

  RETURN jsonb_build_object(
    'role',            v_role,
    'is_creator',      COALESCE(v_creator, false),
    'has_assignments', v_assign,
    'is_admin',        COALESCE(v_admin, false),
    'can_enter',       COALESCE(v_admin, false) OR v_role IS NOT NULL
                       OR COALESCE(v_creator, false) OR v_assign,
    'default_view',    COALESCE(v_role,
                         CASE WHEN COALESCE(v_admin,false) THEN 'supervisor'
                              WHEN v_assign OR COALESCE(v_creator,false) THEN 'editor'
                              ELSE NULL END)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_workspace_access() TO authenticated;


-- ── 2. admin_set_editorial_role(profile, role) — Team-tab grant/revoke ───────
-- p_role: 'editor' | 'verifier' | 'supervisor' | 'creator' | NULL (= revoke all
-- editorial roles). Replaces hand-written INSERT INTO user_roles_mapping SQL.
-- A user holds at most ONE global editorial role after this call (admin ROLE_01
-- and the learner default ROLE_04 are never touched here).

CREATE OR REPLACE FUNCTION admin_set_editorial_role(p_profile uuid, p_role text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id text;
BEGIN
  IF NOT is_supervisor_or_admin() THEN
    RAISE EXCEPTION 'permission denied: supervisor or admin required';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('editor','verifier','supervisor','creator') THEN
    RAISE EXCEPTION 'invalid role %', p_role;
  END IF;

  -- Clear existing editorial roles (never admin/learner rows)
  DELETE FROM user_roles_mapping urm
  USING roles r
  WHERE r.role_id = urm.role_id
    AND urm.profile_id = p_profile
    AND LOWER(r.role_name) IN ('editor','verifier','supervisor','creator');

  IF p_role IS NOT NULL THEN
    SELECT r.role_id INTO v_role_id FROM roles r WHERE LOWER(r.role_name) = p_role;
    IF v_role_id IS NULL THEN
      RAISE EXCEPTION 'role % not found in roles table', p_role;
    END IF;
    INSERT INTO user_roles_mapping (profile_id, role_id)
    VALUES (p_profile, v_role_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_editorial_role(uuid, text) TO authenticated;


-- ── 3. get_team_members() — Team-tab listing ─────────────────────────────────
-- Everyone holding an editorial-ish role OR any per-content assignment, with
-- their global roles and open-assignment count. Supervisor/admin only.
-- (get_editorial_staff() is left untouched — the Assign-to dropdown keeps its
-- exact current behavior.)

CREATE OR REPLACE FUNCTION get_team_members()
RETURNS TABLE (
  profile_id       uuid,
  display_name     text,
  global_roles     text[],
  assignment_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  IF NOT is_supervisor_or_admin() THEN
    RAISE EXCEPTION 'permission denied: supervisor or admin required';
  END IF;

  RETURN QUERY
  WITH role_rows AS (
    SELECT urm.profile_id AS pid, LOWER(r.role_name) AS rn
    FROM user_roles_mapping urm
    JOIN roles r ON r.role_id = urm.role_id
    WHERE LOWER(r.role_name) IN ('editor','verifier','supervisor','creator','admin')
  ),
  assign_rows AS (
    SELECT cra.profile_id AS pid, count(*) AS cnt
    FROM content_role_assignments cra
    GROUP BY cra.profile_id
  ),
  member_ids AS (
    SELECT pid FROM role_rows
    UNION
    SELECT pid FROM assign_rows
  )
  SELECT
    p.id,
    COALESCE(NULLIF(TRIM(p.display_name), ''), 'Traveller ' || left(p.id::text, 8)),
    COALESCE((SELECT array_agg(DISTINCT rr.rn) FROM role_rows rr WHERE rr.pid = p.id), '{}'),
    COALESCE((SELECT ar.cnt FROM assign_rows ar WHERE ar.pid = p.id), 0)
  FROM member_ids m
  JOIN profiles p ON p.id = m.pid
  ORDER BY 2;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_members() TO authenticated;


-- ── 4. lesson_editors — DECISION (deferred from Phase 1 follow-up) ───────────
-- Referenced nowhere in app code; RLS-locked with zero policies since Phase 1.
-- DECISION: drop it. content_role_assignments already models per-content
-- editing rights (with language + sub_role), so lesson_editors is a dead
-- parallel mechanism — exactly what ED-A exists to remove.
DROP TABLE IF EXISTS lesson_editors;

-- ─── End of Phase 2.9 script ─────────────────────────────────────────────────
