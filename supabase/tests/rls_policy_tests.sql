-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · RLS POLICY TESTS  (Roadmap 2.7 / R4)
--
-- HOW TO RUN: paste the ENTIRE file into Supabase SQL Editor → Run, then read
-- the Messages panel: every line must say PASS. The whole run is wrapped in a
-- transaction and ROLLED BACK — it never changes data.
--
-- Re-run after ANY change to policies, triggers, or SECURITY DEFINER functions
-- (i.e. after running any new supabase/*.sql script).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══ Part A — structural checks (run as superuser; data-independent) ═════════

DO $$
DECLARE n int;
BEGIN
  -- A1: no client INSERT policies remain on award/attempt tables
  SELECT count(*) INTO n FROM pg_policies
  WHERE schemaname='public' AND cmd='INSERT'
    AND tablename IN ('user_tokens','user_badges','quiz_attempts');
  IF n = 0 THEN RAISE NOTICE 'PASS A1: no INSERT policies on user_tokens/user_badges/quiz_attempts';
  ELSE RAISE NOTICE 'FAIL A1: % INSERT policy(ies) still present on award/attempt tables', n; END IF;

  -- A2: awarding trigger installed
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_award_on_lesson_completion'
             AND tgrelid='public.lesson_completions'::regclass) THEN
    RAISE NOTICE 'PASS A2: awarding trigger present on lesson_completions';
  ELSE RAISE NOTICE 'FAIL A2: trg_award_on_lesson_completion missing'; END IF;

  -- A3: question tables no longer public-read; staff-read policy in place
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND policyname LIKE '%public_read'
                 AND tablename IN ('snippet_questions','standalone_questions'))
     AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='snippet_questions'    AND policyname='snippet_questions_staff_read')
     AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='standalone_questions' AND policyname='standalone_questions_staff_read') THEN
    RAISE NOTICE 'PASS A3: question tables are staff-read-only';
  ELSE RAISE NOTICE 'FAIL A3: question-table read policies wrong'; END IF;

  -- A4: no DELETE policy on lesson_completions; legacy ALL policy gone
  SELECT count(*) INTO n FROM pg_policies
  WHERE tablename='lesson_completions' AND cmd IN ('DELETE','ALL');
  IF n = 0 THEN RAISE NOTICE 'PASS A4: lesson_completions has no DELETE/ALL policy';
  ELSE RAISE NOTICE 'FAIL A4: lesson_completions still deletable by clients'; END IF;

  -- A5: award helper functions are not client-callable
  SELECT count(*) INTO n
  FROM information_schema.routine_privileges
  WHERE routine_schema='public'
    AND routine_name IN ('fn_award_token','fn_award_badge','fn_award_on_lesson_completion')
    AND grantee IN ('anon','authenticated','PUBLIC');
  IF n = 0 THEN RAISE NOTICE 'PASS A5: award helpers not executable by clients';
  ELSE RAISE NOTICE 'FAIL A5: award helpers granted to clients (%)', n; END IF;

  -- A6: every SECURITY DEFINER function pins search_path (A6 hygiene regression check)
  SELECT count(*) INTO n
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname='public' AND p.prosecdef
    AND (p.proconfig IS NULL OR NOT EXISTS
         (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'));
  IF n = 0 THEN RAISE NOTICE 'PASS A6: all SECURITY DEFINER functions pin search_path';
  ELSE RAISE NOTICE 'FAIL A6: % SECURITY DEFINER function(s) without pinned search_path', n; END IF;
END $$;

-- ═══ Part B — behavioral checks (simulated signed-in learner) ════════════════
-- Uses a real profile id so FK errors can't mask RLS errors.

DO $$
DECLARE
  v_profile uuid;
  v_other   uuid;
  n int;
BEGIN
  SELECT id INTO v_profile FROM profiles ORDER BY created_at LIMIT 1;
  IF v_profile IS NULL THEN
    RAISE NOTICE 'SKIP B*: no profiles in DB — behavioral tests skipped';
    RETURN;
  END IF;
  SELECT id INTO v_other FROM profiles WHERE id <> v_profile ORDER BY created_at LIMIT 1;

  -- become that user
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_profile, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- B1: cannot INSERT own user_tokens
  BEGIN
    INSERT INTO user_tokens (profile_id, token_type, quantity) VALUES (v_profile, 'tulsi', 1);
    RAISE NOTICE 'FAIL B1: client inserted a user_tokens row';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS B1: user_tokens INSERT blocked (%)', SQLERRM;
  END;

  -- B2: cannot INSERT own user_badges
  BEGIN
    INSERT INTO user_badges (profile_id, badge_id) VALUES (v_profile, 'BADGE_P02');
    RAISE NOTICE 'FAIL B2: client inserted a user_badges row';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS B2: user_badges INSERT blocked (%)', SQLERRM;
  END;

  -- B3: cannot INSERT quiz_attempts directly (must use submit_quiz_attempt)
  BEGIN
    INSERT INTO quiz_attempts (profile_id, quiz_id, score, max_score, started_at, completed_at)
    SELECT v_profile, qs.quiz_id, 999, 999, now(), now() FROM quiz_sets qs LIMIT 1;
    IF FOUND THEN RAISE NOTICE 'FAIL B3: client inserted a quiz_attempts row';
    ELSE RAISE NOTICE 'SKIP B3: no quiz_sets rows to test against'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS B3: quiz_attempts INSERT blocked (%)', SQLERRM;
  END;

  -- B4: cannot read question tables (answers) — expect zero rows, no error
  SELECT count(*) INTO n FROM snippet_questions;
  IF n = 0 THEN RAISE NOTICE 'PASS B4a: snippet_questions unreadable to learners';
  ELSE RAISE NOTICE 'FAIL B4a: learner read % snippet_questions rows', n; END IF;
  SELECT count(*) INTO n FROM standalone_questions;
  IF n = 0 THEN RAISE NOTICE 'PASS B4b: standalone_questions unreadable to learners';
  ELSE RAISE NOTICE 'FAIL B4b: learner read % standalone_questions rows', n; END IF;

  -- B5: CAN read the answer-free pairing view
  BEGIN
    SELECT count(*) INTO n FROM snippet_question_map;
    RAISE NOTICE 'PASS B5: snippet_question_map readable (% rows)', n;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAIL B5: snippet_question_map not readable (%)', SQLERRM;
  END;

  -- B6: cannot DELETE own lesson_completions (streak tampering)
  BEGIN
    DELETE FROM lesson_completions WHERE profile_id = v_profile;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN RAISE NOTICE 'PASS B6: lesson_completions DELETE affects 0 rows';
    ELSE RAISE NOTICE 'FAIL B6: learner deleted % of their completions', n; END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS B6: lesson_completions DELETE blocked (%)', SQLERRM;
  END;

  -- B7: cannot read another user''s tokens
  IF v_other IS NOT NULL THEN
    SELECT count(*) INTO n FROM user_tokens WHERE profile_id = v_other;
    IF n = 0 THEN RAISE NOTICE 'PASS B7: other users'' tokens unreadable';
    ELSE RAISE NOTICE 'FAIL B7: read % rows of another user''s tokens', n; END IF;
  ELSE
    RAISE NOTICE 'SKIP B7: only one profile in DB';
  END IF;

  -- B8: cannot UPDATE question content (vandalism check, 1.1 regression)
  BEGIN
    UPDATE snippet_questions SET question = 'hacked' WHERE true;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN RAISE NOTICE 'PASS B8: snippet_questions UPDATE affects 0 rows';
    ELSE RAISE NOTICE 'FAIL B8: learner updated % question rows', n; END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS B8: snippet_questions UPDATE blocked (%)', SQLERRM;
  END;
END $$;

ROLLBACK;
-- All effects (including the simulated role) end here. Expected output: every
-- line PASS (or SKIP where the DB has no data to test with). Any FAIL is a
-- security regression — fix before shipping.
