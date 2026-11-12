-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Audit fix H4 (12 Nov 2026): quiz answers are locked on the server
--
-- BEFORE: grade_quiz_answer() told anyone (no sign-in) the correct option of any
--   question and kept no record; submit_quiz_attempt() scored whatever list of
--   answers the browser sent, and only the questions it chose to send. A script
--   could read every answer and submit 100%. Ranks used the LATEST attempt, so
--   a retake after seeing the answers also gave 100%.
-- AFTER:
--   1. answer_quiz_question(quiz, type, question, chosen) — signed-in, non-guest
--      users only. The FIRST choice for a question (or a skip/time-out, chosen =
--      NULL) is stored in quiz_answer_log before the correct option is revealed.
--      Asking again returns the stored choice; it cannot be changed.
--   2. submit_quiz_attempt() scores from the stored choices (a choice sent by
--      the browser is used only for questions never revealed), counts every
--      question the user opened, and pads the maximum when fewer questions are
--      sent than the quiz requires — so leaving out wrong answers no longer helps.
--   3. grade_quiz_answer() is no longer executable by clients.
--   4. get_quiz_ranks() ranks on each user's FIRST completed attempt per quiz.
--
-- DEPLOY ORDER: ship the app build first (it falls back to grade_quiz_answer
--   while answer_quiz_question does not exist), then run this file.
-- Safe to re-run (idempotent). Rollback: supabase/rollback/20261112000200_*.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Answer log ────────────────────────────────────────────────────────────
-- attempt_id IS NULL  = the user's current, not-yet-submitted run of that quiz.
-- submit_quiz_attempt stamps the rows with the attempt, which frees the user to answer afresh on a retake.
CREATE TABLE IF NOT EXISTS public.quiz_answer_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id       text        NOT NULL,
  question_type text        NOT NULL CHECK (question_type IN ('snippet', 'standalone')),
  question_key  integer     NOT NULL,
  question_id   uuid        NOT NULL,
  chosen_option text,
  is_correct    boolean,
  answered_at   timestamptz NOT NULL DEFAULT now(),
  attempt_id    text
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_answer_log_open
  ON public.quiz_answer_log (profile_id, quiz_id, question_type, question_key)
  WHERE attempt_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_answer_log_attempt ON public.quiz_answer_log (attempt_id);

ALTER TABLE public.quiz_answer_log ENABLE ROW LEVEL SECURITY;      -- no policies: reachable only through the functions below
REVOKE ALL ON public.quiz_answer_log FROM PUBLIC, anon, authenticated;

