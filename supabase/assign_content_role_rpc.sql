-- assign_content_role_rpc.sql
--
-- Problem: direct INSERT into content_role_assignments fails with 403 because
-- Supabase upsert (INSERT ... ON CONFLICT DO UPDATE) triggers RLS UPDATE checks
-- even when only an INSERT is happening, and the caller may not have the Creator
-- or Admin role correctly resolved at JWT evaluation time.
--
-- Solution: SECURITY DEFINER RPC — runs as DB owner, bypasses RLS entirely.
-- Permission gate is enforced inside the function (is_supervisor_or_admin()).
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.

CREATE OR REPLACE FUNCTION assign_content_role(
  p_profile_id   uuid,
  p_content_type text,
  p_content_id   text,
  p_language_id  text,
  p_sub_role     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only supervisors and admins may assign content roles
  IF NOT is_supervisor_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: caller is not a supervisor or admin';
  END IF;

  INSERT INTO content_role_assignments
    (profile_id, content_type, content_id, language_id, sub_role, assigned_by)
  VALUES
    (p_profile_id, p_content_type, p_content_id, p_language_id, p_sub_role, auth.uid())
  ON CONFLICT (profile_id, content_type, content_id, language_id, sub_role)
  DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_content_role(uuid, text, text, text, text) TO authenticated;
