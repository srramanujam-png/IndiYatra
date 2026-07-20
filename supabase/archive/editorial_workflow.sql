-- ============================================================
-- editorial_workflow.sql
-- Creates the two tables that power the editorial workflow:
--   • content_drafts          — one row per editing task
--   • content_workflow_events — audit log for every status change
--
-- Run AFTER editorial_roles.sql.
-- Safe to re-run (CREATE TABLE IF NOT EXISTS).
-- ============================================================


-- ── 1. content_drafts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_drafts (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- What is being edited
  content_type  text        NOT NULL
                CHECK (content_type IN ('snippet_translation', 'lesson')),
  content_id    text        NOT NULL,   -- snippet_id or lesson_id
  language_id   text,                  -- required when content_type = 'snippet_translation'

  -- The proposed changes stored as a JSON patch.
  -- Phase A: starts as {} (empty).  Phase B: editor fills it in.
  draft_data    jsonb       NOT NULL DEFAULT '{}',

  -- Workflow state
  status        text        NOT NULL DEFAULT 'unassigned'
                CHECK (status IN (
                  'unassigned',     -- created, not yet assigned to an editor
                  'assigned',       -- assigned, editor hasn't started yet
                  'in_draft',       -- editor is actively working
                  'submitted',      -- editor submitted for verifier review
                  'needs_revision', -- verifier sent it back
                  'approved',       -- verifier approved, awaiting supervisor sign-off
                  'published',      -- supervisor published to live
                  'rejected'        -- rejected outright
                )),

  -- People
  assigned_to   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,

  -- Optional metadata
  due_date      date,
  notes         text,

  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_content_draft_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_drafts_updated_at ON content_drafts;
CREATE TRIGGER content_drafts_updated_at
  BEFORE UPDATE ON content_drafts
  FOR EACH ROW EXECUTE FUNCTION update_content_draft_timestamp();


-- ── 2. content_workflow_events ────────────────────────────────
CREATE TABLE IF NOT EXISTS content_workflow_events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id    uuid        NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
  action      text        NOT NULL,
              -- 'assigned' | 'started' | 'submitted' | 'sent_back' |
              -- 'verifier_approved' | 'supervisor_approved' | 'published' | 'rejected'
  actor_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  comment     text,
  created_at  timestamptz DEFAULT now()
);


-- ── 3. Row-Level Security ─────────────────────────────────────
ALTER TABLE content_drafts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_workflow_events ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user a supervisor or admin?
CREATE OR REPLACE FUNCTION is_supervisor_or_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles_mapping
    WHERE profile_id = auth.uid()
      AND role_id IN ('supervisor', 'admin')
  );
$$;

-- Helper: is the calling user an editorial staff member?
CREATE OR REPLACE FUNCTION is_editorial_staff()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles_mapping
    WHERE profile_id = auth.uid()
      AND role_id IN ('editor', 'verifier', 'supervisor', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION is_supervisor_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_editorial_staff()     TO authenticated;


-- content_drafts policies ──────────────────────────────────────

-- SELECT: supervisors/admins see all; editors see their own;
--         verifiers see submitted + approved drafts
DROP POLICY IF EXISTS "drafts_select" ON content_drafts;
CREATE POLICY "drafts_select" ON content_drafts
  FOR SELECT USING (
    is_supervisor_or_admin()
    OR assigned_to = auth.uid()
    OR (
      status IN ('submitted', 'needs_revision', 'approved')
      AND EXISTS (
        SELECT 1 FROM user_roles_mapping
        WHERE profile_id = auth.uid() AND role_id = 'verifier'
      )
    )
  );

-- INSERT: only supervisors/admins can create drafts (assign tasks)
DROP POLICY IF EXISTS "drafts_insert" ON content_drafts;
CREATE POLICY "drafts_insert" ON content_drafts
  FOR INSERT WITH CHECK (is_supervisor_or_admin());

-- UPDATE: editors update their own drafts; verifiers update
--         submitted drafts; supervisors update anything
DROP POLICY IF EXISTS "drafts_update" ON content_drafts;
CREATE POLICY "drafts_update" ON content_drafts
  FOR UPDATE USING (
    is_supervisor_or_admin()
    OR assigned_to = auth.uid()
    OR (
      status IN ('submitted', 'needs_revision', 'approved')
      AND EXISTS (
        SELECT 1 FROM user_roles_mapping
        WHERE profile_id = auth.uid() AND role_id = 'verifier'
      )
    )
  );


-- content_workflow_events policies ────────────────────────────

-- SELECT: editorial staff can read events for drafts they can see
DROP POLICY IF EXISTS "events_select" ON content_workflow_events;
CREATE POLICY "events_select" ON content_workflow_events
  FOR SELECT USING (is_editorial_staff());

-- INSERT: editorial staff can log events
DROP POLICY IF EXISTS "events_insert" ON content_workflow_events;
CREATE POLICY "events_insert" ON content_workflow_events
  FOR INSERT WITH CHECK (is_editorial_staff());


-- ── 4. RPC helpers ───────────────────────────────────────────

-- get_all_drafts(): supervisor view — all drafts with editor names
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
  editor_name   text,
  assigner_name text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    d.id, d.content_type, d.content_id, d.language_id,
    d.status, d.due_date, d.notes, d.created_at, d.updated_at,
    COALESCE(e.display_name, e.id::text) AS editor_name,
    COALESCE(a.display_name, a.id::text) AS assigner_name
  FROM content_drafts d
  LEFT JOIN profiles e ON e.id = d.assigned_to
  LEFT JOIN profiles a ON a.id = d.assigned_by
  ORDER BY d.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_all_drafts() TO authenticated;


-- get_my_drafts(): editor view — only drafts assigned to me
CREATE OR REPLACE FUNCTION get_my_drafts()
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
  assigner_name text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    d.id, d.content_type, d.content_id, d.language_id,
    d.status, d.due_date, d.notes, d.created_at, d.updated_at,
    COALESCE(a.display_name, a.id::text) AS assigner_name
  FROM content_drafts d
  LEFT JOIN profiles a ON a.id = d.assigned_by
  WHERE d.assigned_to = auth.uid()
  ORDER BY d.due_date NULLS LAST, d.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_my_drafts() TO authenticated;


-- get_review_queue(): verifier view — drafts awaiting review
CREATE OR REPLACE FUNCTION get_review_queue()
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
  editor_name   text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    d.id, d.content_type, d.content_id, d.language_id,
    d.status, d.due_date, d.notes, d.created_at, d.updated_at,
    COALESCE(e.display_name, e.id::text) AS editor_name
  FROM content_drafts d
  LEFT JOIN profiles e ON e.id = d.assigned_to
  WHERE d.status IN ('submitted', 'needs_revision', 'approved')
  ORDER BY d.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_review_queue() TO authenticated;


-- ── 5. Add check_migrations entry ────────────────────────────
-- Add this to check_migrations.sql manually:
--
--   SELECT 'editorial_workflow.sql', 'content_drafts table',
--     CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
--                       WHERE table_name='content_drafts' AND table_schema='public')
--          THEN '✓ exists' ELSE '✗ MISSING — run editorial_workflow.sql' END
--   UNION ALL
--   SELECT 'editorial_workflow.sql', 'content_workflow_events table',
--     CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
--                       WHERE table_name='content_workflow_events' AND table_schema='public')
--          THEN '✓ exists' ELSE '✗ MISSING' END
