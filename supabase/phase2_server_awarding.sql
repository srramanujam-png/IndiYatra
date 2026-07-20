-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · PHASE 2.4 — SERVER-SIDE AWARDING + QUIZ GRADING  (A2 full, A3, A6 residual)
-- Date: 20 July 2026
--
-- HOW TO RUN: copy this ENTIRE file, paste into Supabase Dashboard → SQL Editor
-- → Run. Safe to re-run (idempotent). Nothing here deletes data.
--
-- MUST BE DEPLOYED TOGETHER WITH the matching app commit ("Roadmap 2.4").
-- Old clients will fail to insert tokens/attempts after this runs; the new
-- client stops inserting them and uses the RPCs below instead.
--
-- Covers:
--   §1  Awarding trigger on lesson_completions (tokens + badges, server-side)
--   §2  Revoke client INSERT on user_tokens / user_badges
--   §3  Quiz answers server-side: lock question tables to editorial staff;
--       public pairing view (snippet_question_map)
--   §4  get_quiz_questions_secure() — questions without answer labels
--   §5  grade_quiz_answer() — per-question instant feedback
--   §6  submit_quiz_attempt() — server-graded attempts; revoke client INSERT
--   §7  get_quiz_ranks tightened to auth.uid() (last SECURITY DEFINER residual)
--   §8  lesson_completions: replace the ALL policy (1.2 stopgap adjustment)
--   §9  Notes on retained 1.2 stopgap constraints
-- ─────────────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════════════
-- §1  AWARDING TRIGGER (A2 full)
-- Mirrors the old client logic in src/lib/awards.js, now enforced in the DB:
--   dharma  quantity = points_earned (capped 1000)   per lesson
--   tulsi   1 per lesson · ashoka 1 per module · lotus 1 per theme(level)
--   peepal  1 per level  · banyan 1 per course
--   BADGE_P02 first module · BADGE_P05 first course · BADGE_S02 7-day streak
-- Token types come from tokens.earn_trigger (fallback to the defaults above).
-- Dedupe: one award per (profile, token_type, source) — re-completions are
-- UPDATEs (upsert) and never re-fire the AFTER INSERT trigger anyway.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_award_token(
  p_profile uuid, p_type text, p_qty int, p_source_type text, p_source_id text
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO user_tokens (profile_id, token_type, quantity, source_type, source_id)
  SELECT p_profile, p_type, p_qty, p_source_type, p_source_id
  WHERE NOT EXISTS (
    SELECT 1 FROM user_tokens ut
    WHERE ut.profile_id = p_profile AND ut.token_type = p_type
      AND ut.source_type = p_source_type
      AND ut.source_id IS NOT DISTINCT FROM p_source_id
  );
$$;

CREATE OR REPLACE FUNCTION fn_award_badge(p_profile uuid, p_badge text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO user_badges (profile_id, badge_id)
  SELECT p_profile, b.badge_id FROM badges b
  WHERE b.badge_id = p_badge AND b.is_active
  ON CONFLICT (profile_id, badge_id) DO NOTHING;
$$;

-- Internal helpers — not callable from the API.
REVOKE ALL ON FUNCTION fn_award_token(uuid, text, int, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fn_award_badge(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION fn_award_on_lesson_completion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_module_id  uuid;
  v_theme_id   uuid;
  v_level_id   text;
  v_course_id  uuid;
  v_map        jsonb;
  v_streak     int := 0;
BEGIN
  -- Token map from the catalogue (earn_trigger → token_type), with defaults.
  SELECT COALESCE(jsonb_object_agg(t.earn_trigger, t.token_type), '{}'::jsonb)
    INTO v_map
  FROM tokens t
  WHERE t.is_active AND t.earn_trigger IS NOT NULL AND t.earn_trigger <> 'points';

  -- Already awarded for this lesson? (guards legacy duplicate paths)
  IF EXISTS (
    SELECT 1 FROM user_tokens ut
    WHERE ut.profile_id = NEW.profile_id
      AND ut.token_type  = COALESCE(v_map->>'lesson', 'tulsi')
      AND ut.source_id   = NEW.lesson_id::text
  ) THEN
    RETURN NEW;
  END IF;

  -- Dharma seeds: quantity = points earned this lesson (cap matches ut_quantity_sane)
  IF COALESCE(NEW.points_earned, 0) > 0 THEN
    PERFORM fn_award_token(NEW.profile_id, 'dharma',
                           LEAST(NEW.points_earned, 1000), 'lesson', NEW.lesson_id::text);
  END IF;

  -- Lesson token
  PERFORM fn_award_token(NEW.profile_id, COALESCE(v_map->>'lesson', 'tulsi'),
                         1, 'lesson', NEW.lesson_id::text);

  -- Hierarchy of the completed lesson
  SELECT l.module_id INTO v_module_id FROM lessons l WHERE l.lesson_id = NEW.lesson_id;
  IF v_module_id IS NOT NULL THEN
    SELECT m.theme_id, m.level_id, m.course_id
      INTO v_theme_id, v_level_id, v_course_id
    FROM modules m WHERE m.module_id = v_module_id;
  END IF;

  -- Module complete? (no lesson of the module missing from this user's completions)
  IF v_module_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.module_id = v_module_id
        AND NOT EXISTS (SELECT 1 FROM lesson_completions lc
                        WHERE lc.profile_id = NEW.profile_id AND lc.lesson_id = l.lesson_id)
  ) THEN
    PERFORM fn_award_token(NEW.profile_id, COALESCE(v_map->>'module', 'ashoka'),
                           1, 'module', v_module_id::text);
    PERFORM fn_award_badge(NEW.profile_id, 'BADGE_P02');   -- Curiosity: first module

    -- Theme complete? (all lessons of modules sharing this level + theme —
    -- same scoping the client used)
    IF v_theme_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM lessons l JOIN modules m ON m.module_id = l.module_id
        WHERE m.level_id = v_level_id AND m.theme_id = v_theme_id
          AND NOT EXISTS (SELECT 1 FROM lesson_completions lc
                          WHERE lc.profile_id = NEW.profile_id AND lc.lesson_id = l.lesson_id)
    ) THEN
      PERFORM fn_award_token(NEW.profile_id, COALESCE(v_map->>'theme', 'lotus'),
                             1, 'theme', v_theme_id::text);

      -- Level complete?
      IF v_level_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM lessons l JOIN modules m ON m.module_id = l.module_id
          WHERE m.level_id = v_level_id
            AND NOT EXISTS (SELECT 1 FROM lesson_completions lc
                            WHERE lc.profile_id = NEW.profile_id AND lc.lesson_id = l.lesson_id)
      ) THEN
        PERFORM fn_award_token(NEW.profile_id, COALESCE(v_map->>'level', 'peepal'),
                               1, 'level', v_level_id);

        -- Course complete?
        IF v_course_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM lessons l JOIN modules m ON m.module_id = l.module_id
            WHERE m.course_id = v_course_id
              AND NOT EXISTS (SELECT 1 FROM lesson_completions lc
                              WHERE lc.profile_id = NEW.profile_id AND lc.lesson_id = l.lesson_id)
        ) THEN
          PERFORM fn_award_token(NEW.profile_id, COALESCE(v_map->>'course', 'banyan'),
                                 1, 'course', v_course_id::text);
          PERFORM fn_award_badge(NEW.profile_id, 'BADGE_P05');   -- Endurance: first course
        END IF;
      END IF;
    END IF;
  END IF;

  -- Persistence badge: 7 consecutive active days ending today (server dates)
  FOR i IN 0..6 LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM lesson_completions lc
      WHERE lc.profile_id = NEW.profile_id
        AND lc.completed_at::date = CURRENT_DATE - i
    );
    v_streak := v_streak + 1;
  END LOOP;
  IF v_streak >= 7 THEN
    PERFORM fn_award_badge(NEW.profile_id, 'BADGE_S02');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION fn_award_on_lesson_completion() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_award_on_lesson_completion ON lesson_completions;
