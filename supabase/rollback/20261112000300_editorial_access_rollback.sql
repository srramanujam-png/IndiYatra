-- Rollback for 20261112000300_editorial_access.sql (re-opens audit findings H2, H3, M5)
DROP POLICY IF EXISTS cra_insert ON public.content_role_assignments;
CREATE POLICY cra_insert ON public.content_role_assignments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_roles_mapping urm
     JOIN public.roles r ON ((r.role_id = urm.role_id)))
  WHERE ((urm.profile_id = auth.uid()) AND (lower(r.role_name) = ANY (ARRAY['admin'::text, 'creator'::text]))))));
DROP POLICY IF EXISTS cra_update ON public.content_role_assignments;
CREATE POLICY cra_update ON public.content_role_assignments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.user_roles_mapping urm
     JOIN public.roles r ON ((r.role_id = urm.role_id)))
  WHERE ((urm.profile_id = auth.uid()) AND (lower(r.role_name) = ANY (ARRAY['admin'::text, 'creator'::text]))))));
DROP POLICY IF EXISTS cra_delete ON public.content_role_assignments;
CREATE POLICY cra_delete ON public.content_role_assignments FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.user_roles_mapping urm
     JOIN public.roles r ON ((r.role_id = urm.role_id)))
  WHERE ((urm.profile_id = auth.uid()) AND (lower(r.role_name) = ANY (ARRAY['admin'::text, 'creator'::text]))))));
DROP POLICY IF EXISTS drafts_update ON public.content_drafts;
CREATE POLICY drafts_update ON public.content_drafts FOR UPDATE USING ((public.is_supervisor_or_admin() OR (assigned_to = auth.uid()) OR ((status = ANY (ARRAY['submitted'::text, 'needs_revision'::text, 'approved'::text])) AND (EXISTS ( SELECT 1
   FROM public.content_role_assignments
  WHERE ((content_role_assignments.profile_id = auth.uid()) AND (content_role_assignments.sub_role = 'verifier'::text)))))));

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
  ORDER BY d.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_all_drafts() TO anon, authenticated;

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
  ORDER BY p.id, p.display_name;
$$;
GRANT EXECUTE ON FUNCTION public.get_editorial_staff() TO anon, authenticated;

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
  ORDER BY d.updated_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_review_queue() TO anon, authenticated;

-- is_workspace_member() is left in place: later migrations may use it and it grants nothing by itself.