-- ── 2. Check (and lock) one answer ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.answer_quiz_question(
  p_quiz_id text, p_question_type text, p_question_id uuid, p_chosen text DEFAULT NULL
) RETURNS TABLE(is_correct boolean, correct_option text, chosen_option text, already_answered boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_quiz    quiz_sets%ROWTYPE;
  v_prev    int;
  v_key     int;
  v_correct text;
  v_new     boolean := false;
  v_log     quiz_answer_log%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '28000';
  END IF;
  -- Guest (anonymous) sessions are free to create, so they would be an answer look-up service.
  IF COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'sign in to play quizzes' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_quiz FROM quiz_sets WHERE quiz_id = p_quiz_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'quiz not found'; END IF;
  IF v_quiz.is_published IS DISTINCT FROM true AND NOT is_editorial_staff() THEN
    RAISE EXCEPTION 'quiz not published';
  END IF;
  IF v_quiz.max_attempts IS NOT NULL THEN
    SELECT count(*) INTO v_prev FROM quiz_attempts qa
    WHERE qa.profile_id = v_uid AND qa.quiz_id = p_quiz_id AND qa.completed_at IS NOT NULL;
    IF v_prev >= v_quiz.max_attempts THEN RAISE EXCEPTION 'max attempts reached'; END IF;
  END IF;

  IF p_question_type = 'snippet' THEN
    SELECT sq.question_key, sq.correct_option INTO v_key, v_correct
    FROM snippet_questions sq WHERE sq.question_id = p_question_id;
  ELSIF p_question_type = 'standalone' THEN
    SELECT st.question_key, st.correct_option INTO v_key, v_correct
    FROM standalone_questions st WHERE st.question_id = p_question_id;
  ELSE
    RAISE EXCEPTION 'invalid question_type %', p_question_type;
  END IF;
  IF v_correct IS NULL OR v_key IS NULL THEN RAISE EXCEPTION 'question not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM quiz_questions qq
                 WHERE qq.quiz_id = p_quiz_id AND qq.question_type = p_question_type AND qq.question_key = v_key) THEN
    RAISE EXCEPTION 'question is not part of this quiz';
  END IF;

  -- First answer wins. The key is shared by all language versions of a question,
  -- so switching language does not reopen it.
  INSERT INTO quiz_answer_log (profile_id, quiz_id, question_type, question_key, question_id, chosen_option, is_correct)
  VALUES (v_uid, p_quiz_id, p_question_type, v_key, p_question_id, p_chosen,
          CASE WHEN p_chosen IS NULL THEN NULL ELSE (p_chosen = v_correct) END)
  ON CONFLICT (profile_id, quiz_id, question_type, question_key) WHERE attempt_id IS NULL DO NOTHING
  RETURNING * INTO v_log;
  IF FOUND THEN
    v_new := true;
  ELSE
    SELECT * INTO v_log FROM quiz_answer_log l
    WHERE l.profile_id = v_uid AND l.quiz_id = p_quiz_id AND l.question_type = p_question_type
      AND l.question_key = v_key AND l.attempt_id IS NULL;
  END IF;

  RETURN QUERY SELECT v_log.is_correct, v_correct, v_log.chosen_option, NOT v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.answer_quiz_question(text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_quiz_question(text, text, uuid, text) TO authenticated, service_role;

-- ── 3. Submit: score from the locked answers ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_quiz_id text, p_answers jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_quiz       quiz_sets%ROWTYPE;
  v_prev       int;
  elem         jsonb;
  v_ref        record;
  v_log        record;
  v_correct    text;
  v_chosen     text;
  v_is         boolean;
  v_pts        int;
  v_score      int    := 0;
  v_max        int    := 0;
  v_count      int    := 0;
  v_expected   int;
  v_avg_pts    int;
  v_graded     jsonb  := '[]'::jsonb;
  v_seen       uuid[] := '{}';
  v_seen_keys  text[] := '{}';
  v_attempt_id text;
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

  -- (a) the answers the browser sent
  FOR elem IN SELECT * FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) LOOP
    SELECT qq.id, qq.question_key, qq.question_type, qq.points
      INTO v_ref
    FROM quiz_questions qq
    WHERE qq.id = (elem->>'ref_id')::uuid AND qq.quiz_id = p_quiz_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'answer refers to a question not in this quiz'; END IF;
    IF v_ref.id = ANY(v_seen) THEN RAISE EXCEPTION 'duplicate answer for question'; END IF;
    IF (v_ref.question_type || ':' || v_ref.question_key) = ANY(v_seen_keys) THEN
      RAISE EXCEPTION 'duplicate answer for question';
    END IF;
    v_seen      := v_seen || v_ref.id;
    v_seen_keys := v_seen_keys || (v_ref.question_type || ':' || v_ref.question_key);

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

    -- A locked answer (the user has already seen the correct option) overrides whatever was sent.
    SELECT l.chosen_option, l.is_correct INTO v_log FROM quiz_answer_log l
    WHERE l.profile_id = v_uid AND l.quiz_id = p_quiz_id AND l.attempt_id IS NULL
      AND l.question_type = v_ref.question_type AND l.question_key = v_ref.question_key;
    IF FOUND THEN
      v_chosen := v_log.chosen_option;
      v_is     := v_log.is_correct;
    ELSE
      v_chosen := elem->>'chosen_option';
      v_is     := CASE WHEN v_chosen IS NULL THEN NULL ELSE (v_chosen = v_correct) END;
      INSERT INTO quiz_answer_log (profile_id, quiz_id, question_type, question_key, question_id, chosen_option, is_correct)
      VALUES (v_uid, p_quiz_id, v_ref.question_type, v_ref.question_key, (elem->>'question_id')::uuid, v_chosen, v_is);
    END IF;

    v_pts   := COALESCE(v_ref.points, 1);
    v_max   := v_max + v_pts;
    v_count := v_count + 1;
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

  -- (b) questions the user opened in this run but left out of the submission still count
  FOR v_log IN
    SELECT l.question_type, l.question_key, l.question_id, l.chosen_option, l.is_correct,
           (SELECT COALESCE(MAX(qq.points), 1) FROM quiz_questions qq
             WHERE qq.quiz_id = p_quiz_id AND qq.question_type = l.question_type
               AND qq.question_key = l.question_key) AS pts
    FROM quiz_answer_log l
    WHERE l.profile_id = v_uid AND l.quiz_id = p_quiz_id AND l.attempt_id IS NULL
      AND NOT ((l.question_type || ':' || l.question_key) = ANY(v_seen_keys))
    ORDER BY l.answered_at
  LOOP
    v_max   := v_max + v_log.pts;
    v_count := v_count + 1;
    IF v_log.is_correct THEN v_score := v_score + v_log.pts; END IF;
    v_graded := v_graded || jsonb_build_object(
      'question_id',    v_log.question_id,
      'question_type',  v_log.question_type,
      'chosen_option',  v_log.chosen_option,
      'correct_option', NULL,
      'is_correct',     v_log.is_correct,
      'points_awarded', CASE WHEN v_log.is_correct THEN v_log.pts ELSE 0 END
    );
  END LOOP;

  -- (c) a run must cover the whole quiz (or its question pool); missing questions score zero
  SELECT count(*), COALESCE(CEIL(AVG(pts)), 1)::int INTO v_expected, v_avg_pts
  FROM (
    SELECT qq.question_type, qq.question_key, MAX(COALESCE(qq.points, 1)) AS pts
    FROM quiz_questions qq
    WHERE qq.quiz_id = p_quiz_id AND qq.question_key IS NOT NULL
      AND (   (qq.question_type = 'snippet'    AND EXISTS (SELECT 1 FROM snippet_questions sq    WHERE sq.question_key = qq.question_key))
           OR (qq.question_type = 'standalone' AND EXISTS (SELECT 1 FROM standalone_questions st WHERE st.question_key = qq.question_key)))
    GROUP BY qq.question_type, qq.question_key
  ) refs;
  IF v_quiz.question_pool_size IS NOT NULL AND v_quiz.question_pool_size > 0 THEN
    v_expected := LEAST(v_expected, v_quiz.question_pool_size);
  END IF;
  IF v_count < v_expected THEN
    v_max := v_max + (v_expected - v_count) * v_avg_pts;
  END IF;

  INSERT INTO quiz_attempts (profile_id, quiz_id, score, max_score, started_at, completed_at, answers)
  VALUES (v_uid, p_quiz_id, v_score, v_max,
          COALESCE((SELECT MIN(l.answered_at) FROM quiz_answer_log l
                    WHERE l.profile_id = v_uid AND l.quiz_id = p_quiz_id AND l.attempt_id IS NULL), now()),
          now(), v_graded)
  RETURNING id::text INTO v_attempt_id;

  -- close this run: the next attempt starts with nothing locked
  UPDATE quiz_answer_log l SET attempt_id = v_attempt_id
  WHERE l.profile_id = v_uid AND l.quiz_id = p_quiz_id AND l.attempt_id IS NULL;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'score',      v_score,
    'max_score',  v_max,
    'answers',    v_graded
  );