CREATE TRIGGER trg_award_on_lesson_completion
  AFTER INSERT ON lesson_completions
  FOR EACH ROW EXECUTE FUNCTION fn_award_on_lesson_completion();


-- ═════════════════════════════════════════════════════════════════════════════
-- §2  REVOKE CLIENT WRITES ON TOKENS/BADGES
-- Awards now flow only through the §1 trigger (definer-owned, bypasses RLS).
-- Read policies (own rows) are unchanged.
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "user_tokens_own_insert" ON user_tokens;
DROP POLICY IF EXISTS "user_badges_own_insert" ON user_badges;

-- The Admin token/badge manager (adminAwardToken + list/edit/delete in
-- AdminPage) writes these tables directly — allow admins only.
DROP POLICY IF EXISTS "user_tokens_admin_all" ON user_tokens;
CREATE POLICY "user_tokens_admin_all" ON user_tokens
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "user_badges_admin_all" ON user_badges;
CREATE POLICY "user_badges_admin_all" ON user_badges
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ═════════════════════════════════════════════════════════════════════════════
-- §3  QUIZ ANSWERS SERVER-SIDE (A3) — table lockdown
-- Before: snippet_questions / standalone_questions were public-read, shipping
-- correct_option to every client. After: only editorial staff can read the
-- tables; learners get questions via §4 and answers via §5/§6.
-- quiz_questions (the junction) stays public-read — it holds no answers.
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "snippet_questions_public_read" ON snippet_questions;
DROP POLICY IF EXISTS "snippet_questions_staff_read" ON snippet_questions;
CREATE POLICY "snippet_questions_staff_read" ON snippet_questions
  FOR SELECT USING (is_editorial_staff());

