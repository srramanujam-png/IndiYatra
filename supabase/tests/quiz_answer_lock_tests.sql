-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · QUIZ ANSWER-LOCK TESTS (answer_quiz_question / submit_quiz_attempt / get_quiz_ranks, audit fix H4)
-- Same convention as map_card_tests.sql.
-- HOW TO RUN: paste into Supabase SQL Editor → Run. It builds its OWN throw-away data (prefixed 'QLT'),
-- then rolls everything back; the report arrives as an intentional "ERROR". Every line must start PASS.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  rep text := E'\n══ QUIZ ANSWER-LOCK TEST REPORT (all changes rolled back) ══\n';
  n int; j jsonb; r record;
  u1 uuid := '91111111-1111-1111-1111-111111111111'; u2 uuid := '92222222-2222-2222-2222-222222222222';
  cA uuid := 'c9000000-0000-0000-0000-00000000000a';
  mid uuid := gen_random_uuid(); les uuid := gen_random_uuid();
  q1 uuid := gen_random_uuid(); q2 uuid := gen_random_uuid(); q3 uuid := gen_random_uuid(); qx uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid();
  qz text := 'QLT_QUIZ'; qz2 text := 'QLT_QUIZ_ONE_TRY';
BEGIN
  -- ── throw-away data: one published quiz of 3 one-point questions (correct option is always 'right') ──
  INSERT INTO languages (language_id, language_code, language) VALUES ('LANG_03', 'qlt', 'QLT lang') ON CONFLICT DO NOTHING;
  INSERT INTO auth.users (id) VALUES (u1), (u2);
  INSERT INTO profiles (id, display_name) VALUES (u1, 'QLT one'), (u2, 'QLT two') ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  INSERT INTO levels (level_id, level_number, title) VALUES ('QLTL', 97, 'QLT') ON CONFLICT DO NOTHING;
  INSERT INTO courses (course_id, course_name) VALUES (cA, 'QLT Course A');
  INSERT INTO modules (module_id, module_name, level_id, course_id) VALUES (mid, 'QLT M1', 'QLTL', cA);
  INSERT INTO lessons (lesson_id, module_id, lesson_name) VALUES (les, mid, 'QLT lesson');
  INSERT INTO standalone_questions (question_id, language, question, correct_option, wrong_option_1, wrong_option_2, wrong_option_3, question_key) VALUES
    (q1, 'LANG_03', 'QLT q1', 'right', 'w1', 'w2', 'w3', 990001),
    (q2, 'LANG_03', 'QLT q2', 'right', 'w1', 'w2', 'w3', 990002),
    (q3, 'LANG_03', 'QLT q3', 'right', 'w1', 'w2', 'w3', 990003),
    (qx, 'LANG_03', 'QLT not in quiz', 'right', 'w1', 'w2', 'w3', 990009);
  INSERT INTO quiz_sets (quiz_id, title, lesson_id, is_published) VALUES (qz, 'QLT quiz', les, true);
  INSERT INTO quiz_sets (quiz_id, title, is_published, max_attempts) VALUES (qz2, 'QLT one try', true, 1);
  INSERT INTO quiz_questions (id, quiz_id, question_type, question_key, points, sort_order) VALUES
    (r1, qz, 'standalone', 990001, 1, 1), (r2, qz, 'standalone', 990002, 1, 2), (r3, qz, 'standalone', 990003, 1, 3),
    (gen_random_uuid(), qz2, 'standalone', 990001, 1, 1);

  -- ═══ structure ═══
  rep := rep || CASE WHEN has_function_privilege('anon', 'public.answer_quiz_question(text,text,uuid,text)', 'EXECUTE') THEN E'FAIL Q1: anon can execute answer_quiz_question\n' ELSE E'PASS Q1: answer check not executable by anon\n' END;
  rep := rep || CASE WHEN has_function_privilege('anon', 'public.grade_quiz_answer(text,uuid,text)', 'EXECUTE')
                       OR has_function_privilege('authenticated', 'public.grade_quiz_answer(text,uuid,text)', 'EXECUTE')
    THEN E'FAIL Q2: old grade_quiz_answer still open to clients\n' ELSE E'PASS Q2: old grade_quiz_answer closed to clients\n' END;
  rep := rep || CASE WHEN has_table_privilege('authenticated', 'public.quiz_answer_log', 'SELECT') OR has_table_privilege('anon', 'public.quiz_answer_log', 'SELECT')
    THEN E'FAIL Q3: clients can read quiz_answer_log\n' ELSE E'PASS Q3: quiz_answer_log not readable by clients\n' END;

  -- ═══ behaviour, as signed-in learner u1 ═══
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  SELECT * INTO r FROM public.answer_quiz_question(qz, 'standalone', q1, 'w1');
  rep := rep || CASE WHEN r.is_correct = false AND r.correct_option = 'right' AND r.chosen_option = 'w1' AND NOT r.already_answered
    THEN E'PASS Q4: first answer graded and recorded\n' ELSE 'FAIL Q4: ' || row_to_json(r)::text || E'\n' END;

  SELECT * INTO r FROM public.answer_quiz_question(qz, 'standalone', q1, 'right');
  rep := rep || CASE WHEN r.is_correct = false AND r.chosen_option = 'w1' AND r.already_answered
    THEN E'PASS Q5: second answer to the same question is ignored (first one stays)\n' ELSE 'FAIL Q5: ' || row_to_json(r)::text || E'\n' END;

  -- run 1: browser claims q1 = right (it was locked wrong), q2 = right, leaves q3 out
  j := public.submit_quiz_attempt(qz, jsonb_build_array(
         jsonb_build_object('ref_id', r1, 'question_id', q1, 'question_type', 'standalone', 'chosen_option', 'right'),
         jsonb_build_object('ref_id', r2, 'question_id', q2, 'question_type', 'standalone', 'chosen_option', 'right')));
  rep := rep || CASE WHEN (j->>'score')::int = 1 AND (j->>'max_score')::int = 3
    THEN E'PASS Q6: locked answer beats the submitted one; missing question counts in the maximum (1/3)\n' ELSE 'FAIL Q6: ' || (j - 'answers')::text || E'\n' END;

  -- run 2 (retake): locks are released; a question opened but left out of the submission still counts
  SELECT * INTO r FROM public.answer_quiz_question(qz, 'standalone', q1, 'right');
  rep := rep || CASE WHEN r.is_correct AND NOT r.already_answered THEN E'PASS Q7: retake starts with nothing locked\n' ELSE 'FAIL Q7: ' || row_to_json(r)::text || E'\n' END;
  SELECT * INTO r FROM public.answer_quiz_question(qz, 'standalone', q2, 'w2');
  SELECT * INTO r FROM public.answer_quiz_question(qz, 'standalone', q3, NULL);
  rep := rep || CASE WHEN r.is_correct IS NULL AND r.correct_option = 'right' AND r.chosen_option IS NULL THEN E'PASS Q8: skip / time-out reveals the answer and is recorded as a skip\n' ELSE 'FAIL Q8: ' || row_to_json(r)::text || E'\n' END;
  j := public.submit_quiz_attempt(qz, jsonb_build_array(
         jsonb_build_object('ref_id', r1, 'question_id', q1, 'question_type', 'standalone', 'chosen_option', 'right'),
         jsonb_build_object('ref_id', r3, 'question_id', q3, 'question_type', 'standalone', 'chosen_option', 'right')));
  rep := rep || CASE WHEN (j->>'score')::int = 1 AND (j->>'max_score')::int = 3
    THEN E'PASS Q9: leaving out a wrong answer, or answering after a skip, does not raise the score (1/3)\n' ELSE 'FAIL Q9: ' || (j - 'answers')::text || E'\n' END;

  -- run 3: an honest perfect run
  j := public.submit_quiz_attempt(qz, jsonb_build_array(
         jsonb_build_object('ref_id', r1, 'question_id', q1, 'question_type', 'standalone', 'chosen_option', 'right'),
         jsonb_build_object('ref_id', r2, 'question_id', q2, 'question_type', 'standalone', 'chosen_option', 'right'),
         jsonb_build_object('ref_id', r3, 'question_id', q3, 'question_type', 'standalone', 'chosen_option', 'right')));
  rep := rep || CASE WHEN (j->>'score')::int = 3 AND (j->>'max_score')::int = 3 THEN E'PASS Q10: full correct run scores 3/3\n' ELSE 'FAIL Q10: ' || (j - 'answers')::text || E'\n' END;

  BEGIN PERFORM * FROM public.answer_quiz_question(qz, 'standalone', qx, 'right'); rep := rep || E'FAIL Q11: answered a question that is not in the quiz\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS Q11: question outside the quiz rejected (' || SQLERRM || E')\n'; END;

  -- attempt limit: one try allowed, then no more answer checks
  SELECT * INTO r FROM public.answer_quiz_question(qz2, 'standalone', q1, 'w1');
  j := public.submit_quiz_attempt(qz2, '[]'::jsonb);
  rep := rep || CASE WHEN (j->>'score')::int = 0 AND (j->>'max_score')::int = 1 THEN E'PASS Q12: empty submission still counts the opened question (0/1)\n' ELSE 'FAIL Q12: ' || (j - 'answers')::text || E'\n' END;
  BEGIN PERFORM * FROM public.answer_quiz_question(qz2, 'standalone', q1, 'right'); rep := rep || E'FAIL Q13: answer check allowed after the attempt limit\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS Q13: no answer checks after the attempt limit (' || SQLERRM || E')\n'; END;

  -- ═══ ranks: u2 scores 2/3 on a first attempt; u1's FIRST attempt was 1/3 (later 3/3 must not count) ═══
  RESET role;
  UPDATE quiz_attempts SET completed_at = now() - interval '3 hour'
    WHERE profile_id = u1 AND quiz_id = qz AND score = 3;                       -- the perfect run is the LATEST
  UPDATE quiz_attempts SET completed_at = now() - interval '5 hour' WHERE profile_id = u1 AND quiz_id = qz AND score = 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
  j := public.submit_quiz_attempt(qz, jsonb_build_array(
         jsonb_build_object('ref_id', r1, 'question_id', q1, 'question_type', 'standalone', 'chosen_option', 'right'),
         jsonb_build_object('ref_id', r2, 'question_id', q2, 'question_type', 'standalone', 'chosen_option', 'right'),
         jsonb_build_object('ref_id', r3, 'question_id', q3, 'question_type', 'standalone', 'chosen_option', 'w1')));
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  SELECT user_rank, total_users INTO r FROM public.get_quiz_ranks(u1) WHERE scope_type = 'course' AND scope_id = cA::text;
  rep := rep || CASE WHEN r.user_rank = 2 AND r.total_users = 2 THEN E'PASS Q14: rank uses the first attempt (u1 is 2nd of 2 despite a later 3/3)\n'
                     ELSE 'FAIL Q14: rank ' || COALESCE(r.user_rank::text, 'null') || ' of ' || COALESCE(r.total_users::text, 'null') || E'\n' END;

  -- ═══ who may not check answers ═══
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  BEGIN PERFORM * FROM public.answer_quiz_question(qz, 'standalone', q1, 'right'); rep := rep || E'FAIL Q15: guest (anonymous sign-in) got an answer\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS Q15: guest rejected (' || SQLERRM || E')\n'; END;
  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN PERFORM * FROM public.answer_quiz_question(qz, 'standalone', q1, 'right'); rep := rep || E'FAIL Q16: answered without a signed-in user\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS Q16: no uid → rejected (' || SQLERRM || E')\n'; END;
  BEGIN PERFORM * FROM public.grade_quiz_answer('standalone', q1, NULL); rep := rep || E'FAIL Q17: old answer look-up still works for clients\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS Q17: old answer look-up refused (' || SQLERRM || E')\n'; END;

  RESET role;
  RAISE EXCEPTION '%', rep || E'══ END OF REPORT — the ERROR wrapper is intentional (it rolls everything back) ══';
END $$;
