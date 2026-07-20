-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · RLS POLICY TESTS  (Roadmap 2.7 / R4) — v2, dashboard-friendly
--
-- HOW TO RUN: paste the ENTIRE file into Supabase SQL Editor → Run.
-- ⚠️ THE RESULT ARRIVES AS AN "ERROR" — THAT IS INTENTIONAL. The final
-- RAISE EXCEPTION both (a) prints the full test report (the dashboard editor
-- doesn't show NOTICEs) and (b) guarantees every change is rolled back.
-- Read the error text: every line must start with PASS or SKIP. Any FAIL is a
-- security regression — fix before shipping.
--
-- Re-run after ANY change to policies, triggers, or SECURITY DEFINER functions.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  rep       text := E'\n══ RLS TEST REPORT (all changes rolled back) ══\n';
  n         int;
  v_profile uuid;
  v_other   uuid;
BEGIN

  -- ═══ Part A — structural checks (data-independent) ═══════════════════════

  SELECT count(*) INTO n FROM pg_policies
  WHERE schemaname='public' AND cmd='INSERT'
    AND tablename IN ('user_tokens','user_badges','quiz_attempts');
  rep := rep || CASE WHEN n = 0
    THEN 'PASS A1: no INSERT policies on user_tokens/user_badges/quiz_attempts'
    ELSE 'FAIL A1: ' || n || ' INSERT policy(ies) still present on award/attempt tables' END || E'\n';

  rep := rep || CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgname='trg_award_on_lesson_completion'
        AND tgrelid='public.lesson_completions'::regclass)
    THEN 'PASS A2: awarding trigger present on lesson_completions'
    ELSE 'FAIL A2: trg_award_on_lesson_completion missing' END || E'\n';

  rep := rep || CASE WHEN
      NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                  AND policyname LIKE '%public_read'
                  AND tablename IN ('snippet_questions','standalone_questions'))
      AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='snippet_questions'    AND policyname='snippet_questions_staff_read')
      AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='standalone_questions' AND policyname='standalone_questions_staff_read')
    THEN 'PASS A3: question tables are staff-read-only'
    ELSE 'FAIL A3: question-table read policies wrong' END || E'\n';

  SELECT count(*) INTO n FROM pg_policies
  WHERE tablename='lesson_completions' AND cmd IN ('DELETE','ALL');
  rep := rep || CASE WHEN n = 0
    THEN 'PASS A4: lesson_completions has no DELETE/ALL policy'
    ELSE 'FAIL A4: lesson_completions still deletable by clients' END || E'\n';

  SELECT count(*) INTO n
  FROM information_schema.routine_privileges
  WHERE routine_schema='public'
    AND routine_name IN ('fn_award_token','fn_award_badge','fn_award_on_lesson_completion')
    AND grantee IN ('anon','authenticated','PUBLIC');
  rep := rep || CASE WHEN n = 0
    THEN 'PASS A5: award helpers not executable by clients'
    ELSE 'FAIL A5: award helpers granted to clients (' || n || ')' END || E'\n';

  SELECT count(*) INTO n
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname='public' AND p.prosecdef
    AND (p.proconfig IS NULL OR NOT EXISTS
         (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'));
  rep := rep || CASE WHEN n = 0
    THEN 'PASS A6: all SECURITY DEFINER functions pin search_path'
    ELSE 'FAIL A6: ' || n || ' SECURITY DEFINER function(s) without pinned search_path' END || E'\n';

  -- ═══ Part B — behavioral checks (simulated signed-in learner) ════════════

  SELECT id INTO v_profile FROM profiles ORDER BY created_at LIMIT 1;
  IF v_profile IS NULL THEN
    rep := rep || E'SKIP B*: no profiles in DB — behavioral tests skipped\n';
  ELSE
    SELECT id INTO v_other FROM profiles WHERE id <> v_profile ORDER BY created_at LIMIT 1;

    -- become that user (reverted by the rollback at the end)
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_profile, 'role', 'authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);

    -- B1: cannot INSERT own user_tokens
    BEGIN
      INSERT INTO user_tokens (profile_id, token_type, quantity) VALUES (v_profile, 'tulsi', 1);
      rep := rep || E'FAIL B1: client inserted a user_tokens row\n';
    EXCEPTION WHEN OTHERS THEN
      rep := rep || 'PASS B1: user_tokens INSERT blocked (' || SQLERRM || E')\n';
    END;

    -- B2: cannot INSERT own user_badges
    BEGIN
      INSERT INTO user_badges (profile_id, badge_id) VALUES (v_profile, 'BADGE_P02');
      rep := rep || E'FAIL B2: client inserted a user_badges row\n';
    EXCEPTION WHEN OTHERS THEN
      rep := rep || 'PASS B2: user_badges INSERT blocked (' || SQLERRM || E')\n';
    END;

    -- B3: cannot INSERT quiz_attempts directly (must use submit_quiz_attempt)
    BEGIN
      INSERT INTO quiz_attempts (profile_id, quiz_id, score, max_score, started_at, completed_at)
      SELECT v_profile, qs.quiz_id, 999, 999, now(), now() FROM quiz_sets qs LIMIT 1;
      IF FOUND THEN rep := rep || E'FAIL B3: client inserted a quiz_attempts row\n';
      ELSE rep := rep || E'SKIP B3: no quiz_sets rows to test against\n'; END IF;
    EXCEPTION WHEN OTHERS THEN
      rep := rep || 'PASS B3: quiz_attempts INSERT blocked (' || SQLERRM || E')\n';
    END;

    -- B4: cannot read question tables (answers) — expect zero visible rows
    SELECT count(*) INTO n FROM snippet_questions;
    rep := rep || CASE WHEN n = 0
      THEN 'PASS B4a: snippet_questions unreadable to learners'
      ELSE 'FAIL B4a: learner read ' || n || ' snippet_questions rows' END || E'\n';
    SELECT count(*) INTO n FROM standalone_questions;
    rep := rep || CASE WHEN n = 0
      THEN 'PASS B4b: standalone_questions unreadable to learners'
      ELSE 'FAIL B4b: learner read ' || n || ' standalone_questions rows' END || E'\n';

    -- B5: CAN read the answer-free pairing view
    BEGIN
      SELECT count(*) INTO n FROM snippet_question_map;
      rep := rep || 'PASS B5: snippet_question_map readable (' || n || E' rows)\n';
    EXCEPTION WHEN OTHERS THEN
      rep := rep || 'FAIL B5: snippet_question_map not readable (' || SQLERRM || E')\n';
    END;

    -- B6: cannot DELETE own lesson_completions (streak tampering)
    BEGIN
      DELETE FROM lesson_completions WHERE profile_id = v_profile;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n = 0 THEN rep := rep || E'PASS B6: lesson_completions DELETE affects 0 rows\n';
      ELSE rep := rep || 'FAIL B6: learner deleted ' || n || E' of their completions\n'; END IF;
    EXCEPTION WHEN OTHERS THEN
      rep := rep || 'PASS B6: lesson_completions DELETE blocked (' || SQLERRM || E')\n';
    END;

    -- B7: cannot read another user's tokens
    IF v_other IS NOT NULL THEN
      SELECT count(*) INTO n FROM user_tokens WHERE profile_id = v_other;
      rep := rep || CASE WHEN n = 0
        THEN 'PASS B7: other users'' tokens unreadable'
        ELSE 'FAIL B7: read ' || n || ' rows of another user''s tokens' END || E'\n';
    ELSE
      rep := rep || E'SKIP B7: only one profile in DB\n';
    END IF;

    -- B8: cannot UPDATE question content (vandalism check, 1.1 regression)
    BEGIN
      UPDATE snippet_questions SET question = 'hacked' WHERE true;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n = 0 THEN rep := rep || E'PASS B8: snippet_questions UPDATE affects 0 rows\n';
      ELSE rep := rep || 'FAIL B8: learner updated ' || n || E' question rows\n'; END IF;
    EXCEPTION WHEN OTHERS THEN
      rep := rep || 'PASS B8: snippet_questions UPDATE blocked (' || SQLERRM || E')\n';
    END;
  END IF;

  -- ═══ Deliver the report AND roll everything back in one move ═════════════
  RAISE EXCEPTION '%', rep || E'══ END OF REPORT — the ERROR wrapper is intentional (it rolls everything back) ══';
END $$;