END;
$$;

-- ── 4. The old open answer look-up is closed to clients ──────────────────────
REVOKE ALL ON FUNCTION public.grade_quiz_answer(text, uuid, text) FROM PUBLIC, anon, authenticated;

-- ── 5. Ranks use the FIRST completed attempt per quiz ────────────────────────
CREATE OR REPLACE FUNCTION public.get_quiz_ranks(p_profile_id uuid) RETURNS TABLE(scope_type text, scope_id text, user_rank bigint, total_users bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
WITH first_attempts AS (
  SELECT DISTINCT ON (qa.profile_id, qa.quiz_id)
    qa.profile_id, qa.quiz_id, qa.score, qa.max_score
  FROM quiz_attempts qa
  WHERE qa.completed_at IS NOT NULL
  ORDER BY qa.profile_id, qa.quiz_id, qa.completed_at ASC NULLS LAST, qa.id ASC   -- first attempt (was: latest)
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
  FROM first_attempts la
  JOIN quiz_scope qsc ON qsc.quiz_id = la.quiz_id
  WHERE qsc.course_id IS NOT NULL
  GROUP BY la.profile_id, qsc.course_id
),
theme_scores AS (
  SELECT la.profile_id, qsc.theme_id AS scope_id,
         SUM(la.score)::float / NULLIF(SUM(la.max_score), 0) AS pct
  FROM first_attempts la
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
