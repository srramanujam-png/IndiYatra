-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Audit fix H1 (12 Nov 2026): lesson completions are recorded by the server
--
-- BEFORE: the browser inserted/updated lesson_completions directly and chose
--   points_earned (up to 1000) and snippet_count itself. The awarding trigger
--   trusted those values, so any signed-in user could mint dharma, plant tokens,
--   badges, map progress and leaderboard rank with one REST call per lesson.
-- AFTER:  the only way to write a completion is complete_lesson(lesson_id).
--   The server works out the course, the snippet count and the points
--   (same formula as get_map_state: sum of snippet_value over the lesson's
--   snippets that have a LANG_03 translation, capped at 1000), so awarded dharma
--   can never exceed the map's "possible" total. The first completion wins:
--   replaying a lesson changes nothing (no more overwritten points/completed_at).
--
-- DEPLOY ORDER: ship the app build first (saveCompletion falls back to the old
--   upsert while this function does not exist), then run this file.
-- Safe to re-run (idempotent). Rollback: supabase/rollback/20261112000100_*.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_lesson(p_lesson_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_course  uuid;
  v_points  int;
  v_count   int;
  v_new     boolean := false;
  v_row     lesson_completions%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '28000';
  END IF;
  -- Guests (anonymous sign-ins) keep local-only progress, exactly as the app already does.
  IF COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'guests cannot record completions' USING ERRCODE = '42501';
  END IF;
  IF p_lesson_id IS NULL OR NOT EXISTS (SELECT 1 FROM lessons l WHERE l.lesson_id = p_lesson_id) THEN
    RAISE EXCEPTION 'lesson not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT m.course_id INTO v_course
  FROM lessons l LEFT JOIN modules m ON m.module_id = l.module_id
  WHERE l.lesson_id = p_lesson_id;

  -- Server-side values. Keep in step with get_map_state ("possible dharma seeds").
  SELECT LEAST(1000, COALESCE(SUM(sc.snippet_value), 0))::int, COUNT(sc.snippet_id)::int
    INTO v_points, v_count
  FROM lesson_snippet_mapping lsm
  JOIN snippet_core sc ON sc.snippet_id = lsm.snippet_id
  WHERE lsm.lesson_id = p_lesson_id
    AND EXISTS (SELECT 1 FROM snippet_translations st
                WHERE st.snippet_id = sc.snippet_id AND st.language = 'LANG_03');

  INSERT INTO lesson_completions (profile_id, lesson_id, course_id, points_earned, snippet_count, completed_at)
  VALUES (v_uid, p_lesson_id, v_course, v_points, LEAST(v_count, 500), now())
  ON CONFLICT (profile_id, lesson_id) DO NOTHING
  RETURNING * INTO v_row;                 -- the AFTER INSERT trigger awards tokens/badges

  IF FOUND THEN
    v_new := true;
  ELSE
    SELECT * INTO v_row FROM lesson_completions lc
    WHERE lc.profile_id = v_uid AND lc.lesson_id = p_lesson_id;
  END IF;

  RETURN jsonb_build_object(
    'lesson_id',         v_row.lesson_id,
    'course_id',         v_row.course_id,
    'points_earned',     v_row.points_earned,
    'snippet_count',     v_row.snippet_count,
    'completed_at',      v_row.completed_at,
    'already_completed', NOT v_new
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_lesson(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lesson(uuid) TO authenticated, service_role;

-- Clients may now only READ their own completions.
DROP POLICY IF EXISTS lesson_completions_own_insert ON public.lesson_completions;
DROP POLICY IF EXISTS lesson_completions_own_update ON public.lesson_completions;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.lesson_completions FROM anon, authenticated;

-- ── Optional, read-only: completions recorded before this fix whose points exceed
--    what the lesson is worth (possible forgeries, or content edited since). ──
-- SELECT lc.profile_id, lc.lesson_id, lc.points_earned, x.pts AS lesson_worth, lc.completed_at
-- FROM lesson_completions lc
-- CROSS JOIN LATERAL (
--   SELECT LEAST(1000, COALESCE(SUM(sc.snippet_value), 0)) AS pts
--   FROM lesson_snippet_mapping lsm JOIN snippet_core sc ON sc.snippet_id = lsm.snippet_id
--   WHERE lsm.lesson_id = lc.lesson_id
--     AND EXISTS (SELECT 1 FROM snippet_translations st WHERE st.snippet_id = sc.snippet_id AND st.language = 'LANG_03')
-- ) x
-- WHERE lc.points_earned > x.pts
-- ORDER BY lc.points_earned - x.pts DESC;
