-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · AUDIT-FIX TESTS for migrations 20261112000300 / 000400 / 000500
-- (editorial access H2 H3 M5 · award rules M3 · comment names and privacy M6 L1 L4)
-- Same convention as map_card_tests.sql.
-- HOW TO RUN: paste into Supabase SQL Editor → Run. It builds its OWN throw-away data (prefixed 'AFT'),
-- then rolls everything back; the report arrives as an intentional "ERROR". Every line must start PASS.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  rep text := E'\n══ AUDIT-FIX TEST REPORT (all changes rolled back) ══\n';
  n int; j jsonb; t text;
  uL uuid := 'a1111111-1111-1111-1111-111111111111';   -- learner
  uC uuid := 'a2222222-2222-2222-2222-222222222222';   -- creator (editor on one draft)
  uA uuid := 'a3333333-3333-3333-3333-333333333333';   -- admin
  uH uuid := 'a4444444-4444-4444-4444-444444444444';   -- learner hidden from the leaderboard
  cA uuid := 'ca000000-0000-0000-0000-00000000000a'; cB uuid := 'ca000000-0000-0000-0000-00000000000b';
  mA uuid := gen_random_uuid(); mB uuid := gen_random_uuid(); lA uuid := gen_random_uuid(); lB uuid := gen_random_uuid();
  sid uuid := gen_random_uuid(); did uuid := gen_random_uuid();
  r_creator text; r_admin text;
