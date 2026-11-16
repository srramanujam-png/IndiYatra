-- ─────────────────────────────────────────────────────────────────────────────
-- Map release · 5/5 · progress-card data for the dashboard map
--
--   select public.get_map_card();                  -- whole platform
--   select public.get_map_card('<course uuid>');   -- one course (dashboard course selector)
--
-- Returns, for auth.uid() only (no user parameter; SECURITY INVOKER so the caller's RLS applies):
--   lastViewed  most recent lesson (lesson_views.last_seen_at) or quiz (quiz_attempts.started_at)
--   course      the course of that item (or the selected course): % of its snippets in completed lessons
--   nextUnlock  the next 5% step and how many STORIES (snippets) are still needed to reach it
--               (seeds still needed ÷ average seeds per remaining snippet, rounded up, at least 1).
--               Progress moves in whole lessons, so this is an honest estimate.
--   nextBanyan  the course closest to completion among courses that are ≥ 50% done (fewest snippets
--               left; ties → higher %). When a course is selected, that course is the goal.
-- Snippets are counted the way dharma seeds are: only snippets with a default-language (LANG_03) translation.
-- Rollback: supabase/rollback/20260929000500_map_progress_card_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lesson_views_profile_seen ON public.lesson_views (profile_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_profile_started ON public.quiz_attempts (profile_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_profile ON public.lesson_completions (profile_id, lesson_id);

CREATE OR REPLACE FUNCTION public.get_map_card(p_course_id uuid DEFAULT NULL) RETURNS jsonb
  LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_l         jsonb;
  v_state     jsonb;
  v_last      jsonb;
  v_last_course uuid;
  v_focus     uuid;
  v_course    jsonb;
  v_next      jsonb;
  v_banyan    jsonb;
  v_awarded   bigint; v_possible bigint; v_idx int;
  v_remaining bigint; v_need bigint; v_avg numeric; v_stories bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'get_map_card requires a signed-in user' USING ERRCODE = '28000';
  END IF;

  -- per-lesson snippet counts + completion flag, computed ONCE (no temp table: this must stay STABLE / read-only)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('lesson_id', t.lesson_id, 'course_id', t.course_id, 'n', t.n, 'done', t.done)), '[]'::jsonb)
    INTO v_l
  FROM (
    SELECT l.lesson_id, m.course_id, COUNT(sc.snippet_id) AS n,
           EXISTS (SELECT 1 FROM lesson_completions lc WHERE lc.profile_id = v_uid AND lc.lesson_id = l.lesson_id) AS done
    FROM lessons l
    JOIN modules m ON m.module_id = l.module_id
    LEFT JOIN lesson_snippet_mapping lsm ON lsm.lesson_id = l.lesson_id
    LEFT JOIN snippet_core sc ON sc.snippet_id = lsm.snippet_id
         AND EXISTS (SELECT 1 FROM snippet_translations st WHERE st.snippet_id = sc.snippet_id AND st.language = 'LANG_03')
    GROUP BY l.lesson_id, m.course_id
  ) t;

  -- last viewed lesson or quiz (within the selected course when one is selected)
  SELECT to_jsonb(x) INTO v_last FROM (
    SELECT * FROM (
      SELECT 'lesson'::text AS kind, l.lesson_id::text AS id, l.lesson_name AS title, m.course_id AS course_id, lv.last_seen_at AS at
      FROM lesson_views lv JOIN lessons l ON l.lesson_id = lv.lesson_id JOIN modules m ON m.module_id = l.module_id
      WHERE lv.profile_id = v_uid AND (p_course_id IS NULL OR m.course_id = p_course_id)
      UNION ALL
      SELECT 'quiz', qa.quiz_id, qs.title, COALESCE(qs.course_id, m2.course_id), qa.started_at
      FROM quiz_attempts qa JOIN quiz_sets qs ON qs.quiz_id = qa.quiz_id
      LEFT JOIN lessons l2 ON l2.lesson_id = qs.lesson_id LEFT JOIN modules m2 ON m2.module_id = COALESCE(qs.module_id, l2.module_id)
      WHERE qa.profile_id = v_uid AND (p_course_id IS NULL OR COALESCE(qs.course_id, m2.course_id) = p_course_id)
    ) u ORDER BY at DESC NULLS LAST LIMIT 1
  ) x;
  v_last_course := NULLIF(v_last->>'course_id', '')::uuid;
  v_focus := COALESCE(p_course_id, v_last_course);

  IF v_focus IS NOT NULL THEN
    SELECT jsonb_build_object('courseId', c.course_id, 'name', c.course_name,
             'snippetsTotal', COALESCE(s.total, 0), 'snippetsDone', COALESCE(s.done, 0),
             'percent', CASE WHEN COALESCE(s.total, 0) > 0 THEN round(100.0 * s.done / s.total, 1) END)
      INTO v_course
    FROM courses c
    LEFT JOIN (SELECT course_id, SUM(n) AS total, SUM(n) FILTER (WHERE done) AS done FROM jsonb_to_recordset(v_l) AS z(lesson_id uuid, course_id uuid, n bigint, done boolean) GROUP BY course_id) s
           ON s.course_id = c.course_id
    WHERE c.course_id = v_focus;
  END IF;

  -- next 5% step, in stories (snippets)
  v_state := get_map_state(p_course_id);
  IF v_state->>'status' = 'ok' THEN
    v_awarded := (v_state->'dharma'->>'awarded')::bigint; v_possible := (v_state->'dharma'->>'possible')::bigint;
    v_idx := (v_state->>'milestoneIndex')::int;
    SELECT COALESCE(SUM(n), 0) INTO v_remaining FROM jsonb_to_recordset(v_l) AS z(lesson_id uuid, course_id uuid, n bigint, done boolean) WHERE NOT done AND (p_course_id IS NULL OR course_id = p_course_id);
    IF v_idx < 20 AND v_remaining > 0 AND v_possible > v_awarded THEN
      v_need := GREATEST(1, CEIL(((v_idx + 1) * 5 * v_possible) / 100.0)::bigint - v_awarded);
      v_avg  := (v_possible - v_awarded)::numeric / v_remaining;
      v_stories := LEAST(v_remaining, GREATEST(1, CEIL(v_need / v_avg)::bigint));
      v_next := jsonb_build_object('milestoneIndex', v_idx + 1, 'thresholdPercent', (v_idx + 1) * 5, 'storiesToGo', v_stories);
    END IF;
  END IF;

  -- next banyan: nearest-to-complete course among those ≥ 50% done (or the selected course)
  SELECT jsonb_build_object('courseId', c.course_id, 'name', c.course_name,
           'percent', round(100.0 * s.done / s.total, 1), 'storiesToGo', (s.total - s.done)) INTO v_banyan
  FROM courses c
  JOIN (SELECT course_id, SUM(n) AS total, SUM(n) FILTER (WHERE done) AS done FROM jsonb_to_recordset(v_l) AS z(lesson_id uuid, course_id uuid, n bigint, done boolean) GROUP BY course_id) s
    ON s.course_id = c.course_id
  WHERE s.total > 0 AND s.done < s.total
    AND (CASE WHEN p_course_id IS NULL THEN 2 * s.done >= s.total ELSE c.course_id = p_course_id END)
    AND NOT EXISTS (SELECT 1 FROM user_tokens ut WHERE ut.profile_id = v_uid AND ut.token_type = 'banyan'
                    AND ut.source_type = 'course' AND ut.source_id = c.course_id::text)
  ORDER BY (s.total - s.done) ASC, (s.done::numeric / s.total) DESC, c.course_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'scope', CASE WHEN p_course_id IS NULL THEN 'platform' ELSE 'course' END,
    'lastViewed', v_last - 'course_id',
    'course', v_course,
    'nextUnlock', v_next,
    'nextBanyan', v_banyan);
END $$;

REVOKE ALL ON FUNCTION public.get_map_card(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_map_card(uuid) TO authenticated;
