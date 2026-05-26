-- ============================================================
-- content_role_schema.sql
-- Implements per-content editorial sub-roles.
--
-- Changes
-- -------
--  1. Adds ROLE_07 (Creator) — global access to editorial workspace.
--  2. Creates content_role_assignments — per-content sub-roles
--        (editor | verifier | supervisor).
--  3. Updates four helper RPCs to use the new model.
--  4. Updates content_drafts RLS policies to use content_role_assignments
--     instead of checking ROLE_06 for verifiers.
--
-- Run AFTER editorial_roles_uniform.sql.
-- Safe to re-run (idempotent).
-- ============================================================


-- ── 1. Add ROLE_07 Creator ────────────────────────────────────────────────────

INSERT INTO roles (role_id, role_name) VALUES ('ROLE_07', 'Creator')
ON CONFLICT (role_id) DO UPDATE SET role_name = 'Creator';


-- ── 2. Create content_role_assignments ───────────────────────────────────────
--
-- One row = one user has a given sub_role on one specific piece of content.
-- language_id is required for snippet_translation, null for lesson.
--
-- UNIQUE constraint prevents duplicate (user, content, language, sub_role) rows.

CREATE TABLE IF NOT EXISTS content_role_assignments (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id    uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  content_type  text        NOT NULL
                CHECK (content_type IN ('snippet_translation', 'lesson')),
  content_id    text        NOT NULL,
  language_id   text,
  sub_role      text        NOT NULL
                CHECK (sub_role IN ('editor', 'verifier', 'supervisor')),
  assigned_by   uuid        REFERENCES profiles(id),
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, content_type, content_id, language_id, sub_role)
);

ALTER TABLE content_role_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT: own rows always visible; any Creator or Admin sees all rows.
-- (Direct joins used here to avoid calling is_supervisor_or_admin(), which
--  itself queries this table and would create a recursion under normal RLS.)
DROP POLICY IF EXISTS "cra_select" ON content_role_assignments;
CREATE POLICY "cra_select" ON content_role_assignments
  FOR SELECT USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) IN ('admin', 'creator')
    )
  );

-- INSERT: any Creator or Admin may assign content roles.
DROP POLICY IF EXISTS "cra_insert" ON content_role_assignments;
CREATE POLICY "cra_insert" ON content_role_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) IN ('admin', 'creator')
    )
  );

-- DELETE: same as INSERT.
DROP POLICY IF EXISTS "cra_delete" ON content_role_assignments;
CREATE POLICY "cra_delete" ON content_role_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) IN ('admin', 'creator')
    )
  );

GRANT SELECT, INSERT, DELETE ON content_role_assignments TO authenticated;


-- ── 3. Update helper RPCs ─────────────────────────────────────────────────────

-- 3a. get_editorial_role()
--
--   Priority: admin → creator+supervisor → creator+verifier → creator → null
--
--   Admin always gets supervisor view (full access).
--   Creator gets the highest sub_role they hold across ALL content items.
--   A Creator with no sub_roles assigned yet sees the editor view (safe default).

CREATE OR REPLACE FUNCTION get_editorial_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE

    -- Admin: unconditional supervisor
    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'admin'
    ) THEN 'supervisor'

    -- Creator with at least one supervisor sub_role
    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'creator'
    ) AND EXISTS (
      SELECT 1 FROM content_role_assignments
      WHERE profile_id = auth.uid() AND sub_role = 'supervisor'
    ) THEN 'supervisor'

    -- Creator with at least one verifier sub_role (but no supervisor)
    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'creator'
    ) AND EXISTS (
      SELECT 1 FROM content_role_assignments
      WHERE profile_id = auth.uid() AND sub_role = 'verifier'
    ) THEN 'verifier'

    -- Creator (any sub_role or none) → editor view
    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'creator'
    ) THEN 'editor'

    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION get_editorial_role() TO authenticated;


-- 3b. get_editorial_staff()
--
--   Returns all Creator and Admin users for the assignment / role dropdown.
--   One row per user (DISTINCT ON).

DROP FUNCTION IF EXISTS get_editorial_staff();
CREATE OR REPLACE FUNCTION get_editorial_staff()
RETURNS TABLE (
  profile_id   uuid,
  display_name text,
  role_id      text,
  role_label   text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (p.id)
    p.id                                                           AS profile_id,
    COALESCE(p.display_name, split_part(p.id::text, '-', 1))      AS display_name,
    urm.role_id,
    LOWER(r.role_name)                                             AS role_label
  FROM user_roles_mapping urm
  JOIN profiles p   ON p.id         = urm.profile_id
  JOIN roles    r   ON r.role_id    = urm.role_id
  WHERE LOWER(r.role_name) IN ('creator', 'admin')
  ORDER BY p.id, p.display_name;
$$;

GRANT EXECUTE ON FUNCTION get_editorial_staff() TO authenticated;


-- 3c. is_supervisor_or_admin()
--
--   True when:
--     • caller is Admin (ROLE_01), OR
--     • caller is Creator (ROLE_07) AND has at least one supervisor sub_role.
--
--   Used in content_drafts RLS policies.
--   SECURITY DEFINER bypasses RLS on content_role_assignments — no recursion.

CREATE OR REPLACE FUNCTION is_supervisor_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'admin'
    )
    OR (
      EXISTS (
        SELECT 1
        FROM user_roles_mapping urm
        JOIN roles r ON r.role_id = urm.role_id
        WHERE urm.profile_id = auth.uid()
          AND LOWER(r.role_name) = 'creator'
      )
      AND EXISTS (
        SELECT 1 FROM content_role_assignments
        WHERE profile_id = auth.uid() AND sub_role = 'supervisor'
      )
    );
