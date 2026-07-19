-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · PHASE 1 FOLLOW-UP #3  (from diagnostics §4 output, 19 Jul 2026)
-- Pins search_path = public on EVERY SECURITY DEFINER function in the public
-- schema that lacks it (16 found). Closes manual item A6's hygiene half; the
-- permission-gating half was audited OK (admin_get_* check is_admin();
-- get_user_likes/bookmarks filter by auth.uid()).
--
-- HOW TO RUN: paste into Supabase SQL Editor → Run. Idempotent — re-running
-- finds nothing left to fix. Then re-run diagnostics §4 to confirm:
-- expect zero rows saying "NO search_path pinned".
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND (p.proconfig IS NULL
           OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                          WHERE c LIKE 'search_path=%'))
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
    RAISE NOTICE 'pinned: %', r.sig;
  END LOOP;
END $$;

-- Residual note for next AI session: get_quiz_ranks(p_profile_id) returns rank
-- numbers for any profile_id passed in (not just the caller). Low sensitivity
-- (ranks only, UUIDs unguessable) — tighten to auth.uid() during roadmap 2.4.
