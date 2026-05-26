-- drafts_with_subrole.sql
-- Adds sub_role column to get_my_drafts() and get_review_queue().
-- Must DROP first because return type is changing.

DROP FUNCTION IF EXISTS get_my_drafts();
DROP FUNCTION IF EXISTS get_review_queue();

-- ── get_my_drafts() ───────────────────────────────────────────────────────────
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
  assigner_name text,
  sub_role      text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    d.id, d.content_type, d.content_id, d.language_id,
    d.status, d.due_date, d.notes, d.created_at, d.updated_at,
    COALESCE(a.display_name, a.id::text) AS assigner_name,
    cra.sub_role
  FROM content_drafts d
  LEFT JOIN profiles a ON a.id = d.assigned_by
  LEFT JOIN content_role_assignments cra
    ON  cra.profile_id   = auth.uid()
    AND cra.content_type = d.content_type
    AND cra.content_id   = d.content_id
    AND (cra.language_id IS NOT DISTINCT FROM d.language_id)
  WHERE d.assigned_to = auth.uid()
  ORDER BY d.due_date NULLS LAST, d.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_my_drafts() TO authenticated;


-- ── get_review_queue() ────────────────────────────────────────────────────────
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
  editor_name   text,
  sub_role      text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    d.id, d.content_type, d.content_id, d.language_id,
    d.status, d.due_date, d.notes, d.created_at, d.updated_at,
    COALESCE(e.display_name, e.id::text) AS editor_name,
    cra.sub_role
  FROM content_drafts d
  LEFT JOIN profiles e ON e.id = d.assigned_to
  LEFT JOIN content_role_assignments cra
    ON  cra.profile_id   = auth.uid()
    AND cra.content_type = d.content_type
    AND cra.content_id   = d.content_id
    AND (cra.language_id IS NOT DISTINCT FROM d.language_id)
  WHERE d.status IN ('submitted', 'needs_revision', 'approved')
  ORDER BY d.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_review_queue() TO authenticated;
