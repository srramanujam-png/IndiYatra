-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Audit fixes H2, H3, M5 (12 Nov 2026): editorial workspace access
--
-- H2  content_role_assignments: any "creator" could insert a row making themselves a
--     supervisor (then publish, edit quiz answers, grant roles). Writes now require
--     is_supervisor_or_admin(), the same rule the assign_content_role RPC already uses.
-- H3  get_all_drafts(), get_editorial_staff() and get_review_queue() had no permission
--     check and were open to anonymous visitors. They now return rows only to members
--     of the editorial workspace and are no longer executable without signing in.
-- M5  content_drafts UPDATE had no WITH CHECK, so an assigned editor could set their
--     own draft to approved/published. Editors may now only save or submit.
--
-- Safe to re-run (idempotent). Rollback: supabase/rollback/20261112000300_*.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Anyone with a seat in the editorial workspace: admin, creator, or holder of any content assignment.
CREATE OR REPLACE FUNCTION public.is_workspace_member() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_editorial_staff()
    OR EXISTS (SELECT 1 FROM content_role_assignments cra WHERE cra.profile_id = auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.is_workspace_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_member() TO anon, authenticated, service_role;

-- ── H2: only supervisors and admins may write content role assignments ──
DROP POLICY IF EXISTS cra_insert ON public.content_role_assignments;
CREATE POLICY cra_insert ON public.content_role_assignments FOR INSERT WITH CHECK (public.is_supervisor_or_admin());
DROP POLICY IF EXISTS cra_update ON public.content_role_assignments;
CREATE POLICY cra_update ON public.content_role_assignments FOR UPDATE USING (public.is_supervisor_or_admin()) WITH CHECK (public.is_supervisor_or_admin());
DROP POLICY IF EXISTS cra_delete ON public.content_role_assignments;
CREATE POLICY cra_delete ON public.content_role_assignments FOR DELETE USING (public.is_supervisor_or_admin());

-- ── H3: workspace listings answer workspace members only ──
CREATE OR REPLACE FUNCTION public.get_all_drafts() RETURNS TABLE(id uuid, content_type text, content_id text, language_id text, status text, due_date date, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, assigned_to uuid, editor_name text, assigner_name text, sub_role text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
  WHERE public.is_workspace_member()
  ORDER BY d.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_editorial_staff() RETURNS TABLE(profile_id uuid, display_name text, role_id text, role_label text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
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
    AND public.is_workspace_member()
  ORDER BY p.id, p.display_name;
$$;

CREATE OR REPLACE FUNCTION public.get_review_queue() RETURNS TABLE(id uuid, content_type text, content_id text, language_id text, status text, due_date date, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, editor_name text, sub_role text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
    AND public.is_workspace_member()
  ORDER BY d.updated_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_all_drafts()      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_editorial_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_review_queue()    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_drafts()      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_editorial_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_review_queue()    TO authenticated, service_role;

-- ── M5: what a draft may look like AFTER an update, by who is updating ──
--   supervisor/admin: anything · assigned editor: still theirs, and only assigned / in_draft / submitted / needs_revision
--   verifier: only the review outcomes (submitted, needs_revision, approved, rejected)
DROP POLICY IF EXISTS drafts_update ON public.content_drafts;
CREATE POLICY drafts_update ON public.content_drafts FOR UPDATE
  USING ((public.is_supervisor_or_admin() OR (assigned_to = auth.uid()) OR ((status = ANY (ARRAY['submitted'::text, 'needs_revision'::text, 'approved'::text])) AND (EXISTS ( SELECT 1
   FROM public.content_role_assignments
  WHERE ((content_role_assignments.profile_id = auth.uid()) AND (content_role_assignments.sub_role = 'verifier'::text)))))))
  WITH CHECK (
    public.is_supervisor_or_admin()
    OR ((assigned_to = auth.uid()) AND (status = ANY (ARRAY['assigned'::text, 'in_draft'::text, 'submitted'::text, 'needs_revision'::text])))
    OR ((status = ANY (ARRAY['submitted'::text, 'needs_revision'::text, 'approved'::text, 'rejected'::text]))
        AND (EXISTS (SELECT 1 FROM public.content_role_assignments cra
                     WHERE cra.profile_id = auth.uid() AND cra.sub_role = 'verifier'::text)))
  );