DROP POLICY IF EXISTS "standalone_questions_public_read" ON standalone_questions;
DROP POLICY IF EXISTS "standalone_questions_staff_read" ON standalone_questions;
CREATE POLICY "standalone_questions_staff_read" ON standalone_questions
  FOR SELECT USING (is_editorial_staff());

-- Pairing (snippet ↔ question) needs only the key↔snippet mapping. A plain
-- view runs with owner rights, so it deliberately bypasses the RLS above while
-- exposing ONLY these three answer-free columns.
CREATE OR REPLACE VIEW snippet_question_map AS
  SELECT sq.question_key, sq.snippet_id, sq.language
  FROM snippet_questions sq;

GRANT SELECT ON snippet_question_map TO anon, authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- §4  QUESTION DELIVERY RPC — no answer labels
-- Returns every language row for the quiz's question_keys (client picks the
-- best language, as before). Options arrive as a server-shuffled text[] with
-- no marking of which is correct.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_quiz_questions_secure(p_quiz_id text)
RETURNS TABLE (
  question_type    text,
  question_id      uuid,
  question_key     integer,
  language         text,
  snippet_id       uuid,
  question         text,
  hint             text,
  options          text[],
  explanation      text,
  key_term         text,
  key_term_meaning text,
  life_connection  text,
  source_citation  text,
  asset_id         uuid
)
LANGUAGE sql SECURITY DEFINER SET search_path = public VOLATILE
AS $$
  WITH refs AS (
    SELECT DISTINCT qq.question_key, qq.question_type
    FROM quiz_questions qq
    JOIN quiz_sets qs ON qs.quiz_id = qq.quiz_id
    WHERE qq.quiz_id = p_quiz_id
      AND qq.question_key IS NOT NULL
      AND (qs.is_published = true OR is_editorial_staff())
  )
  SELECT
    'snippet'::text, sq.question_id, sq.question_key, sq.language, sq.snippet_id,
    sq.question, sq.hint,
    (SELECT array_agg(o.opt ORDER BY random())
       FROM unnest(ARRAY[sq.correct_option, sq.wrong_option_1,
                         sq.wrong_option_2, sq.wrong_option_3]) AS o(opt)),
    NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::uuid
  FROM snippet_questions sq
  JOIN refs r ON r.question_key = sq.question_key AND r.question_type = 'snippet'
  UNION ALL
  SELECT
    'standalone'::text, st.question_id, st.question_key, st.language, NULL::uuid,
    st.question, st.hint,
    (SELECT array_agg(o.opt ORDER BY random())
       FROM unnest(ARRAY[st.correct_option, st.wrong_option_1,
                         st.wrong_option_2, st.wrong_option_3]) AS o(opt)),
    st.explanation, st.key_term, st.key_term_meaning, st.life_connection,
    st.source_citation, st.asset_id
  FROM standalone_questions st
  JOIN refs r ON r.question_key = st.question_key AND r.question_type = 'standalone';
$$;