BEGIN
  -- ── throw-away data ──
  INSERT INTO languages (language_id, language_code, language) VALUES ('LANG_03', 'aft', 'AFT lang') ON CONFLICT DO NOTHING;
  INSERT INTO auth.users (id) VALUES (uL), (uC), (uA), (uH);
  INSERT INTO profiles (id, display_name) VALUES (uL, 'AFT Learner'), (uC, 'AFT Creator'), (uA, 'AFT Admin'), (uH, 'AFT Hidden')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  UPDATE profiles SET leaderboard_visible = false WHERE id = uH;
  SELECT role_id INTO r_creator FROM roles WHERE lower(role_name) = 'creator' LIMIT 1;
  IF r_creator IS NULL THEN r_creator := 'AFT_CREATOR'; INSERT INTO roles (role_id, role_name) VALUES (r_creator, 'creator'); END IF;
  SELECT role_id INTO r_admin FROM roles WHERE lower(role_name) = 'admin' LIMIT 1;
  IF r_admin IS NULL THEN r_admin := 'AFT_ADMIN'; INSERT INTO roles (role_id, role_name) VALUES (r_admin, 'admin'); END IF;
  DELETE FROM user_roles_mapping WHERE profile_id IN (uL, uC, uA, uH);     -- start from known roles
  INSERT INTO user_roles_mapping (profile_id, role_id) VALUES (uC, r_creator), (uA, r_admin);
  INSERT INTO levels (level_id, level_number, title) VALUES ('AFTL', 96, 'AFT') ON CONFLICT DO NOTHING;
  -- two courses that share one level; one lesson each, one 10-point story each
  INSERT INTO courses (course_id, course_name) VALUES (cA, 'AFT Course A'), (cB, 'AFT Course B');
  INSERT INTO modules (module_id, module_name, level_id, course_id) VALUES (mA, 'AFT MA', 'AFTL', cA), (mB, 'AFT MB', 'AFTL', cB);
  INSERT INTO lessons (lesson_id, module_id, lesson_name) VALUES (lA, mA, 'AFT lesson A'), (lB, mB, 'AFT lesson B');
  INSERT INTO snippet_core (snippet_id, snippet_value, status) VALUES (sid, 10, 'PUBLISHED');
  INSERT INTO snippet_translations (snippet_id, language, hook) VALUES (sid, 'LANG_03', 'h');
  INSERT INTO lesson_snippet_mapping (lesson_id, snippet_id, order_index) VALUES (lA, sid, 1), (lB, sid, 1);
  INSERT INTO content_drafts (id, content_type, content_id, language_id, status, assigned_to, assigned_by, notes)
    VALUES (did, 'lesson', lA::text, 'LANG_03', 'in_draft', uC, uA, 'AFT internal note');
  INSERT INTO user_tokens (profile_id, token_type, quantity, source_type, source_id) VALUES (uH, 'tulsi', 1, 'lesson', 'AFT');

  -- ═══ structure ═══
  rep := rep || CASE WHEN has_function_privilege('anon', 'public.get_all_drafts()', 'EXECUTE') OR has_function_privilege('anon', 'public.get_editorial_staff()', 'EXECUTE')
                       OR has_function_privilege('anon', 'public.get_review_queue()', 'EXECUTE')
    THEN E'FAIL E1: anonymous visitors can still call the workspace listings\n' ELSE E'PASS E1: workspace listings closed to anonymous visitors\n' END;
  rep := rep || CASE WHEN has_function_privilege('anon', 'public.submit_quiz_attempt(text,jsonb)', 'EXECUTE') OR has_function_privilege('anon', 'public.publish_draft(uuid)', 'EXECUTE')
                       OR has_function_privilege('anon', 'public.admin_get_users()', 'EXECUTE')
    THEN E'FAIL E2: sign-in-only functions still executable by anon\n' ELSE E'PASS E2: sign-in-only functions closed to anon\n' END;
  rep := rep || CASE WHEN has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') AND has_function_privilege('anon', 'public.get_quiz_questions_secure(text)', 'EXECUTE')
    THEN E'PASS E3: functions guests and policies rely on are still open\n' ELSE E'FAIL E3: a function needed by guests/policies was closed\n' END;

  -- ═══ as the LEARNER ═══
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uL, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO n FROM public.get_all_drafts();
  rep := rep || CASE WHEN n = 0 THEN E'PASS E4: learner sees no drafts\n' ELSE 'FAIL E4: learner sees ' || n || E' drafts\n' END;
  SELECT (SELECT count(*) FROM public.get_editorial_staff()) + (SELECT count(*) FROM public.get_review_queue()) INTO n;
  rep := rep || CASE WHEN n = 0 THEN E'PASS E5: learner sees no staff list and no review queue\n' ELSE 'FAIL E5: learner sees ' || n || E' rows\n' END;
  BEGIN PERFORM public.refresh_course_counts(); rep := rep || E'FAIL E6: learner ran refresh_course_counts\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS E6: refresh_course_counts refused for learners (' || SQLERRM || E')\n'; END;

  -- M6: the name on a comment comes from the profile, not from the browser
  INSERT INTO snippet_comments (snippet_id, profile_id, user_name, body) VALUES (sid, uL, 'IndiYatra Team', 'AFT comment');
  SELECT user_name INTO t FROM snippet_comments WHERE profile_id = uL AND body = 'AFT comment';
  rep := rep || CASE WHEN t = 'AFT Learner' THEN E'PASS C1: comment name taken from the profile\n' ELSE 'FAIL C1: comment stored as "' || COALESCE(t, 'null') || E'"\n' END;
  UPDATE snippet_comments SET user_name = 'Admin' WHERE profile_id = uL AND body = 'AFT comment';
  SELECT user_name INTO t FROM snippet_comments WHERE profile_id = uL AND body = 'AFT comment';
  rep := rep || CASE WHEN t = 'AFT Learner' THEN E'PASS C2: comment name cannot be edited afterwards\n' ELSE 'FAIL C2: comment renamed to "' || COALESCE(t, 'null') || E'"\n' END;

  -- L1: passing someone else's id changes nothing
  SELECT count(*) INTO n FROM public.get_leaderboard(NULL, uH) WHERE profile_id = uH OR is_current_user;
  rep := rep || CASE WHEN n = 0 THEN E'PASS C3: a hidden user cannot be revealed on the leaderboard by passing their id\n' ELSE E'FAIL C3: leaderboard acted on a foreign profile id\n' END;
  BEGIN PERFORM * FROM public.get_recommendations(uH, 5); rep := rep || E'PASS C4: get_recommendations still answers (for the caller only)\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'FAIL C4: get_recommendations broke (' || SQLERRM || E')\n'; END;

  -- M3: finishing ALL of course A earns the course token although course B (same level) is untouched
  j := public.complete_lesson(lA);
  SELECT count(*) INTO n FROM user_tokens WHERE profile_id = uL AND source_type = 'course' AND source_id = cA::text;
  rep := rep || CASE WHEN n = 1 THEN E'PASS A1: course token awarded on finishing the course\n' ELSE 'FAIL A1: course tokens=' || n || E'\n' END;
  SELECT count(*) INTO n FROM user_tokens WHERE profile_id = uL AND source_type = 'level' AND source_id = 'AFTL';
  rep := rep || CASE WHEN n = 1 THEN E'PASS A2: level token awarded for the level within this course\n' ELSE 'FAIL A2: level tokens=' || n || E'\n' END;
  SELECT count(*) INTO n FROM user_tokens WHERE profile_id = uL AND source_type = 'course' AND source_id = cB::text;
  rep := rep || CASE WHEN n = 0 THEN E'PASS A3: no token for the course not finished\n' ELSE E'FAIL A3: token awarded for an unfinished course\n' END;

  -- ═══ as the CREATOR (assigned editor of the draft, not a supervisor) ═══
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uC, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO content_role_assignments (profile_id, content_type, content_id, language_id, sub_role, assigned_by)
      VALUES (uC, 'lesson', lA::text, 'LANG_03', 'supervisor', uC);
    rep := rep || E'FAIL E7: a creator made themselves supervisor\n';
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS E7: creator cannot grant themselves supervisor (' || SQLERRM || E')\n'; END;
  SELECT count(*) INTO n FROM public.get_all_drafts() WHERE id = did;
  rep := rep || CASE WHEN n = 1 THEN E'PASS E8: workspace member still sees the drafts list\n' ELSE E'FAIL E8: workspace member lost the drafts list\n' END;
  BEGIN
    UPDATE content_drafts SET status = 'approved' WHERE id = did;
    GET DIAGNOSTICS n = ROW_COUNT;
    rep := rep || CASE WHEN n = 0 THEN E'PASS E9: editor cannot approve own draft (0 rows)\n' ELSE E'FAIL E9: editor approved their own draft\n' END;
  EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS E9: editor cannot approve own draft (' || SQLERRM || E')\n'; END;
  BEGIN
    UPDATE content_drafts SET status = 'submitted', draft_data = '{"a":1}'::jsonb WHERE id = did;
    GET DIAGNOSTICS n = ROW_COUNT;
    rep := rep || CASE WHEN n = 1 THEN E'PASS E10: editor can still save and submit\n' ELSE E'FAIL E10: editor could not submit their draft\n' END;
  EXCEPTION WHEN OTHERS THEN rep := rep || 'FAIL E10: editor could not submit (' || SQLERRM || E')\n'; END;

  -- ═══ as the ADMIN ═══
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uA, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO content_role_assignments (profile_id, content_type, content_id, language_id, sub_role, assigned_by)
      VALUES (uC, 'lesson', lA::text, 'LANG_03', 'verifier', uA);
    UPDATE content_drafts SET status = 'approved' WHERE id = did;
    GET DIAGNOSTICS n = ROW_COUNT;
    rep := rep || CASE WHEN n = 1 THEN E'PASS E11: admin can assign roles and approve\n' ELSE E'FAIL E11: admin could not approve\n' END;
  EXCEPTION WHEN OTHERS THEN rep := rep || 'FAIL E11: admin blocked (' || SQLERRM || E')\n'; END;

  RESET role;
  RAISE EXCEPTION '%', rep || E'══ END OF REPORT — the ERROR wrapper is intentional (it rolls everything back) ══';
END $$;
