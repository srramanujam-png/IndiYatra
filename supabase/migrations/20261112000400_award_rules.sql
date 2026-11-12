-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Audit fixes M3, L2 (12 Nov 2026): award rules
--
-- M3  The course token/badge check sat INSIDE the level check, and the level check
--     looked at every course on the platform. With more than one course, a learner
--     who finished a whole course got no course token unless they had also finished
--     that level in all other courses. Now:
--       · "level complete"  = every lesson of that level WITHIN THE SAME COURSE
--       · "course complete" = checked on its own, whenever a module is completed
-- L2  The 7-day streak compared UTC dates, so a lesson finished between midnight and
--     05:30 IST counted for the previous day. Days are now counted in India time.
--
-- Everything else in the function is unchanged from 20260929000100_map_token_rename.sql.
-- The last section awards any course tokens that the old rule withheld (normally none).
-- Safe to re-run (idempotent). Rollback: supabase/rollback/20261112000400_*.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_award_on_lesson_completion() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_module_id  uuid;
  v_theme_id   uuid;
  v_level_id   text;
  v_course_id  uuid;
  v_map        jsonb;
  v_streak     int := 0;
  v_today      date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
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
    PERFORM fn_award_token(NEW.profile_id, COALESCE(v_map->>'module', 'jasmine'),
                           1, 'module', v_module_id::text);
    PERFORM fn_award_badge(NEW.profile_id, 'BADGE_P02');   -- Curiosity: first module

    -- Theme complete? (all lessons of modules sharing this level + theme)
    IF v_theme_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM lessons l JOIN modules m ON m.module_id = l.module_id
        WHERE m.level_id = v_level_id AND m.theme_id = v_theme_id
          AND NOT EXISTS (SELECT 1 FROM lesson_completions lc
                          WHERE lc.profile_id = NEW.profile_id AND lc.lesson_id = l.lesson_id)
    ) THEN
      PERFORM fn_award_token(NEW.profile_id, COALESCE(v_map->>'theme', 'lotus'),
                             1, 'theme', v_theme_id::text);
    END IF;

    -- Level complete? (M3: all lessons of this level in THIS course)
    IF v_level_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM lessons l JOIN modules m ON m.module_id = l.module_id
        WHERE m.level_id = v_level_id
          AND m.course_id IS NOT DISTINCT FROM v_course_id
          AND NOT EXISTS (SELECT 1 FROM lesson_completions lc
                          WHERE lc.profile_id = NEW.profile_id AND lc.lesson_id = l.lesson_id)
    ) THEN
      -- source_id stays the bare level id (get_map_state matches on it), so a level token is
      -- held once per level even if several courses share that level id.
      PERFORM fn_award_token(NEW.profile_id, COALESCE(v_map->>'level', 'ashoka'),
                             1, 'level', v_level_id);
    END IF;

    -- Course complete? (M3: checked on its own, not only when a level is complete)
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

  -- Persistence badge: 7 consecutive active days ending today (L2: India dates)
  FOR i IN 0..6 LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM lesson_completions lc
      WHERE lc.profile_id = NEW.profile_id
        AND (lc.completed_at AT TIME ZONE 'Asia/Kolkata')::date = v_today - i
    );
    v_streak := v_streak + 1;
  END LOOP;
  IF v_streak >= 7 THEN
    PERFORM fn_award_badge(NEW.profile_id, 'BADGE_S02');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_award_on_lesson_completion() FROM PUBLIC, anon, authenticated;

-- ── One-time catch-up: course tokens/badges the old nesting withheld ─────────
-- (learners who have completed every lesson of a course but hold no course token)
DO $$
DECLARE
  r record;
  v_token text;
BEGIN
  SELECT COALESCE((SELECT t.token_type FROM tokens t
                   WHERE t.is_active AND t.earn_trigger = 'course' LIMIT 1), 'banyan') INTO v_token;
  FOR r IN
    SELECT DISTINCT lc.profile_id, m.course_id
    FROM lesson_completions lc
    JOIN lessons l ON l.lesson_id = lc.lesson_id
    JOIN modules m ON m.module_id = l.module_id
    WHERE m.course_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM lessons l2 JOIN modules m2 ON m2.module_id = l2.module_id
        WHERE m2.course_id = m.course_id
          AND NOT EXISTS (SELECT 1 FROM lesson_completions lc2
                          WHERE lc2.profile_id = lc.profile_id AND lc2.lesson_id = l2.lesson_id))
  LOOP
    PERFORM fn_award_token(r.profile_id, v_token, 1, 'course', r.course_id::text);
    PERFORM fn_award_badge(r.profile_id, 'BADGE_P05');
  END LOOP;
END $$;
