-- content_role_update_policy.sql
-- Adds a missing UPDATE policy on content_role_assignments.
--
-- Root cause: Supabase PostgREST upsert (INSERT ... ON CONFLICT DO UPDATE)
-- requires an UPDATE policy even when no conflict occurs and only an INSERT
-- actually happens. Without this, assignContentRole() silently fails.
--
-- Also switches the frontend to use INSERT with ignoreDuplicates (see auth.js),
-- which is cleaner. This policy is kept as a safety net.
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.

DROP POLICY IF EXISTS "cra_update" ON content_role_assignments;
CREATE POLICY "cra_update" ON content_role_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) IN ('admin', 'creator')
    )
  );
