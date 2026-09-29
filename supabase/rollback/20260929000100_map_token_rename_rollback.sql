-- ROLLBACK of 20260929000100_map_token_rename.sql (reverse order: ashoka->peepal first, then jasmine->ashoka).
-- Guarded: only runs if the rename has been applied (a 'jasmine' catalogue row exists and 'peepal' does not).
DO $rollback$
BEGIN
  IF EXISTS (SELECT 1 FROM tokens WHERE token_type = 'jasmine') AND NOT EXISTS (SELECT 1 FROM tokens WHERE token_type = 'peepal') THEN
    UPDATE user_tokens SET token_type = 'peepal' WHERE token_type = 'ashoka';
    UPDATE user_tokens SET token_type = 'ashoka' WHERE token_type = 'jasmine';
    UPDATE tokens SET token_type = 'peepal', token_name = 'Peepal Leaf', token_icon = '🍃',
           description = 'Sacred fig — awarded when a level is fully completed' WHERE token_type = 'ashoka';
    UPDATE tokens SET token_type = 'ashoka', token_name = 'Ashoka Token', token_icon = '🌸',
           description = 'Sacred tree — awarded when a module is fully completed' WHERE token_type = 'jasmine';
  END IF;
END
$rollback$;

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

DROP FUNCTION IF EXISTS public.admin_get_tokens();
CREATE FUNCTION public.admin_get_tokens() RETURNS TABLE(profile_id uuid, display_name text, tulsi integer, ashoka integer, lotus integer, peepal integer, banyan integer, dharma integer, total integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.display_name, '(no name)')::text,
    COALESCE(SUM(CASE WHEN ut.token_type = 'tulsi'  THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN ut.token_type = 'ashoka' THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN ut.token_type = 'lotus'  THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN ut.token_type = 'peepal' THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN ut.token_type = 'banyan' THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN ut.token_type = 'dharma' THEN ut.quantity ELSE 0 END), 0)::int,
    COALESCE(SUM(ut.quantity), 0)::int
  FROM profiles p
  INNER JOIN user_tokens ut ON ut.profile_id = p.id
  GROUP BY p.id, p.display_name
  ORDER BY SUM(ut.quantity) DESC;
END;
$$;
GRANT ALL ON FUNCTION public.admin_get_tokens() TO anon, authenticated, service_role;
