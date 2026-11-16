-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · MAP PROGRESS-CARD TESTS (get_map_card) — same convention as map_state_tests.sql
-- HOW TO RUN: paste into Supabase SQL Editor → Run. It builds its OWN throw-away data (prefixed 'MCT'),
-- then rolls everything back; the report arrives as an intentional "ERROR". Every line must start PASS.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  rep text := E'\n══ MAP CARD TEST REPORT (all changes rolled back) ══\n';
  n int; j jsonb;
  u1 uuid := '71111111-1111-1111-1111-111111111111'; u2 uuid := '72222222-2222-2222-2222-222222222222';
  cA uuid := 'c1000000-0000-0000-0000-00000000000a'; cB uuid := 'c1000000-0000-0000-0000-00000000000b';
  cC uuid := 'c1000000-0000-0000-0000-00000000000c'; cD uuid := 'c1000000-0000-0000-0000-00000000000d';
  ls uuid[]; l uuid; i int; k int; sid uuid; mid uuid;
BEGIN
  -- ── throw-away data: A = 4 lessons x 3 snippets (u1 finished 3), B = 2 x 3 (finished 1), C = 2 x 3 (0), D = 1 x 3 (finished) ──
  INSERT INTO languages (language_id, language_code, language) VALUES ('LANG_03', 'mct', 'MCT lang') ON CONFLICT DO NOTHING;
  INSERT INTO auth.users (id) VALUES (u1), (u2);
  INSERT INTO profiles (id, display_name) VALUES (u1, 'MCT one'), (u2, 'MCT two') ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  INSERT INTO levels (level_id, level_number, title) VALUES ('MCTL', 99, 'MCT') ON CONFLICT DO NOTHING;
  INSERT INTO courses (course_id, course_name) VALUES (cA, 'MCT Course A'), (cB, 'MCT Course B'), (cC, 'MCT Course C'), (cD, 'MCT Course D');
  ls := ARRAY[]::uuid[];
  FOR k IN 1..4 LOOP
    mid := gen_random_uuid();
    INSERT INTO modules (module_id, module_name, level_id, course_id) VALUES (mid, 'MCT M' || k, 'MCTL',
      (ARRAY[cA, cA, cB, cC])[k]);
    FOR i IN 1..(CASE k WHEN 1 THEN 2 WHEN 2 THEN 2 WHEN 3 THEN 2 ELSE 2 END) LOOP
      l := gen_random_uuid(); ls := ls || l;
      INSERT INTO lessons (lesson_id, module_id, lesson_name) VALUES (l, mid, 'MCT lesson ' || k || '.' || i);
      FOR n IN 1..3 LOOP
        sid := gen_random_uuid();
        INSERT INTO snippet_core (snippet_id, snippet_value, status) VALUES (sid, 10, 'PUBLISHED');
        INSERT INTO snippet_translations (snippet_id, language, hook) VALUES (sid, 'LANG_03', 'h');
        INSERT INTO lesson_snippet_mapping (lesson_id, snippet_id, order_index) VALUES (l, sid, n);
      END LOOP;
    END LOOP;
  END LOOP;
  -- lessons: ls[1..2] module1(A), ls[3..4] module2(A), ls[5..6] module3(B), ls[7..8] module4(C)
  -- course D: one extra module + lesson
  mid := gen_random_uuid(); INSERT INTO modules (module_id, module_name, level_id, course_id) VALUES (mid, 'MCT MD', 'MCTL', cD);
  l := gen_random_uuid(); ls := ls || l; INSERT INTO lessons (lesson_id, module_id, lesson_name) VALUES (l, mid, 'MCT lesson D');
  FOR n IN 1..3 LOOP sid := gen_random_uuid(); INSERT INTO snippet_core (snippet_id, snippet_value, status) VALUES (sid, 10, 'PUBLISHED');
    INSERT INTO snippet_translations (snippet_id, language, hook) VALUES (sid, 'LANG_03', 'h');
    INSERT INTO lesson_snippet_mapping (lesson_id, snippet_id, order_index) VALUES (l, sid, n); END LOOP;
  -- A has 4 lessons (12 snippets) → we made A modules 1,2 with 2 lessons each; B=2 lessons, C=2 lessons, D=1 lesson.
  -- u1 completes 3 of A's lessons (30 pts each), 1 of B's, all of D
  ALTER TABLE lesson_completions DISABLE TRIGGER USER;    -- keep the test independent of award rules
  INSERT INTO lesson_completions (profile_id, lesson_id, course_id, points_earned, snippet_count) VALUES
    (u1, ls[1], cA, 30, 3), (u1, ls[2], cA, 30, 3), (u1, ls[3], cA, 30, 3), (u1, ls[5], cB, 30, 3), (u1, ls[9], cD, 30, 3);
  ALTER TABLE lesson_completions ENABLE TRIGGER USER;
  INSERT INTO user_tokens (profile_id, token_type, quantity, source_type, source_id) SELECT u1, 'dharma', 30, 'lesson', x::text FROM unnest(ARRAY[ls[1], ls[2], ls[3], ls[5], ls[9]]) x;
  INSERT INTO lesson_views (profile_id, lesson_id, viewed_at, last_seen_at) VALUES
    (u1, ls[3], now() - interval '3 day', now() - interval '3 day'), (u1, ls[6], now() - interval '1 hour', now() - interval '1 hour');

  -- ═══ structure ═══
  rep := rep || CASE WHEN has_function_privilege('anon', 'public.get_map_card(uuid)', 'EXECUTE') THEN E'FAIL C1: anon can execute get_map_card\n' ELSE E'PASS C1: not executable by anon\n' END;
  rep := rep || CASE WHEN has_function_privilege('authenticated', 'public.get_map_card(uuid)', 'EXECUTE') THEN E'PASS C2: signed-in users can execute\n' ELSE E'FAIL C2: authenticated cannot execute\n' END;
  SELECT count(*) INTO n FROM pg_proc p WHERE p.proname = 'get_map_card' AND p.prosecdef;
  rep := rep || CASE WHEN n = 0 THEN E'PASS C3: SECURITY INVOKER\n' ELSE E'FAIL C3: SECURITY DEFINER\n' END;
  SELECT count(*) INTO n FROM pg_proc p, unnest(p.proargnames) a WHERE p.proname = 'get_map_card' AND (a ILIKE '%user%' OR a ILIKE '%profile%');
  rep := rep || CASE WHEN n = 0 THEN E'PASS C4: no user-id parameter\n' ELSE E'FAIL C4: takes a user/profile parameter\n' END;

  -- ═══ behaviour as learner one ═══
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
  j := public.get_map_card();
  rep := rep || CASE WHEN j->'lastViewed'->>'title' = 'MCT lesson 3.2' AND j->'lastViewed'->>'kind' = 'lesson' THEN E'PASS C5: last viewed = most recent lesson\n' ELSE 'FAIL C5: ' || COALESCE(j->>'lastViewed', 'null') || E'\n' END;
  rep := rep || CASE WHEN j->'course'->>'courseId' = cB::text AND (j->'course'->>'percent')::numeric = 50.0 THEN E'PASS C6: course = course of last view, 50% (3 of 6 snippets)\n' ELSE 'FAIL C6: ' || COALESCE(j->>'course', 'null') || E'\n' END;
  rep := rep || CASE WHEN j->'nextBanyan'->>'courseId' = cA::text AND (j->'nextBanyan'->>'storiesToGo')::int = 3 AND (j->'nextBanyan'->>'percent')::numeric = 75.0
    THEN E'PASS C7: next banyan = closest ≥50% course (A: 75%, 3 stories); D is done, C is <50%\n' ELSE 'FAIL C7: ' || COALESCE(j->>'nextBanyan', 'null') || E'\n' END;
  rep := rep || CASE WHEN (j->'nextUnlock'->>'thresholdPercent')::int = 60 AND (j->'nextUnlock'->>'storiesToGo')::int = 2
    THEN E'PASS C8: next unlock 60%, 2 stories (12 seeds needed ÷ 10 per story, rounded up)\n' ELSE 'FAIL C8: ' || COALESCE(j->>'nextUnlock', 'null') || E'\n' END;

  j := public.get_map_card(cA);
  rep := rep || CASE WHEN j->>'scope' = 'course' AND j->'course'->>'courseId' = cA::text AND j->'lastViewed'->>'title' = 'MCT lesson 2.1'
    THEN E'PASS C9: course scope keeps only that course''s items\n' ELSE 'FAIL C9: ' || j::text || E'\n' END;
  rep := rep || CASE WHEN j->'nextBanyan'->>'courseId' = cA::text AND (j->'nextUnlock'->>'thresholdPercent')::int = 80 AND (j->'nextUnlock'->>'storiesToGo')::int = 1
    THEN E'PASS C10: scoped: banyan goal is the course itself; next unlock 80% in 1 story\n' ELSE 'FAIL C10: ' || j::text || E'\n' END;

  -- quiz newer than the lesson view wins, and brings its own course
  RESET role;
  INSERT INTO quiz_sets (quiz_id, title, course_id, is_published) VALUES ('MCTQ1', 'MCT quiz C', cC, true);
  INSERT INTO quiz_attempts (profile_id, quiz_id, started_at) VALUES (u1, 'MCTQ1', now());
  PERFORM set_config('role', 'authenticated', true);
  j := public.get_map_card();
  rep := rep || CASE WHEN j->'lastViewed'->>'kind' = 'quiz' AND j->'course'->>'courseId' = cC::text THEN E'PASS C11: a newer quiz attempt becomes "last viewed" (course C)\n' ELSE 'FAIL C11: ' || COALESCE(j->>'lastViewed', 'null') || E'\n' END;

  -- a banyan already earned removes the course from the goal
  RESET role;
  INSERT INTO user_tokens (profile_id, token_type, quantity, source_type, source_id) VALUES (u1, 'banyan', 1, 'course', cA::text);
  PERFORM set_config('role', 'authenticated', true);
  j := public.get_map_card();
  rep := rep || CASE WHEN j->'nextBanyan'->>'courseId' = cB::text THEN E'PASS C12: a course that already has its banyan is skipped (next goal = B)\n' ELSE 'FAIL C12: ' || COALESCE(j->>'nextBanyan', 'null') || E'\n' END;

  -- ═══ learner two: no history, no leakage ═══
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  j := public.get_map_card();
  rep := rep || CASE WHEN j->'lastViewed' = 'null'::jsonb AND j->'course' = 'null'::jsonb AND j->'nextBanyan' = 'null'::jsonb
    THEN E'PASS C13: a learner with no history gets no last-viewed / course / banyan (and sees none of learner one''s data)\n' ELSE 'FAIL C13: ' || j::text || E'\n' END;

  -- anonymous rejected
  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN j := public.get_map_card(); rep := rep || E'FAIL C14: answered without a signed-in user\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS C14: no uid → rejected (' || SQLERRM || E')\n'; END;

  RESET role;
  RAISE EXCEPTION '%', rep || E'══ END OF REPORT — the ERROR wrapper is intentional (it rolls everything back) ══';
END $$;
