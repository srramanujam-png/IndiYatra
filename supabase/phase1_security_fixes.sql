-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · PHASE 1 SECURITY FIXES  (Overhaul Roadmap items 1.1, 1.2, 1.4, 1.5, 1.6)
-- Date: 19 July 2026
--
-- HOW TO RUN: copy this ENTIRE file, paste into Supabase Dashboard → SQL Editor
-- → Run. Safe to re-run (idempotent). Nothing here deletes data.
--
-- Covers:
--   §1  Quiz content lockdown (roadmap 1.1 / manual A1) — admin-only editing
--   §2  Stopgap CHECK constraints on points/tokens/attempts (1.2 / A2 step 1)
--   §3  Comments lockdown — no posting from anonymous sessions (1.5 / R1)
--   §4  Leaderboard privacy — first-name-only + visibility flag (1.6 / R1)
--
-- NOT covered here (needs live-DB output first — run phase1_diagnostics.sql
-- and give the output to your next AI session): full RLS coverage audit (1.3),
-- SECURITY DEFINER audit (A6), server-side awarding (roadmap 2.4).
-- ─────────────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════════════
-- §1  QUIZ CONTENT LOCKDOWN (A1)
-- Before: any session (incl. anonymous) could INSERT/UPDATE quiz questions.
-- After: only supervisors/admins (uses existing is_supervisor_or_admin()).
-- ═════════════════════════════════════════════════════════════════════════════

-- snippet_questions
DROP POLICY IF EXISTS "snippet_questions_auth_insert" ON snippet_questions;
DROP POLICY IF EXISTS "snippet_questions_auth_update" ON snippet_questions;
DROP POLICY IF EXISTS "snippet_questions_admin_insert" ON snippet_questions;
DROP POLICY IF EXISTS "snippet_questions_admin_update" ON snippet_questions;
DROP POLICY IF EXISTS "snippet_questions_admin_delete" ON snippet_questions;

CREATE POLICY "snippet_questions_admin_insert" ON snippet_questions
  FOR INSERT WITH CHECK (is_supervisor_or_admin());
CREATE POLICY "snippet_questions_admin_update" ON snippet_questions
  FOR UPDATE USING (is_supervisor_or_admin())
  WITH CHECK (is_supervisor_or_admin());
CREATE POLICY "snippet_questions_admin_delete" ON snippet_questions
  FOR DELETE USING (is_supervisor_or_admin());

-- standalone_questions
DROP POLICY IF EXISTS "standalone_questions_auth_insert" ON standalone_questions;
DROP POLICY IF EXISTS "standalone_questions_auth_update" ON standalone_questions;
DROP POLICY IF EXISTS "standalone_questions_admin_insert" ON standalone_questions;
DROP POLICY IF EXISTS "standalone_questions_admin_update" ON standalone_questions;
DROP POLICY IF EXISTS "standalone_questions_admin_delete" ON standalone_questions;

CREATE POLICY "standalone_questions_admin_insert" ON standalone_questions
  FOR INSERT WITH CHECK (is_supervisor_or_admin());
CREATE POLICY "standalone_questions_admin_update" ON standalone_questions
  FOR UPDATE USING (is_supervisor_or_admin())
  WITH CHECK (is_supervisor_or_admin());
CREATE POLICY "standalone_questions_admin_delete" ON standalone_questions
  FOR DELETE USING (is_supervisor_or_admin());

-- quiz_questions (join table; original file only had an INSERT policy)
DROP POLICY IF EXISTS "quiz_questions_auth_insert" ON quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_admin_insert" ON quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_admin_update" ON quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_admin_delete" ON quiz_questions;

CREATE POLICY "quiz_questions_admin_insert" ON quiz_questions
  FOR INSERT WITH CHECK (is_supervisor_or_admin());
CREATE POLICY "quiz_questions_admin_update" ON quiz_questions
  FOR UPDATE USING (is_supervisor_or_admin())
  WITH CHECK (is_supervisor_or_admin());
CREATE POLICY "quiz_questions_admin_delete" ON quiz_questions
  FOR DELETE USING (is_supervisor_or_admin());

-- NOTE (A4): these five "auth.role() = 'authenticated'" policies were the only
-- occurrences in the repo's SQL. phase1_diagnostics.sql §3 checks the LIVE DB
-- for any others created outside the repo.