$$;

GRANT EXECUTE ON FUNCTION is_supervisor_or_admin() TO authenticated;


-- 3d. is_editorial_staff()
--
--   True for any Creator (ROLE_07) or Admin (ROLE_01).

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
      AND LOWER(r.role_name) IN ('creator', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION is_editorial_staff() TO authenticated;


-- ── 4. Update content_drafts RLS policies ────────────────────────────────────
--
--   Old policies checked role_id = 'verifier' (plain text, pre-uniform-migration).
--   New policies check content_role_assignments.sub_role = 'verifier'.

DROP POLICY IF EXISTS "drafts_select" ON content_drafts;
CREATE POLICY "drafts_select" ON content_drafts
  FOR SELECT USING (
    is_supervisor_or_admin()
    OR assigned_to = auth.uid()
    OR (
      status IN ('submitted', 'needs_revision', 'approved')
      AND EXISTS (
        SELECT 1 FROM content_role_assignments
        WHERE profile_id = auth.uid() AND sub_role = 'verifier'
      )
    )
  );

DROP POLICY IF EXISTS "drafts_insert" ON content_drafts;
CREATE POLICY "drafts_insert" ON content_drafts
  FOR INSERT WITH CHECK (is_supervisor_or_admin());

DROP POLICY IF EXISTS "drafts_update" ON content_drafts;
CREATE POLICY "drafts_update" ON content_drafts
  FOR UPDATE USING (
    is_supervisor_or_admin()
    OR assigned_to = auth.uid()
    OR (
      status IN ('submitted', 'needs_revision', 'approved')
      AND EXISTS (
        SELECT 1 FROM content_role_assignments
        WHERE profile_id = auth.uid() AND sub_role = 'verifier'
      )
    )
  );


-- ── 5. Verification ──────────────────────────────────────────────────────────
-- Run after migration:
--
--   SELECT role_id, role_name FROM roles ORDER BY role_id;
--   -- Expected: ROLE_01 Admin, ROLE_02 Editor, ROLE_04 Learner,
--   --           ROLE_05 Supervisor, ROLE_06 Verifier, ROLE_07 Creator
--
--   SELECT COUNT(*) FROM content_role_assignments;
--   -- Expected: 0 (empty until supervisor assigns roles)
--
--   SELECT get_editorial_role();
--   -- Returns null for learners, 'editor'/'verifier'/'supervisor' for creators.
-- ============================================================


-- ── 6. Allow supervisors to delete drafts ────────────────────────────────────
-- The original editorial_workflow.sql only defined SELECT / INSERT / UPDATE
-- policies on content_drafts. DELETE was blocked. Add it here.

DROP POLICY IF EXISTS "drafts_delete" ON content_drafts;
CREATE POLICY "drafts_delete" ON content_drafts
  FOR DELETE USING (is_supervisor_or_admin());


-- ── 7. Fix get_all_drafts() — join sub_role from content_role_assignments ─────
-- Two problems with the original definition in editorial_workflow.sql:
--   a) assigned_to UUID was omitted — frontend could never resolve roles.
--   b) role data lived in a separate table requiring a second fetch that was
--      often empty (RLS / timing issues).
-- This SECURITY DEFINER replacement joins content_role_assignments directly,
-- returning sub_role per row without any RLS interference.

DROP FUNCTION IF EXISTS get_all_drafts();
CREATE OR REPLACE FUNCTION get_all_drafts()
RETURNS TABLE (
  id            uuid,
  content_type  text,
  content_id    text,
  language_id   text,
  status        text,
  due_date      date,
  notes         text,
  created_at    timestamptz,
  updated_at    timestamptz,
  assigned_to   uuid,
  editor_name   text,
  assigner_name text,
  sub_role      text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    d.id, d.content_type, d.content_id, d.language_id,
    d.status, d.due_date, d.notes, d.created_at, d.updated_at,
    d.assigned_to,
    COALESCE(e.display_name, e.id::text) AS editor_name,
    COALESCE(a.display_name, a.id::text) AS assigner_name,
    cra.sub_role
  FROM content_drafts d
  LEFT JOIN profiles e ON e.id = d.assigned_to
  LEFT JOIN profiles a ON a.id = d.assigned_by
  LEFT JOIN content_role_assignments cra
    ON  cra.profile_id   = d.assigned_to
    AND cra.content_type = d.content_type
    AND cra.content_id   = d.content_id
    AND (
          (cra.language_id IS NULL AND d.language_id IS NULL)
          OR cra.language_id = d.language_id
        )
  ORDER BY d.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_all_drafts() TO authenticated;
