-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · LESSON-COMPLETION TESTS (complete_lesson, audit fix H1) — same convention as map_card_tests.sql
-- HOW TO RUN: paste into Supabase SQL Editor → Run. It builds its OWN throw-away data (prefixed 'LCT'),
-- then rolls everything back; the report arrives as an intentional "ERROR". Every line must start PASS.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  rep text := E'\n══ LESSON COMPLETION TEST REPORT (all changes rolled back) ══\n';
  n int; q int; j jsonb; t1 timestamptz; t2 timestamptz;
  u1 uuid := '81111111-1111-1111-1111-111111111111';
  cA uuid := 'c8000000-0000-0000-0000-00000000000a';
  mid uuid := gen_random_uuid(); l1 uuid := gen_random_uuid(); l2 uuid := gen_random_uuid(); sid uuid; i int;
BEGIN
  -- ── throw-away data: one course, one module, two lessons.
  --    l1 = 3 snippets worth 10 each, only 2 of them have a LANG_03 translation → worth 20 points, 2 stories.
  --    l2 = 1 snippet (10). ──
  INSERT INTO languages (language_id, language_code, language) VALUES ('LANG_03', 'lct', 'LCT lang') ON CONFLICT DO NOTHING;
  INSERT INTO auth.users (id) VALUES (u1);
  INSERT INTO profiles (id, display_name) VALUES (u1, 'LCT one') ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  INSERT INTO levels (level_id, level_number, title) VALUES ('LCTL', 98, 'LCT') ON CONFLICT DO NOTHING;
  INSERT INTO courses (course_id, course_name) VALUES (cA, 'LCT Course A');
  INSERT INTO modules (module_id, module_name, level_id, course_id) VALUES (mid, 'LCT M1', 'LCTL', cA);
  INSERT INTO lessons (lesson_id, module_id, lesson_name) VALUES (l1, mid, 'LCT lesson 1'), (l2, mid, 'LCT lesson 2');
  FOR i IN 1..3 LOOP
    sid := gen_random_uuid();
    INSERT INTO snippet_core (snippet_id, snippet_value, status) VALUES (sid, 10, 'PUBLISHED');
    IF i < 3 THEN INSERT INTO snippet_translations (snippet_id, language, hook) VALUES (sid, 'LANG_03', 'h'); END IF;
    INSERT INTO lesson_snippet_mapping (lesson_id, snippet_id, order_index) VALUES (l1, sid, i);
  END LOOP;
  sid := gen_random_uuid();
  INSERT INTO snippet_core (snippet_id, snippet_value, status) VALUES (sid, 10, 'PUBLISHED');
  INSERT INTO snippet_translations (snippet_id, language, hook) VALUES (sid, 'LANG_03', 'h');
  INSERT INTO lesson_snippet_mapping (lesson_id, snippet_id, order_index) VALUES (l2, sid, 1);

  -- ═══ structure ═══
  rep := rep || CASE WHEN has_function_privilege('anon', 'public.complete_lesson(uuid)', 'EXECUTE') THEN E'FAIL L1: anon can execute complete_lesson\n' ELSE E'PASS L1: not executable by anon\n' END;
  rep := rep || CASE WHEN has_function_privilege('authenticated', 'public.complete_lesson(uuid)', 'EXECUTE') THEN E'PASS L2: signed-in users can execute\n' ELSE E'FAIL L2: authenticated cannot execute\n' END;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lesson_completions' AND cmd <> 'SELECT';
  rep := rep || CASE WHEN n = 0 THEN E'PASS L3: lesson_completions has only SELECT policies\n' ELSE 'FAIL L3: ' || n || E' write policy(ies) still on lesson_completions\n' END;
  SELECT count(*) INTO n FROM pg_proc p, unnest(p.proargnames) a WHERE p.proname = 'complete_lesson' AND (a ILIKE '%user%' OR a ILIKE '%profile%' OR a ILIKE '%point%');
  rep := rep || CASE WHEN n = 0 THEN E'PASS L4: no user-id or points parameter\n' ELSE E'FAIL L4: takes a user/points parameter\n' END;

  -- ═══ behaviour, as the signed-in learner u1 ═══
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  BEGIN
    INSERT INTO lesson_completions (profile_id, lesson_id, course_id, points_earned, snippet_count) VALUES (u1, l1, cA, 1000, 500);
    rep := rep || E'FAIL L5: client inserted a lesson_completions row directly\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS L5: direct INSERT blocked (' || SQLERRM || E')\n'; END;

  j := public.complete_lesson(l1);
  rep := rep || CASE WHEN (j->>'points_earned')::int = 20 AND (j->>'snippet_count')::int = 2 AND (j->>'course_id')::uuid = cA AND (j->>'already_completed')::boolean = false
    THEN E'PASS L6: server computed 20 points, 2 stories, right course\n' ELSE 'FAIL L6: got ' || j::text || E'\n' END;
  t1 := (j->>'completed_at')::timestamptz;

  SELECT COALESCE(SUM(quantity), 0) INTO q FROM user_tokens WHERE profile_id = u1 AND token_type = 'dharma' AND source_id = l1::text;
  SELECT count(*) INTO n FROM user_tokens WHERE profile_id = u1 AND source_type = 'lesson' AND source_id = l1::text AND token_type <> 'dharma';
  rep := rep || CASE WHEN q = 20 AND n = 1 THEN E'PASS L7: trigger awarded 20 dharma + 1 lesson token\n' ELSE 'FAIL L7: dharma=' || q || ' lesson tokens=' || n || E'\n' END;

  j := public.complete_lesson(l1);
  t2 := (j->>'completed_at')::timestamptz;
  SELECT count(*) INTO n FROM lesson_completions WHERE profile_id = u1 AND lesson_id = l1;
  SELECT COALESCE(SUM(quantity), 0) INTO q FROM user_tokens WHERE profile_id = u1 AND token_type = 'dharma';
  rep := rep || CASE WHEN (j->>'already_completed')::boolean AND n = 1 AND q = 20 AND t1 = t2
    THEN E'PASS L8: replay changes nothing (one row, same date, no extra dharma)\n' ELSE 'FAIL L8: rows=' || n || ' dharma=' || q || ' ' || j::text || E'\n' END;

  BEGIN
    UPDATE lesson_completions SET points_earned = 1000 WHERE profile_id = u1;
    GET DIAGNOSTICS n = ROW_COUNT;
    rep := rep || CASE WHEN n = 0 THEN E'PASS L9: direct UPDATE affects 0 rows\n' ELSE E'FAIL L9: client rewrote points_earned\n' END;
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS L9: direct UPDATE blocked (' || SQLERRM || E')\n'; END;

  j := public.complete_lesson(l2);     -- finishes the module → module token as before
  SELECT count(*) INTO n FROM user_tokens WHERE profile_id = u1 AND source_type = 'module' AND source_id = mid::text;
  rep := rep || CASE WHEN n = 1 THEN E'PASS L10: module token still awarded when the module is finished\n' ELSE 'FAIL L10: module tokens=' || n || E'\n' END;

  SELECT count(*) INTO n FROM lesson_completions WHERE profile_id = u1;
  rep := rep || CASE WHEN n = 2 THEN E'PASS L11: learner can still read own completions\n' ELSE 'FAIL L11: learner sees ' || n || E' rows\n' END;

  BEGIN j := public.complete_lesson(gen_random_uuid()); rep := rep || E'FAIL L12: accepted an unknown lesson\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS L12: unknown lesson rejected (' || SQLERRM || E')\n'; END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  BEGIN j := public.complete_lesson(l1); rep := rep || E'FAIL L13: guest (anonymous sign-in) accepted\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS L13: guest rejected (' || SQLERRM || E')\n'; END;

  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN j := public.complete_lesson(l1); rep := rep || E'FAIL L14: answered without a signed-in user\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS L14: no uid → rejected (' || SQLERRM || E')\n'; END;

  RESET role;
  RAISE EXCEPTION '%', rep || E'══ END OF REPORT — the ERROR wrapper is intentional (it rolls everything back) ══';
END $$;