-- ═════════════════════════════════════════════════════════════════════════════
-- §2  STOPGAP CHECK CONSTRAINTS (A2 step 1)
-- Blocks the worst inflation attacks until server-side awarding (roadmap 2.4).
-- NOT VALID = applies to NEW rows only; legacy rows are untouched.
-- Caps are generous on purpose — raise them here if legitimate content exceeds them.
-- ═════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE lesson_completions ADD CONSTRAINT lc_points_sane
    CHECK (points_earned BETWEEN 0 AND 1000) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE lesson_completions ADD CONSTRAINT lc_snippets_sane
    CHECK (snippet_count IS NULL OR snippet_count BETWEEN 0 AND 500) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE quiz_attempts ADD CONSTRAINT qa_score_sane
    CHECK (score >= 0 AND max_score >= 0 AND max_score <= 1000
           AND score <= max_score) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE user_tokens ADD CONSTRAINT ut_quantity_sane
    CHECK (
      (token_type = 'dharma'  AND quantity BETWEEN 1 AND 1000) OR
      (token_type <> 'dharma' AND quantity = 1)
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3  COMMENTS LOCKDOWN (R1 / roadmap 1.5)
-- Before: anonymous guest sessions could post comments (unmoderated UGC
-- reachable by children). After: only real (non-anonymous) accounts can post
-- or edit. Reading stays public. Admin delete policy already exists.
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "comments_insert_auth" ON snippet_comments;
DROP POLICY IF EXISTS "comments_insert_real_users" ON snippet_comments;

CREATE POLICY "comments_insert_real_users" ON snippet_comments
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

DROP POLICY IF EXISTS "comments_update_own" ON snippet_comments;

CREATE POLICY "comments_update_own" ON snippet_comments
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (
    auth.uid() = profile_id
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );


-- ═════════════════════════════════════════════════════════════════════════════
-- §4  LEADERBOARD PRIVACY (R1 / roadmap 1.6)
-- Changes vs previous get_leaderboard:
--   a) shows FIRST NAME ONLY (first word of display_name) — children's full
--      names are no longer broadcast to every user;
--   b) new profiles.leaderboard_visible flag — rows with false are hidden
--      (the caller always still sees their own row);
--   c) pins search_path (A6 hygiene — was missing).
-- Default is visible=true (current behaviour). PRODUCT DECISION pending:
-- for an opt-IN model (recommended for minors under DPDP/COPPA), flip the
-- default to false once a Settings toggle exists (roadmap Phase 3).
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS leaderboard_visible boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION get_leaderboard(
  p_course_id   uuid DEFAULT NULL,
  p_profile_id  uuid DEFAULT NULL
)
RETURNS TABLE (
  rank               int,
  profile_id         uuid,
  display_name       text,
  plant_tokens       int,
  lessons_completed  int,
  snippets_read      int,
  is_current_user    boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH
  plant_totals AS (
    SELECT profile_id, COUNT(*)::int AS plant_count
    FROM user_tokens
    WHERE token_type != 'dharma'
    GROUP BY profile_id
  ),
  deduped_completions AS (
    SELECT DISTINCT ON (profile_id, lesson_id)
      profile_id, lesson_id, course_id, snippet_count
    FROM lesson_completions
    ORDER BY profile_id, lesson_id, completed_at DESC NULLS LAST
  ),
  full_ranking AS (
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(pt.plant_count, 0) DESC,
                 COUNT(DISTINCT dc.lesson_id) DESC
      )::int                                              AS rank,
      p.id                                                AS profile_id,
      -- first word of display_name only; 'Traveller' fallback
      COALESCE(
        NULLIF(split_part(TRIM(p.display_name), ' ', 1), ''),
        'Traveller'
      )::text                                             AS display_name,
      COALESCE(pt.plant_count, 0)::int                    AS plant_tokens,
      COUNT(DISTINCT dc.lesson_id)::int                   AS lessons_completed,
      COALESCE(SUM(dc.snippet_count), 0)::int             AS snippets_read,
      (p.id = p_profile_id)                               AS is_current_user
    FROM profiles p
    LEFT JOIN plant_totals pt ON pt.profile_id = p.id
    LEFT JOIN deduped_completions dc
      ON  dc.profile_id = p.id
      AND (p_course_id IS NULL OR dc.course_id = p_course_id)
    WHERE (p.leaderboard_visible OR p.id = p_profile_id)
    GROUP BY p.id, p.display_name, pt.plant_count
    HAVING COUNT(DISTINCT dc.lesson_id) > 0
        OR COALESCE(pt.plant_count, 0) > 0
  ),
  top25 AS (
    SELECT * FROM full_ranking ORDER BY rank LIMIT 25
  ),
  my_row AS (
    SELECT * FROM full_ranking
    WHERE profile_id = p_profile_id
      AND profile_id NOT IN (SELECT profile_id FROM top25)
  )
  SELECT * FROM top25
  UNION ALL
  SELECT * FROM my_row
  ORDER BY rank;
$$;

GRANT EXECUTE ON FUNCTION get_leaderboard(uuid, uuid) TO authenticated, anon;

-- ─── End of Phase 1 fixes ────────────────────────────────────────────────────
