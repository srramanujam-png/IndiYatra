-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · PHASE 1 FOLLOW-UP  (from diagnostics §2 output, 19 Jul 2026)
-- Finding: roles, user_roles_mapping, lesson_editors have RLS enabled but ZERO
-- policies — locked to everyone. Consequences today:
--   • admins cannot delete others' comments (comments_delete_admin checks
--     user_roles_mapping, which is unreadable → check always fails)
--   • direct role reads/writes in App.jsx / auth.js silently return nothing
--
-- HOW TO RUN: paste whole file into Supabase SQL Editor → Run. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- roles: read-only catalog of role names — safe for any signed-in session to read.
DROP POLICY IF EXISTS "roles_read_all" ON roles;
CREATE POLICY "roles_read_all" ON roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- user_roles_mapping:
--   read: your own rows, or everything if you are admin
--   write (insert/delete): admin only — role assignment from the Admin UI
-- No recursion risk: is_admin() is SECURITY DEFINER, so it bypasses RLS here.
DROP POLICY IF EXISTS "urm_read_own_or_admin" ON user_roles_mapping;
CREATE POLICY "urm_read_own_or_admin" ON user_roles_mapping
  FOR SELECT USING (profile_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "urm_admin_insert" ON user_roles_mapping;
CREATE POLICY "urm_admin_insert" ON user_roles_mapping
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "urm_admin_delete" ON user_roles_mapping;
CREATE POLICY "urm_admin_delete" ON user_roles_mapping
  FOR DELETE USING (is_admin());

-- lesson_editors: referenced nowhere in the app code — deliberately LEFT LOCKED
-- (safest state for an unused table). If an editor feature later breaks with
-- empty results, add policies then. Roadmap 2.9 (role-model consolidation)
-- should decide whether to drop or wire up this table.
