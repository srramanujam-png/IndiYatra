-- ============================================================
-- admin_content_schema.sql
-- Admin CRUD support for content tables + Tokens RPC.
-- Run AFTER admin_schema.sql (requires is_admin() function).
-- Run once in Supabase SQL Editor.
-- ============================================================

-- ── admin_get_tokens() RPC ────────────────────────────────────────────────────
-- Returns per-user token totals broken down by type.
-- Only users who have at least one token are included.

CREATE OR REPLACE FUNCTION admin_get_tokens()
RETURNS TABLE (
  profile_id   uuid,
  display_name text,
  tulsi        int,
  ashoka       int,
  lotus        int,
  peepal       int,
  banyan       int,
  dharma       int,
  total        int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.display_name, '(no name)')::text,
    COALESCE(SUM(CASE WHEN ut.token_type = 'tulsi'  THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN ut.token_type = 'ashoka' THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN ut.token_type = 'lotus'  THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN ut.token_type = 'peepal' THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN ut.token_type = 'banyan' THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN ut.token_type = 'dharma' THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(ut.quantity), 0)::int
  FROM profiles p
  INNER JOIN user_tokens ut ON ut.profile_id = p.id
  GROUP BY p.id, p.display_name
  ORDER BY SUM(ut.quantity) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_tokens() TO authenticated;

-- ── Admin write policies: levels ──────────────────────────────────────────────
CREATE POLICY "admin_insert_levels" ON levels FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admin_update_levels" ON levels FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_levels" ON levels FOR DELETE USING (is_admin());

-- ── Admin write policies: courses ─────────────────────────────────────────────
CREATE POLICY "admin_insert_courses" ON courses FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admin_update_courses" ON courses FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_courses" ON courses FOR DELETE USING (is_admin());

-- ── Admin write policies: themes ──────────────────────────────────────────────
CREATE POLICY "admin_insert_themes" ON themes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admin_update_themes" ON themes FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_themes" ON themes FOR DELETE USING (is_admin());

-- ── Admin write policies: modules ─────────────────────────────────────────────
CREATE POLICY "admin_insert_modules" ON modules FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admin_update_modules" ON modules FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_modules" ON modules FOR DELETE USING (is_admin());

-- ── Admin write policies: lessons ─────────────────────────────────────────────
CREATE POLICY "admin_insert_lessons" ON lessons FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admin_update_lessons" ON lessons FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_lessons" ON lessons FOR DELETE USING (is_admin());

-- ── Admin write policies: snippet_core ───────────────────────────────────────
CREATE POLICY "admin_insert_snippet_core" ON snippet_core FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admin_update_snippet_core" ON snippet_core FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_snippet_core" ON snippet_core FOR DELETE USING (is_admin());

-- ── Admin write policies: snippet_translations ───────────────────────────────
CREATE POLICY "admin_insert_snippet_translations" ON snippet_translations FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admin_update_snippet_translations" ON snippet_translations FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_snippet_translations" ON snippet_translations FOR DELETE USING (is_admin());

-- ── Admin write policies: lesson_snippet_mapping ─────────────────────────────
CREATE POLICY "admin_insert_lesson_snippet_mapping" ON lesson_snippet_mapping FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admin_update_lesson_snippet_mapping" ON lesson_snippet_mapping FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_lesson_snippet_mapping" ON lesson_snippet_mapping FOR DELETE USING (is_admin());
