-- Rollback for 20261112000200_quiz_answer_lock.sql (re-opens audit finding H4).
-- The app keeps working: it falls back to grade_quiz_answer when answer_quiz_question is missing.
GRANT EXECUTE ON FUNCTION public.grade_quiz_answer(text, uuid, text) TO anon, authenticated;
DROP FUNCTION IF EXISTS public.answer_quiz_question(text, text, uuid, text);

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

CREATE OR REPLACE FUNCTION public.get_quiz_ranks(p_profile_id uuid) RETURNS TABLE(scope_type text, scope_id text, user_rank bigint, total_users bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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

-- The answer log is kept (it is history, and harmless once the functions above are restored).
-- To remove it as well:  DROP TABLE IF EXISTS public.quiz_answer_log;
