-- ============================================================
-- admin_schema.sql
-- Admin panel support: role helper, user listing RPC,
-- and RLS policies for admin writes.
--
-- Prerequisites: roles, user_roles_mapping, profiles,
--   lesson_completions, badges, taxonomy_terms,
--   taxonomy_term_translations tables must already exist.
--
-- Run once in Supabase SQL Editor.
-- ============================================================

-- ── Step 1: Ensure admin role exists ─────────────────────────────────────────
-- ROLE_04 is the default learner role (assigned by handle_new_user trigger).
-- ROLE_01 is the admin role. Create it if missing.

INSERT INTO roles (role_id, role_name)
VALUES ('ROLE_01', 'Admin')
ON CONFLICT (role_id) DO NOTHING;

-- ── Step 2: Assign admin role to yourself ────────────────────────────────────
-- Find your profile UUID in Supabase: Table Editor → profiles → copy your id
-- Then run:
--
--   INSERT INTO user_roles_mapping (profile_id, role_id)
--   VALUES ('<YOUR_PROFILE_UUID>', 'ROLE_01')
--   ON CONFLICT DO NOTHING;
--
-- After this you will see the Admin nav link when signed in.

-- ── Step 3: is_admin() helper ────────────────────────────────────────────────
-- Returns true if the current user has any role other than ROLE_04.
-- Used by admin RLS policies and admin RPC guards.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS bool
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles_mapping
    WHERE profile_id = auth.uid()
      AND role_id != 'ROLE_04'
  );
$$;

-- ── Step 4: admin_get_users() RPC ────────────────────────────────────────────
-- Returns all profiles with role + completion stats.
-- SECURITY DEFINER so it can read other users' rows despite RLS.
-- Raises exception if caller is not admin.

CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE (
  profile_id       uuid,
  display_name     text,
  role_id          text,
  role_name        text,
  created_at       timestamptz,
  lessons_completed int,
  dharma_points    int
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
    COALESCE(urm.role_id, 'ROLE_04')::text,
    COALESCE(r.role_name, 'Learner')::text,
    p.created_at,
    COUNT(DISTINCT lc.lesson_id)::int,
    COALESCE(SUM(lc.points_earned), 0)::int
  FROM profiles p
  LEFT JOIN user_roles_mapping urm ON urm.profile_id = p.id AND urm.role_id != 'ROLE_04'
  LEFT JOIN roles r ON r.role_id = urm.role_id
  LEFT JOIN lesson_completions lc ON lc.profile_id = p.id
  GROUP BY p.id, p.display_name, urm.role_id, r.role_name, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute to authenticated users (function checks admin inside)
GRANT EXECUTE ON FUNCTION admin_get_users() TO authenticated;

-- ── Step 5: admin_get_badge_counts() RPC ─────────────────────────────────────
-- Returns earned count per badge for the badge manager.

CREATE OR REPLACE FUNCTION admin_get_badge_counts()
RETURNS TABLE (
  badge_id     text,
  earned_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT ub.badge_id, COUNT(*)::int
  FROM user_badges ub
  GROUP BY ub.badge_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_badge_counts() TO authenticated;

-- ── Step 6: RLS policies for badges (admin UPDATE) ───────────────────────────

-- badges currently only has public read. Add admin update:
CREATE POLICY "admin_update_badges"
ON badges
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- ── Step 7: RLS policies for taxonomy_terms (admin write) ────────────────────

CREATE POLICY "admin_insert_taxonomy_terms"
ON taxonomy_terms FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_taxonomy_terms"
ON taxonomy_terms FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_taxonomy_terms"
ON taxonomy_terms FOR DELETE USING (is_admin());

-- ── Step 8: RLS policies for taxonomy_term_translations (admin write) ─────────

CREATE POLICY "admin_insert_taxonomy_translations"
ON taxonomy_term_translations FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_taxonomy_translations"
ON taxonomy_term_translations FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_taxonomy_translations"
ON taxonomy_term_translations FOR DELETE USING (is_admin());