GRANT EXECUTE ON FUNCTION get_quiz_questions_secure(text) TO anon, authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- §5  PER-QUESTION GRADING RPC
-- The product reveals the correct answer immediately after the learner commits
-- (or times out on) an answer, so returning correct_option here matches the
-- existing UX — it is no longer available BEFORE answering, which is the fix.
-- p_chosen = NULL → is_correct NULL (skipped/timed out), still reveals answer.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION grade_quiz_answer(
  p_question_type text, p_question_id uuid, p_chosen text DEFAULT NULL
)
RETURNS TABLE (is_correct boolean, correct_option text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
DECLARE
  v_correct text;
BEGIN
  IF p_question_type = 'snippet' THEN
    SELECT sq.correct_option INTO v_correct
    FROM snippet_questions sq WHERE sq.question_id = p_question_id;
  ELSIF p_question_type = 'standalone' THEN
    SELECT st.correct_option INTO v_correct
    FROM standalone_questions st WHERE st.question_id = p_question_id;
  ELSE
    RAISE EXCEPTION 'invalid question_type %', p_question_type;
  END IF;

  IF v_correct IS NULL THEN
    RAISE EXCEPTION 'question not found';
  END IF;

  RETURN QUERY SELECT
    CASE WHEN p_chosen IS NULL THEN NULL ELSE (p_chosen = v_correct) END,
    v_correct;
END;
$$;

GRANT EXECUTE ON FUNCTION grade_quiz_answer(text, uuid, text) TO anon, authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- §6  ATTEMPT SUBMISSION RPC — server-graded, server-scored
-- Client sends only [{ref_id, question_id, question_type, chosen_option}].
-- Server: verifies each ref belongs to this quiz, resolves the language row by
-- question_key, grades, scores by quiz_questions.points, enforces max_attempts,
-- inserts the attempt as auth.uid(). Client can no longer INSERT attempts.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION submit_quiz_attempt(p_quiz_id text, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public VOLATILE
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_quiz       quiz_sets%ROWTYPE;
  v_prev       int;
  elem         jsonb;
  v_ref        record;
  v_correct    text;
  v_chosen     text;
  v_is         boolean;
  v_pts        int;
  v_score      int    := 0;
  v_max        int    := 0;
  v_graded     jsonb  := '[]'::jsonb;
  v_seen       uuid[] := '{}';
  v_attempt_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;

  SELECT * INTO v_quiz FROM quiz_sets WHERE quiz_id = p_quiz_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'quiz not found'; END IF;
  IF v_quiz.is_published IS DISTINCT FROM true AND NOT is_editorial_staff() THEN
    RAISE EXCEPTION 'quiz not published';
  END IF;

  IF v_quiz.max_attempts IS NOT NULL THEN
    SELECT count(*) INTO v_prev FROM quiz_attempts qa
    WHERE qa.profile_id = v_uid AND qa.quiz_id = p_quiz_id AND qa.completed_at IS NOT NULL;
    IF v_prev >= v_quiz.max_attempts THEN
      RAISE EXCEPTION 'max attempts reached';
    END IF;
  END IF;

  FOR elem IN SELECT * FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) LOOP
    SELECT qq.id, qq.question_key, qq.question_type, qq.points
      INTO v_ref
    FROM quiz_questions qq
    WHERE qq.id = (elem->>'ref_id')::uuid AND qq.quiz_id = p_quiz_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'answer refers to a question not in this quiz'; END IF;
    IF v_ref.id = ANY(v_seen) THEN RAISE EXCEPTION 'duplicate answer for question'; END IF;
    v_seen := v_seen || v_ref.id;

    IF v_ref.question_type = 'snippet' THEN
      SELECT sq.correct_option INTO v_correct FROM snippet_questions sq
      WHERE sq.question_id = (elem->>'question_id')::uuid
        AND sq.question_key = v_ref.question_key;
    ELSE
      SELECT st.correct_option INTO v_correct FROM standalone_questions st
      WHERE st.question_id = (elem->>'question_id')::uuid
        AND st.question_key = v_ref.question_key;
    END IF;
    IF v_correct IS NULL THEN RAISE EXCEPTION 'question row not found for answer'; END IF;

    v_chosen := elem->>'chosen_option';
    v_is     := CASE WHEN v_chosen IS NULL THEN NULL ELSE (v_chosen = v_correct) END;
    v_pts    := COALESCE(v_ref.points, 1);
    v_max    := v_max + v_pts;
    IF v_is THEN v_score := v_score + v_pts; END IF;

    v_graded := v_graded || jsonb_build_object(
      'question_id',    elem->>'question_id',
      'question_type',  v_ref.question_type,
      'chosen_option',  v_chosen,
      'correct_option', v_correct,
      'is_correct',     v_is,
      'points_awarded', CASE WHEN v_is THEN v_pts ELSE 0 END
    );
  END LOOP;

  INSERT INTO quiz_attempts (profile_id, quiz_id, score, max_score, started_at, completed_at, answers)
  VALUES (v_uid, p_quiz_id, v_score, v_max, now(), now(), v_graded)
  RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'score',      v_score,
    'max_score',  v_max,
    'answers',    v_graded
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_quiz_attempt(text, jsonb) TO authenticated;

-- Attempts are now written only by the RPC above (definer bypasses RLS).
DROP POLICY IF EXISTS "quiz_attempts_own_insert" ON quiz_attempts;


-- ═════════════════════════════════════════════════════════════════════════════
-- §7  get_quiz_ranks — last SECURITY DEFINER residual (2.5 fold-in)
-- Same signature (client keeps calling with p_profile_id) but the parameter is
-- now IGNORED: ranks are always computed for auth.uid(). search_path pinned.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_quiz_ranks(p_profile_id uuid)
RETURNS TABLE (
  scope_type  text,
  scope_id    text,
  user_rank   bigint,
  total_users bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
WITH last_attempts AS (
  SELECT DISTINCT ON (qa.profile_id, qa.quiz_id)
    qa.profile_id, qa.quiz_id, qa.score, qa.max_score
  FROM quiz_attempts qa
  WHERE qa.completed_at IS NOT NULL
  ORDER BY qa.profile_id, qa.quiz_id, qa.completed_at DESC NULLS LAST
),
quiz_scope AS (
  SELECT qs.quiz_id, m.course_id::text AS course_id, m.theme_id::text AS theme_id
  FROM quiz_sets qs
  JOIN lessons l ON l.lesson_id = qs.lesson_id
  JOIN modules m ON m.module_id = l.module_id
  WHERE qs.is_published = true
),
course_scores AS (
  SELECT la.profile_id, qsc.course_id AS scope_id,
         SUM(la.score)::float / NULLIF(SUM(la.max_score), 0) AS pct
  FROM last_attempts la
  JOIN quiz_scope qsc ON qsc.quiz_id = la.quiz_id
  WHERE qsc.course_id IS NOT NULL
  GROUP BY la.profile_id, qsc.course_id
),
theme_scores AS (
  SELECT la.profile_id, qsc.theme_id AS scope_id,
         SUM(la.score)::float / NULLIF(SUM(la.max_score), 0) AS pct
  FROM last_attempts la
  JOIN quiz_scope qsc ON qsc.quiz_id = la.quiz_id
  WHERE qsc.theme_id IS NOT NULL
  GROUP BY la.profile_id, qsc.theme_id
),
course_ranks AS (
  SELECT 'course'::text AS scope_type, scope_id, profile_id,
         RANK()   OVER (PARTITION BY scope_id ORDER BY pct DESC NULLS LAST)::bigint AS user_rank,
         COUNT(*) OVER (PARTITION BY scope_id)::bigint                              AS total_users
  FROM course_scores
),
theme_ranks AS (
  SELECT 'theme'::text AS scope_type, scope_id, profile_id,
         RANK()   OVER (PARTITION BY scope_id ORDER BY pct DESC NULLS LAST)::bigint AS user_rank,
         COUNT(*) OVER (PARTITION BY scope_id)::bigint                              AS total_users
  FROM theme_scores
)
SELECT cr.scope_type, cr.scope_id, cr.user_rank, cr.total_users
FROM course_ranks cr WHERE cr.profile_id = auth.uid()
UNION ALL
SELECT tr.scope_type, tr.scope_id, tr.user_rank, tr.total_users
FROM theme_ranks tr WHERE tr.profile_id = auth.uid();
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §8  lesson_completions POLICY SPLIT (1.2 stopgap adjustment)
-- The legacy "Users manage own lesson completions" (ALL) policy allowed DELETE
-- (streak/history tampering). saveCompletion() upserts, so it needs
-- SELECT + INSERT + UPDATE on own rows — but not DELETE.
-- Re-award abuse via delete+reinsert is additionally blocked by §1's dedupe.
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users manage own lesson completions" ON lesson_completions;

DROP POLICY IF EXISTS "lesson_completions_own_select" ON lesson_completions;
CREATE POLICY "lesson_completions_own_select" ON lesson_completions
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "lesson_completions_own_insert" ON lesson_completions;
CREATE POLICY "lesson_completions_own_insert" ON lesson_completions
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "lesson_completions_own_update" ON lesson_completions;
CREATE POLICY "lesson_completions_own_update" ON lesson_completions
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());


-- ═════════════════════════════════════════════════════════════════════════════
-- §9  1.2 STOPGAP CONSTRAINTS — RETAINED AS DEFENSE-IN-DEPTH
-- lc_points_sane / lc_snippets_sane stay: points_earned is still client-
-- reported (lesson content isn't server-modelled yet), so the 0–1000 cap is
-- the ceiling on dharma inflation. Full server-side points needs a lesson→
-- points model — flagged for a later phase.
-- qa_score_sane stays (harmless; §6 is the real guard).
-- ut_quantity_sane stays (the §1 trigger respects it).
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── End of Phase 2.4 script ─────────────────────────────────────────────────
