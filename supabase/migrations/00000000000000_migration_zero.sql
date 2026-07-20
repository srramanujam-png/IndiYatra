--
-- PostgreSQL database dump
--

\restrict XgECtIrobbSIMboif5UxvKIT5SNjoqIZ8WD0vEyHkzmkOQfC6TEkH4iQGI5zjMx

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: admin_get_badge_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_badge_counts() RETURNS TABLE(badge_id text, earned_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT ub.badge_id, COUNT(*)::int
  FROM user_badges ub
  GROUP BY ub.badge_id;
END;
$$;


--
-- Name: admin_get_tokens(); Type: FUNCTION; Schema: public; Owner: -
--

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


--
-- Name: admin_get_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_users() RETURNS TABLE(profile_id uuid, display_name text, role_id text, role_name text, created_at timestamp with time zone, lessons_completed integer, dharma_points integer)
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
    COALESCE(urm.role_id, 'ROLE_04')::text,
    COALESCE(r.role_name, 'Learner')::text,
    p.created_at,
    COUNT(DISTINCT lc.lesson_id)::int,
    COALESCE(SUM(lc.points_earned), 0)::int
  FROM profiles p
  LEFT JOIN user_roles_mapping urm ON urm.profile_id = p.id AND urm.role_id != 'ROLE_04'
  LEFT JOIN roles r ON r.role_id = urm.role_id
  LEFT JOIN lesson_completions lc ON lc.profile_id = p.id
  GROUP BY p.id, p.display_name, urm.role_id, r.role_name, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;


--
-- Name: admin_set_editorial_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_editorial_role(p_profile uuid, p_role text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_role_id text;
BEGIN
  IF NOT is_supervisor_or_admin() THEN
    RAISE EXCEPTION 'permission denied: supervisor or admin required';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('editor','verifier','supervisor','creator') THEN
    RAISE EXCEPTION 'invalid role %', p_role;
  END IF;

  -- Clear existing editorial roles (never admin/learner rows)
  DELETE FROM user_roles_mapping urm
  USING roles r
  WHERE r.role_id = urm.role_id
    AND urm.profile_id = p_profile
    AND LOWER(r.role_name) IN ('editor','verifier','supervisor','creator');

  IF p_role IS NOT NULL THEN
    SELECT r.role_id INTO v_role_id FROM roles r WHERE LOWER(r.role_name) = p_role;
    IF v_role_id IS NULL THEN
      RAISE EXCEPTION 'role % not found in roles table', p_role;
    END IF;
    INSERT INTO user_roles_mapping (profile_id, role_id)
    VALUES (p_profile, v_role_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;


--
-- Name: assign_content_role(uuid, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_content_role(p_profile_id uuid, p_content_type text, p_content_id text, p_language_id text, p_sub_role text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only supervisors and admins may assign content roles
  IF NOT is_supervisor_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: caller is not a supervisor or admin';
  END IF;

  INSERT INTO content_role_assignments
    (profile_id, content_type, content_id, language_id, sub_role, assigned_by)
  VALUES
    (p_profile_id, p_content_type, p_content_id, p_language_id, p_sub_role, auth.uid())
  ON CONFLICT (profile_id, content_type, content_id, language_id, sub_role)
  DO NOTHING;
END;
$$;


--
-- Name: contains_profanity(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.contains_profanity(p_text text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  norm text;
  collapsed text;
  r record;
BEGIN
  IF p_text IS NULL OR p_text = '' THEN RETURN false; END IF;

  norm := translate(lower(p_text), '013457@$!', 'oieastasi');
  -- "fuuuuck" → "fuck": collapse every repeated-letter run to one letter.
  -- Both variants are checked, so blocklist words with legit double letters
  -- (e.g. "tatti") still match via norm.
  collapsed := regexp_replace(norm, '(.)\1+', '\1', 'g');

  FOR r IN SELECT word, match_mode FROM blocked_words LOOP
    IF r.match_mode = 'substr' THEN
      IF position(r.word IN norm) > 0 OR position(r.word IN collapsed) > 0 THEN
        RETURN true;
      END IF;
    ELSE
      IF norm ~ ('\m' || r.word || '\M') OR collapsed ~ ('\m' || r.word || '\M') THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;
  RETURN false;
END;
$_$;


--
-- Name: fn_award_badge(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_award_badge(p_profile uuid, p_badge text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  INSERT INTO user_badges (profile_id, badge_id)
  SELECT p_profile, b.badge_id FROM badges b
  WHERE b.badge_id = p_badge AND b.is_active
  ON CONFLICT (profile_id, badge_id) DO NOTHING;
$$;


--
-- Name: fn_award_on_lesson_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_award_on_lesson_completion() RETURNS trigger
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


--
-- Name: fn_award_token(uuid, text, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_award_token(p_profile uuid, p_type text, p_qty integer, p_source_type text, p_source_id text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  INSERT INTO user_tokens (profile_id, token_type, quantity, source_type, source_id)
  SELECT p_profile, p_type, p_qty, p_source_type, p_source_id
  WHERE NOT EXISTS (
    SELECT 1 FROM user_tokens ut
    WHERE ut.profile_id = p_profile AND ut.token_type = p_type
      AND ut.source_type = p_source_type
      AND ut.source_id IS NOT DISTINCT FROM p_source_id
  );
$$;


--
-- Name: get_all_drafts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_drafts() RETURNS TABLE(id uuid, content_type text, content_id text, language_id text, status text, due_date date, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, assigned_to uuid, editor_name text, assigner_name text, sub_role text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    d.id, d.content_type, d.content_id, d.language_id,
    d.status, d.due_date, d.notes, d.created_at, d.updated_at,
    d.assigned_to,
    COALESCE(e.display_name, e.id::text) AS editor_name,
    COALESCE(a.display_name, a.id::text) AS assigner_name,
    cra.sub_role
  FROM content_drafts d
  LEFT JOIN profiles e ON e.id = d.assigned_to
  LEFT JOIN profiles a ON a.id = d.assigned_by
  LEFT JOIN content_role_assignments cra
    ON  cra.profile_id   = d.assigned_to
    AND cra.content_type = d.content_type
    AND cra.content_id   = d.content_id
    AND (
          (cra.language_id IS NULL AND d.language_id IS NULL)
          OR cra.language_id = d.language_id
        )
  ORDER BY d.created_at DESC;
$$;


--
-- Name: get_course_learner_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_course_learner_counts() RETURNS TABLE(course_id text, learner_count bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT course_id, COUNT(DISTINCT profile_id) AS learner_count
  FROM lesson_completions
  GROUP BY course_id;
$$;


--
-- Name: get_course_tree(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_course_tree(p_course_id uuid) RETURNS TABLE(level_id text, theme_id uuid, theme_title text, theme_sort integer, module_id uuid, module_name text, module_sort integer, module_image_url text, lesson_id uuid, lesson_name text, lesson_sort integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    m.level_id,
    t.theme_id,
    t.title            AS theme_title,
    t.sort_order       AS theme_sort,
    m.module_id,
    m.module_name,
    m.sort_order       AS module_sort,
    m.cover_image_url  AS module_image_url,
    l.lesson_id,
    l.lesson_name,
    l.sort_order       AS lesson_sort
  FROM modules m
  JOIN themes  t ON t.theme_id  = m.theme_id
  JOIN lessons l ON l.module_id = m.module_id
  WHERE m.course_id = p_course_id
  ORDER BY m.level_id, t.sort_order, m.sort_order, l.sort_order;
$$;


--
-- Name: get_editorial_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_editorial_role() RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE

    -- Admin: unconditional supervisor
    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'admin'
    ) THEN 'supervisor'

    -- Creator with at least one supervisor sub_role
    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'creator'
    ) AND EXISTS (
      SELECT 1 FROM content_role_assignments
      WHERE profile_id = auth.uid() AND sub_role = 'supervisor'
    ) THEN 'supervisor'

    -- Creator with at least one verifier sub_role (but no supervisor)
    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'creator'
    ) AND EXISTS (
      SELECT 1 FROM content_role_assignments
      WHERE profile_id = auth.uid() AND sub_role = 'verifier'
    ) THEN 'verifier'

    -- Creator (any sub_role or none) → editor view
    WHEN EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'creator'
    ) THEN 'editor'

    ELSE NULL
  END;
$$;


--
-- Name: get_editorial_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_editorial_staff() RETURNS TABLE(profile_id uuid, display_name text, role_id text, role_label text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT DISTINCT ON (p.id)
    p.id                                                           AS profile_id,
    COALESCE(p.display_name, split_part(p.id::text, '-', 1))      AS display_name,
    urm.role_id,
    LOWER(r.role_name)                                             AS role_label
  FROM user_roles_mapping urm
  JOIN profiles p   ON p.id         = urm.profile_id
  JOIN roles    r   ON r.role_id    = urm.role_id
  WHERE LOWER(r.role_name) IN ('creator', 'admin')
  ORDER BY p.id, p.display_name;
$$;


--
-- Name: get_leaderboard(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_leaderboard(p_course_id uuid DEFAULT NULL::uuid, p_profile_id uuid DEFAULT NULL::uuid) RETURNS TABLE(rank integer, profile_id uuid, display_name text, plant_tokens integer, lessons_completed integer, snippets_read integer, is_current_user boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH
  plant_totals AS (
    SELECT profile_id, COUNT(*)::int AS plant_count
    FROM user_tokens
    WHERE token_type != 'dharma'
    GROUP BY profile_id
  ),
  deduped_completions AS (
    SELECT DISTINCT ON (profile_id, lesson_id)
      profile_id, lesson_id, course_id, snippet_count
    FROM lesson_completions
    ORDER BY profile_id, lesson_id, completed_at DESC NULLS LAST
  ),
  full_ranking AS (
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(pt.plant_count, 0) DESC,
                 COUNT(DISTINCT dc.lesson_id) DESC
      )::int                                              AS rank,
      p.id                                                AS profile_id,
      -- first word of display_name only; 'Traveller' fallback
      COALESCE(
        NULLIF(split_part(TRIM(p.display_name), ' ', 1), ''),
        'Traveller'
      )::text                                             AS display_name,
      COALESCE(pt.plant_count, 0)::int                    AS plant_tokens,
      COUNT(DISTINCT dc.lesson_id)::int                   AS lessons_completed,
      COALESCE(SUM(dc.snippet_count), 0)::int             AS snippets_read,
      (p.id = p_profile_id)                               AS is_current_user
    FROM profiles p
    LEFT JOIN plant_totals pt ON pt.profile_id = p.id
    LEFT JOIN deduped_completions dc
      ON  dc.profile_id = p.id
      AND (p_course_id IS NULL OR dc.course_id = p_course_id)
    WHERE (p.leaderboard_visible OR p.id = p_profile_id)
    GROUP BY p.id, p.display_name, pt.plant_count
    HAVING COUNT(DISTINCT dc.lesson_id) > 0
        OR COALESCE(pt.plant_count, 0) > 0
  ),
  top25 AS (
    SELECT * FROM full_ranking ORDER BY rank LIMIT 25
  ),
  my_row AS (
    SELECT * FROM full_ranking
    WHERE profile_id = p_profile_id
      AND profile_id NOT IN (SELECT profile_id FROM top25)
  )
  SELECT * FROM top25
  UNION ALL
  SELECT * FROM my_row
  ORDER BY rank;
$$;


--
-- Name: get_my_drafts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_drafts() RETURNS TABLE(id uuid, content_type text, content_id text, language_id text, status text, due_date date, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, assigner_name text, sub_role text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    d.id, d.content_type, d.content_id, d.language_id,
    d.status, d.due_date, d.notes, d.created_at, d.updated_at,
    COALESCE(a.display_name, a.id::text) AS assigner_name,
    cra.sub_role
  FROM content_drafts d
  LEFT JOIN profiles a ON a.id = d.assigned_by
  LEFT JOIN content_role_assignments cra
    ON  cra.profile_id   = auth.uid()
    AND cra.content_type = d.content_type
    AND cra.content_id   = d.content_id
    AND (cra.language_id IS NOT DISTINCT FROM d.language_id)
  WHERE d.assigned_to = auth.uid()
  ORDER BY d.due_date NULLS LAST, d.created_at DESC;
$$;


--
-- Name: get_quiz_questions_secure(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_quiz_questions_secure(p_quiz_id text) RETURNS TABLE(question_type text, question_id uuid, question_key integer, language text, snippet_id uuid, question text, hint text, options text[], explanation text, key_term text, key_term_meaning text, life_connection text, source_citation text, asset_id uuid)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_quiz_ranks(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_quiz_ranks(p_profile_id uuid) RETURNS TABLE(scope_type text, scope_id text, user_rank bigint, total_users bigint)
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


--
-- Name: get_recommendations(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_recommendations(p_profile_id uuid, p_limit integer DEFAULT 8) RETURNS TABLE(lesson_id text, lesson_name text, module_id text, course_id text, theme_id text, theme_title text, course_name text, tag_names text[], tag_overlap integer, total_completions bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with
  -- 1. Lessons already seen by this user
  user_seen as (
    select lesson_id from lesson_completions where profile_id = p_profile_id
    union
    select lesson_id from lesson_progress    where profile_id = p_profile_id
  ),

  -- 2. Snippet ids from completed lessons (strongest signal, weighted 3x)
  completed_snippets as (
    select lsm.snippet_id
    from   lesson_completions lc
    join   lesson_snippet_mapping lsm on lsm.lesson_id = lc.lesson_id
    where  lc.profile_id = p_profile_id
  ),

  -- 3. Snippet ids the user explicitly liked (strong signal, weighted 2x)
  liked_snippets as (
    select snippet_id
    from   snippet_likes
    where  profile_id = p_profile_id
  ),

  -- 4. Snippet ids from viewed (not completed) lessons (weak signal, weighted 1x)
  viewed_snippets as (
    select lsm.snippet_id
    from   lesson_views lv
    join   lesson_snippet_mapping lsm on lsm.lesson_id = lv.lesson_id
    where  lv.profile_id = p_profile_id
  ),

  -- 5. Weighted interest term_ids drawn from snippet tags
  interest_terms as (
    -- completed snippets: 3x weight
    select ctm.term_id
    from   completed_snippets cs
    join   content_taxonomy_mapping ctm
           on ctm.entity_id = cs.snippet_id::text and ctm.entity_type = 'snippet'
    union all
    select ctm.term_id
    from   completed_snippets cs
    join   content_taxonomy_mapping ctm
           on ctm.entity_id = cs.snippet_id::text and ctm.entity_type = 'snippet'
    union all
    select ctm.term_id
    from   completed_snippets cs
    join   content_taxonomy_mapping ctm
           on ctm.entity_id = cs.snippet_id::text and ctm.entity_type = 'snippet'
    -- liked snippets: 2x weight
    union all
    select ctm.term_id
    from   liked_snippets ls
    join   content_taxonomy_mapping ctm
           on ctm.entity_id = ls.snippet_id::text and ctm.entity_type = 'snippet'
    union all
    select ctm.term_id
    from   liked_snippets ls
    join   content_taxonomy_mapping ctm
           on ctm.entity_id = ls.snippet_id::text and ctm.entity_type = 'snippet'
    -- viewed snippets: 1x weight
    union all
    select ctm.term_id
    from   viewed_snippets vs
    join   content_taxonomy_mapping ctm
           on ctm.entity_id = vs.snippet_id::text and ctm.entity_type = 'snippet'
  ),

  -- 6. Distinct interest term ids
  interest_set as (
    select distinct term_id from interest_terms
  ),

  -- 7. Candidate lessons: unread + have at least one snippet
  candidates as (
    select
      l.lesson_id,
      l.lesson_name,
      l.module_id,
      m.course_id,
      m.theme_id
    from   lessons l
    join   modules m on m.module_id = l.module_id
    where  exists (
             select 1 from lesson_snippet_mapping lsm
             where  lsm.lesson_id = l.lesson_id
           )
      and  l.lesson_id not in (select lesson_id from user_seen)
  ),

  -- 8. Score candidates: count how many of their snippets' tags match interest set
  scored as (
    select
      c.lesson_id,
      c.lesson_name,
      c.module_id,
      c.course_id,
      c.theme_id,
      coalesce(
        (select count(distinct ctm.term_id)::int
         from   lesson_snippet_mapping lsm
         join   content_taxonomy_mapping ctm
                on ctm.entity_id = lsm.snippet_id::text and ctm.entity_type = 'snippet'
         where  lsm.lesson_id = c.lesson_id
           and  ctm.term_id in (select term_id from interest_set)),
        0
      ) as tag_overlap
    from candidates c
  ),

  -- 9. Tag display names for each candidate lesson (via its snippets)
  lesson_tag_names as (
    select
      lsm.lesson_id,
      array_agg(distinct tt.name order by tt.name) as tag_names
    from   lesson_snippet_mapping lsm
    join   content_taxonomy_mapping ctm
           on ctm.entity_id = lsm.snippet_id::text and ctm.entity_type = 'snippet'
    join   taxonomy_terms tt on tt.term_id = ctm.term_id
    where  lsm.lesson_id in (select lesson_id from scored)
    group  by lsm.lesson_id
  ),

  -- 10. Lesson popularity
  popularity as (
    select lesson_id, count(*) as total_completions
    from   lesson_completions
    group  by lesson_id
  )

  select
    s.lesson_id,
    s.lesson_name,
    s.module_id,
    s.course_id,
    s.theme_id,
    t.title                               as theme_title,
    co.course_name,
    coalesce(ltn.tag_names, '{}'::text[]) as tag_names,
    s.tag_overlap,
    coalesce(p.total_completions, 0)      as total_completions
  from   scored s
  left join themes           t   on t.theme_id   = s.theme_id
  left join courses          co  on co.course_id  = s.course_id
  left join lesson_tag_names ltn on ltn.lesson_id = s.lesson_id
  left join popularity       p   on p.lesson_id   = s.lesson_id
  order by s.tag_overlap desc, coalesce(p.total_completions, 0) desc
  limit  p_limit;
$$;


--
-- Name: get_review_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_review_queue() RETURNS TABLE(id uuid, content_type text, content_id text, language_id text, status text, due_date date, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, editor_name text, sub_role text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    d.id, d.content_type, d.content_id, d.language_id,
    d.status, d.due_date, d.notes, d.created_at, d.updated_at,
    COALESCE(e.display_name, e.id::text) AS editor_name,
    cra.sub_role
  FROM content_drafts d
  LEFT JOIN profiles e ON e.id = d.assigned_to
  LEFT JOIN content_role_assignments cra
    ON  cra.profile_id   = auth.uid()
    AND cra.content_type = d.content_type
    AND cra.content_id   = d.content_id
    AND (cra.language_id IS NOT DISTINCT FROM d.language_id)
  WHERE d.status IN ('submitted', 'needs_revision', 'approved')
  ORDER BY d.updated_at DESC;
$$;


--
-- Name: get_team_members(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_team_members() RETURNS TABLE(profile_id uuid, display_name text, global_roles text[], assignment_count bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT is_supervisor_or_admin() THEN
    RAISE EXCEPTION 'permission denied: supervisor or admin required';
  END IF;

  RETURN QUERY
  WITH role_rows AS (
    SELECT urm.profile_id AS pid, LOWER(r.role_name) AS rn
    FROM user_roles_mapping urm
    JOIN roles r ON r.role_id = urm.role_id
    WHERE LOWER(r.role_name) IN ('editor','verifier','supervisor','creator','admin')
  ),
  assign_rows AS (
    SELECT cra.profile_id AS pid, count(*) AS cnt
    FROM content_role_assignments cra
    GROUP BY cra.profile_id
  ),
  member_ids AS (
    SELECT pid FROM role_rows
    UNION
    SELECT pid FROM assign_rows
  )
  SELECT
    p.id,
    COALESCE(NULLIF(TRIM(p.display_name), ''), 'Traveller ' || left(p.id::text, 8)),
    COALESCE((SELECT array_agg(DISTINCT rr.rn) FROM role_rows rr WHERE rr.pid = p.id), '{}'),
    COALESCE((SELECT ar.cnt FROM assign_rows ar WHERE ar.pid = p.id), 0)
  FROM member_ids m
  JOIN profiles p ON p.id = m.pid
  ORDER BY 2;
END;
$$;


--
-- Name: get_top_liked_items(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_liked_items(p_limit integer DEFAULT 10, p_min_stories integer DEFAULT 4, p_min_lessons integer DEFAULT 2) RETURNS TABLE(content_type text, content_id text, name text, sub text, item_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH module_likes AS (
    SELECT lk.content_id, m.module_name AS name, t.title AS sub
    FROM likes lk
    JOIN modules m      ON lk.content_id::uuid = m.module_id
    LEFT JOIN themes t  ON m.theme_id           = t.theme_id
    WHERE lk.content_type = 'module'
  ),
  lesson_likes AS (
    SELECT lk.content_id, l.lesson_name AS name, t.title AS sub
    FROM likes lk
    JOIN lessons l      ON lk.content_id::uuid = l.lesson_id
    LEFT JOIN modules m ON l.module_id          = m.module_id
    LEFT JOIN themes t  ON m.theme_id           = t.theme_id
    WHERE lk.content_type = 'lesson'
  ),
  -- One row per snippet_likes.id: a snippet can map to more than one lesson
  -- via lesson_snippet_mapping, so pick a single mapping (DISTINCT ON) before
  -- counting — otherwise one like could get counted more than once.
  snippet_likes_dedup AS (
    SELECT DISTINCT ON (sl.id)
      sl.id, sl.snippet_id,
      COALESCE(
        (SELECT st.hook FROM snippet_translations st WHERE st.snippet_id = sc.snippet_id LIMIT 1),
        'Snippet'
      ) AS name,
      COALESCE(l.lesson_name, t.title, c.course_name) AS sub
    FROM snippet_likes sl
    JOIN snippet_core sc                     ON sl.snippet_id = sc.snippet_id
    LEFT JOIN lesson_snippet_mapping lsm     ON lsm.snippet_id = sc.snippet_id
    LEFT JOIN lessons l ON lsm.lesson_id = l.lesson_id
    LEFT JOIN modules m ON l.module_id   = m.module_id
    LEFT JOIN themes  t ON m.theme_id    = t.theme_id
    LEFT JOIN courses c ON m.course_id   = c.course_id
    ORDER BY sl.id, lsm.order_index
  ),
  ranked AS (
    SELECT 'module'::text AS content_type, content_id, name, sub, COUNT(*) AS item_count
    FROM module_likes GROUP BY content_id, name, sub

    UNION ALL

    SELECT 'lesson'::text, content_id, name, sub, COUNT(*)
    FROM lesson_likes GROUP BY content_id, name, sub

    UNION ALL

    SELECT 'story'::text, snippet_id::text, name, sub, COUNT(*)
    FROM snippet_likes_dedup GROUP BY snippet_id, name, sub
  ),
  floor_stories AS (
    SELECT * FROM ranked WHERE content_type = 'story'  ORDER BY item_count DESC LIMIT p_min_stories
  ),
  floor_lessons AS (
    SELECT * FROM ranked WHERE content_type = 'lesson' ORDER BY item_count DESC LIMIT p_min_lessons
  ),
  guaranteed AS (
    SELECT * FROM floor_stories
    UNION ALL
    SELECT * FROM floor_lessons
  ),
  backfill AS (
    SELECT r.* FROM ranked r
    WHERE NOT EXISTS (
      SELECT 1 FROM guaranteed g
      WHERE g.content_type = r.content_type AND g.content_id = r.content_id
    )
    ORDER BY r.item_count DESC
    LIMIT GREATEST(p_limit - (SELECT COUNT(*) FROM guaranteed), 0)
  )
  SELECT * FROM (
    SELECT * FROM guaranteed
    UNION ALL
    SELECT * FROM backfill
  ) final_list
  ORDER BY item_count DESC
  LIMIT p_limit;
$$;


--
-- Name: get_top_liked_lessons(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_liked_lessons(p_limit integer DEFAULT 20) RETURNS TABLE(lesson_id uuid, like_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT content_id::uuid AS lesson_id, COUNT(*) AS like_count
  FROM likes
  WHERE content_type = 'lesson'
  GROUP BY content_id
  ORDER BY like_count DESC
  LIMIT p_limit;
$$;


--
-- Name: get_top_saved_items(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_saved_items(p_limit integer DEFAULT 10, p_min_stories integer DEFAULT 4, p_min_lessons integer DEFAULT 2) RETURNS TABLE(content_type text, content_id text, name text, sub text, item_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH module_saves AS (
    SELECT b.content_id, m.module_name AS name, t.title AS sub
    FROM bookmarks b
    JOIN modules m      ON b.content_id::uuid = m.module_id
    LEFT JOIN themes t  ON m.theme_id          = t.theme_id
    WHERE b.content_type = 'module'
  ),
  lesson_saves AS (
    SELECT b.content_id, l.lesson_name AS name, t.title AS sub
    FROM bookmarks b
    JOIN lessons l      ON b.content_id::uuid = l.lesson_id
    LEFT JOIN modules m ON l.module_id         = m.module_id
    LEFT JOIN themes t  ON m.theme_id          = t.theme_id
    WHERE b.content_type = 'lesson'
  ),
  snippet_saves_dedup AS (
    SELECT DISTINCT ON (b.id)
      b.id, b.content_id,
      COALESCE(
        (SELECT st.hook FROM snippet_translations st WHERE st.snippet_id = sc.snippet_id LIMIT 1),
        'Snippet'
      ) AS name,
      COALESCE(l.lesson_name, t.title, c.course_name) AS sub
    FROM bookmarks b
    JOIN snippet_core sc                 ON b.content_id::uuid = sc.snippet_id
    LEFT JOIN lesson_snippet_mapping lsm ON lsm.snippet_id     = sc.snippet_id
    LEFT JOIN lessons l ON lsm.lesson_id = l.lesson_id
    LEFT JOIN modules m ON l.module_id   = m.module_id
    LEFT JOIN themes  t ON m.theme_id    = t.theme_id
    LEFT JOIN courses c ON m.course_id   = c.course_id
    WHERE b.content_type = 'snippet'
    ORDER BY b.id, lsm.order_index
  ),
  ranked AS (
    SELECT 'module'::text AS content_type, content_id, name, sub, COUNT(*) AS item_count
    FROM module_saves GROUP BY content_id, name, sub

    UNION ALL

    SELECT 'lesson'::text, content_id, name, sub, COUNT(*)
    FROM lesson_saves GROUP BY content_id, name, sub

    UNION ALL

    SELECT 'story'::text, content_id, name, sub, COUNT(*)
    FROM snippet_saves_dedup GROUP BY content_id, name, sub
  ),
  floor_stories AS (
    SELECT * FROM ranked WHERE content_type = 'story'  ORDER BY item_count DESC LIMIT p_min_stories
  ),
  floor_lessons AS (
    SELECT * FROM ranked WHERE content_type = 'lesson' ORDER BY item_count DESC LIMIT p_min_lessons
  ),
  guaranteed AS (
    SELECT * FROM floor_stories
    UNION ALL
    SELECT * FROM floor_lessons
  ),
  backfill AS (
    SELECT r.* FROM ranked r
    WHERE NOT EXISTS (
      SELECT 1 FROM guaranteed g
      WHERE g.content_type = r.content_type AND g.content_id = r.content_id
    )
    ORDER BY r.item_count DESC
    LIMIT GREATEST(p_limit - (SELECT COUNT(*) FROM guaranteed), 0)
  )
  SELECT * FROM (
    SELECT * FROM guaranteed
    UNION ALL
    SELECT * FROM backfill
  ) final_list
  ORDER BY item_count DESC
  LIMIT p_limit;
$$;


--
-- Name: get_top_saved_lessons(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_saved_lessons(p_limit integer DEFAULT 20) RETURNS TABLE(lesson_id uuid, save_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT content_id::uuid AS lesson_id, COUNT(*) AS save_count
  FROM bookmarks
  WHERE content_type = 'lesson'
  GROUP BY content_id
  ORDER BY save_count DESC
  LIMIT p_limit;
$$;


--
-- Name: get_user_bookmarks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_bookmarks() RETURNS TABLE(id uuid, content_type text, content_id text, saved_at timestamp with time zone, item_name text, lesson_name text, module_name text, module_id text, theme_title text, theme_id text, course_id text, course_name text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT * FROM (

    -- Lessons
    SELECT
      b.id, b.content_type, b.content_id, b.saved_at,
      l.lesson_name                AS item_name,
      l.lesson_name                AS lesson_name,
      m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM bookmarks b
    JOIN lessons l  ON b.content_id::uuid = l.lesson_id
    JOIN modules m  ON l.module_id        = m.module_id
    JOIN themes  t  ON m.theme_id         = t.theme_id
    LEFT JOIN courses c ON m.course_id    = c.course_id
    WHERE b.profile_id = auth.uid() AND b.content_type = 'lesson'

    UNION ALL

    -- Modules
    SELECT
      b.id, b.content_type, b.content_id, b.saved_at,
      m.module_name                AS item_name,
      NULL                         AS lesson_name,
      m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM bookmarks b
    JOIN modules m  ON b.content_id::uuid = m.module_id
    JOIN themes  t  ON m.theme_id         = t.theme_id
    LEFT JOIN courses c ON m.course_id    = c.course_id
    WHERE b.profile_id = auth.uid() AND b.content_type = 'module'

    UNION ALL

    -- Themes
    SELECT
      b.id, b.content_type, b.content_id, b.saved_at,
      t.title AS item_name,
      NULL, NULL, NULL,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      NULL, NULL
    FROM bookmarks b
    JOIN themes t ON b.content_id::uuid = t.theme_id
    WHERE b.profile_id = auth.uid() AND b.content_type = 'theme'

    UNION ALL

    -- Courses
    SELECT
      b.id, b.content_type, b.content_id, b.saved_at,
      c.course_name AS item_name,
      NULL, NULL, NULL, NULL, NULL,
      c.course_id::text            AS course_id,
      c.course_name
    FROM bookmarks b
    JOIN courses c ON b.content_id::uuid = c.course_id
    WHERE b.profile_id = auth.uid() AND b.content_type = 'course'

    UNION ALL

    -- Snippets
    SELECT * FROM (
      SELECT DISTINCT ON (b.id)
        b.id, b.content_type, b.content_id, b.saved_at,
        COALESCE(
          (SELECT st.hook FROM snippet_translations st
           WHERE st.snippet_id = sc.snippet_id LIMIT 1),
          'Snippet'
        )                            AS item_name,
        l.lesson_name,
        m.module_name,
        m.module_id::text            AS module_id,
        t.title                      AS theme_title,
        t.theme_id::text             AS theme_id,
        m.course_id::text            AS course_id,
        c.course_name
      FROM bookmarks b
      JOIN snippet_core sc             ON b.content_id::uuid = sc.snippet_id
      LEFT JOIN lesson_snippet_mapping lsm ON lsm.snippet_id = sc.snippet_id
      LEFT JOIN lessons l  ON lsm.lesson_id  = l.lesson_id
      LEFT JOIN modules m  ON l.module_id    = m.module_id
      LEFT JOIN themes  t  ON m.theme_id     = t.theme_id
      LEFT JOIN courses c  ON m.course_id    = c.course_id
      WHERE b.profile_id = auth.uid() AND b.content_type = 'snippet'
      ORDER BY b.id, lsm.order_index
    ) snippets

    UNION ALL

    -- Quizzes: quiz_id is text (quiz_sets PK), no cast needed
    SELECT
      b.id, b.content_type, b.content_id, b.saved_at,
      qs.title                     AS item_name,
      l.lesson_name,
      m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM bookmarks b
    JOIN quiz_sets qs    ON b.content_id = qs.quiz_id
    LEFT JOIN lessons l  ON qs.lesson_id  = l.lesson_id
    LEFT JOIN modules m  ON l.module_id   = m.module_id
    LEFT JOIN themes  t  ON m.theme_id    = t.theme_id
    LEFT JOIN courses c  ON m.course_id   = c.course_id
    WHERE b.profile_id = auth.uid() AND b.content_type = 'quiz'

    UNION ALL

    -- Questions: content_id is question_key (integer, stored as text).
    -- Matches whichever of snippet_questions / standalone_questions has that key.
    SELECT * FROM (
      SELECT DISTINCT ON (b.id)
        b.id, b.content_type, b.content_id, b.saved_at,
        COALESCE(sq.question, stq.question, 'Question') AS item_name,
        NULL::text AS lesson_name,
        NULL::text AS module_name,
        NULL::text AS module_id,
        NULL::text AS theme_title,
        NULL::text AS theme_id,
        NULL::text AS course_id,
        NULL::text AS course_name
      FROM bookmarks b
      LEFT JOIN snippet_questions    sq  ON sq.question_key::text  = b.content_id
      LEFT JOIN standalone_questions stq ON stq.question_key::text = b.content_id
      WHERE b.profile_id = auth.uid() AND b.content_type = 'question'
      ORDER BY b.id
    ) questions

  ) all_bookmarks
  ORDER BY saved_at DESC;
$$;


--
-- Name: get_user_likes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_likes() RETURNS TABLE(snippet_id text, liked_at timestamp with time zone, course_id text, theme_id text, module_id text, lesson_id text, course_name text, theme_title text, module_name text, lesson_name text, like_count integer, asset_id text, difficulty_level integer, hook text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    sl.snippet_id,
    sl.liked_at,
    sl.course_id,
    sl.theme_id,
    sl.module_id,
    sl.lesson_id,
    c.course_name,
    t.title        AS theme_title,
    m.module_name,
    l.lesson_name,
    sc.like_count,
    sc.asset_id,
    sc.difficulty_level,
    st.hook
  FROM snippet_likes sl
  JOIN snippet_core sc         ON sl.snippet_id  = sc.snippet_id
  LEFT JOIN courses  c         ON sl.course_id   = c.course_id
  LEFT JOIN themes   t         ON sl.theme_id    = t.theme_id
  LEFT JOIN modules  m         ON sl.module_id   = m.module_id
  LEFT JOIN lessons  l         ON sl.lesson_id   = l.lesson_id
  LEFT JOIN snippet_translations st
    ON sl.snippet_id = st.snippet_id AND st.language = 'eng'
  WHERE sl.profile_id = auth.uid()
  ORDER BY sl.liked_at DESC;
$$;


--
-- Name: get_user_likes_by_type(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_likes_by_type() RETURNS TABLE(id uuid, content_type text, content_id text, liked_at timestamp with time zone, item_name text, lesson_name text, module_name text, module_id text, theme_title text, theme_id text, course_id text, course_name text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT * FROM (

    -- Lessons
    SELECT
      lk.id, lk.content_type, lk.content_id, lk.liked_at,
      l.lesson_name                AS item_name,
      l.lesson_name                AS lesson_name,
      m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM likes lk
    JOIN lessons l  ON lk.content_id::uuid = l.lesson_id
    JOIN modules m  ON l.module_id         = m.module_id
    JOIN themes  t  ON m.theme_id          = t.theme_id
    LEFT JOIN courses c ON m.course_id     = c.course_id
    WHERE lk.profile_id = auth.uid() AND lk.content_type = 'lesson'

    UNION ALL

    -- Modules
    SELECT
      lk.id, lk.content_type, lk.content_id, lk.liked_at,
      m.module_name                AS item_name,
      NULL, m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM likes lk
    JOIN modules m  ON lk.content_id::uuid = m.module_id
    JOIN themes  t  ON m.theme_id          = t.theme_id
    LEFT JOIN courses c ON m.course_id     = c.course_id
    WHERE lk.profile_id = auth.uid() AND lk.content_type = 'module'

    UNION ALL

    -- Quizzes
    SELECT
      lk.id, lk.content_type, lk.content_id, lk.liked_at,
      qs.title                     AS item_name,
      l.lesson_name,
      m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM likes lk
    JOIN quiz_sets qs    ON lk.content_id = qs.quiz_id
    LEFT JOIN lessons l  ON qs.lesson_id  = l.lesson_id
    LEFT JOIN modules m  ON l.module_id   = m.module_id
    LEFT JOIN themes  t  ON m.theme_id    = t.theme_id
    LEFT JOIN courses c  ON m.course_id   = c.course_id
    WHERE lk.profile_id = auth.uid() AND lk.content_type = 'quiz'

    UNION ALL

    -- Questions
    SELECT * FROM (
      SELECT DISTINCT ON (lk.id)
        lk.id, lk.content_type, lk.content_id, lk.liked_at,
        COALESCE(sq.question, stq.question, 'Question') AS item_name,
        NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text
      FROM likes lk
      LEFT JOIN snippet_questions    sq  ON sq.question_key::text  = lk.content_id
      LEFT JOIN standalone_questions stq ON stq.question_key::text = lk.content_id
      WHERE lk.profile_id = auth.uid() AND lk.content_type = 'question'
      ORDER BY lk.id
    ) questions

    UNION ALL

    -- Snippets (existing snippet_likes table)
    SELECT * FROM (
      SELECT DISTINCT ON (sl.id)
        sl.id, 'snippet'::text AS content_type, sl.snippet_id::text AS content_id, sl.liked_at,
        COALESCE(
          (SELECT st.hook FROM snippet_translations st
           WHERE st.snippet_id = sc.snippet_id LIMIT 1),
          'Snippet'
        )                            AS item_name,
        l.lesson_name,
        m.module_name,
        m.module_id::text            AS module_id,
        t.title                      AS theme_title,
        t.theme_id::text             AS theme_id,
        m.course_id::text            AS course_id,
        c.course_name
      FROM snippet_likes sl
      JOIN snippet_core sc              ON sl.snippet_id = sc.snippet_id
      LEFT JOIN lesson_snippet_mapping lsm ON lsm.snippet_id = sc.snippet_id
      LEFT JOIN lessons l  ON lsm.lesson_id  = l.lesson_id
      LEFT JOIN modules m  ON l.module_id    = m.module_id
      LEFT JOIN themes  t  ON m.theme_id     = t.theme_id
      LEFT JOIN courses c  ON m.course_id    = c.course_id
      WHERE sl.profile_id = auth.uid()
      ORDER BY sl.id, lsm.order_index
    ) snippets

  ) all_likes
  ORDER BY liked_at DESC;
$$;


--
-- Name: get_workspace_access(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_workspace_access() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_role   text;
  v_creator boolean;
  v_assign boolean;
  v_admin  boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('role', NULL, 'is_creator', false,
      'has_assignments', false, 'is_admin', false, 'can_enter', false,
      'default_view', NULL);
  END IF;

  SELECT CASE
    WHEN bool_or(LOWER(r.role_name) = 'supervisor') THEN 'supervisor'
    WHEN bool_or(LOWER(r.role_name) = 'verifier')   THEN 'verifier'
    WHEN bool_or(LOWER(r.role_name) = 'editor')     THEN 'editor'
    ELSE NULL END,
    COALESCE(bool_or(LOWER(r.role_name) = 'creator'), false),
    COALESCE(bool_or(LOWER(r.role_name) = 'admin'),   false)
  INTO v_role, v_creator, v_admin
  FROM user_roles_mapping urm
  JOIN roles r ON r.role_id = urm.role_id
  WHERE urm.profile_id = v_uid;

  v_assign := EXISTS (SELECT 1 FROM content_role_assignments cra
                      WHERE cra.profile_id = v_uid);

  RETURN jsonb_build_object(
    'role',            v_role,
    'is_creator',      COALESCE(v_creator, false),
    'has_assignments', v_assign,
    'is_admin',        COALESCE(v_admin, false),
    'can_enter',       COALESCE(v_admin, false) OR v_role IS NOT NULL
                       OR COALESCE(v_creator, false) OR v_assign,
    'default_view',    COALESCE(v_role,
                         CASE WHEN COALESCE(v_admin,false) THEN 'supervisor'
                              WHEN v_assign OR COALESCE(v_creator,false) THEN 'editor'
                              ELSE NULL END)
  );
END;
$$;


--
-- Name: grade_quiz_answer(text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grade_quiz_answer(p_question_type text, p_question_id uuid, p_chosen text DEFAULT NULL::text) RETURNS TABLE(is_correct boolean, correct_option text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', left(split_part(new.email, '@', 1), 5)),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_roles_mapping (profile_id, role_id)
  values (new.id, 'ROLE_04');
  return new;
end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles_mapping urm
    JOIN roles r ON r.role_id = urm.role_id
    WHERE urm.profile_id = auth.uid()
      AND (urm.role_id = 'ROLE_01' OR LOWER(r.role_name) = 'admin')
  );
$$;


--
-- Name: is_editorial_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_editorial_staff() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles_mapping urm
    JOIN roles r ON r.role_id = urm.role_id
    WHERE urm.profile_id = auth.uid()
      AND LOWER(r.role_name) IN ('creator', 'admin')
  );
$$;


--
-- Name: is_supervisor_or_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_supervisor_or_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM user_roles_mapping urm
      JOIN roles r ON r.role_id = urm.role_id
      WHERE urm.profile_id = auth.uid()
        AND LOWER(r.role_name) = 'admin'
    )
    OR (
      EXISTS (
        SELECT 1
        FROM user_roles_mapping urm
        JOIN roles r ON r.role_id = urm.role_id
        WHERE urm.profile_id = auth.uid()
          AND LOWER(r.role_name) = 'creator'
      )
      AND EXISTS (
        SELECT 1 FROM content_role_assignments
        WHERE profile_id = auth.uid() AND sub_role = 'supervisor'
      )
    );
$$;


--
-- Name: publish_draft(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.publish_draft(p_draft_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_draft  content_drafts%ROWTYPE;
  v_data   jsonb;
  v_term   text;
  v_etype  text;
BEGIN
  -- ── Auth guard ─────────────────────────────────────────────
  IF NOT is_supervisor_or_admin() THEN
    RAISE EXCEPTION 'Access denied: supervisor or admin role required';
  END IF;

  -- ── Load draft ─────────────────────────────────────────────
  SELECT * INTO v_draft FROM content_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft % not found', p_draft_id;
  END IF;

  v_data := v_draft.draft_data;

  -- ── Apply content changes ──────────────────────────────────

  IF v_draft.content_type = 'snippet_translation' THEN
    -- Upsert the translation row (creates a new language row if one
    -- doesn't exist yet, or updates the existing one)
    INSERT INTO snippet_translations (
      snippet_id, language,
      hook, explanation,
      key_term, key_term_meaning,
      life_connection, quiz_recap,
      source_citation
    )
    VALUES (
      v_draft.content_id,
      v_draft.language_id,
      v_data->>'hook',
      v_data->>'explanation',
      v_data->>'key_term',
      v_data->>'key_term_meaning',
      v_data->>'life_connection',
      v_data->>'quiz_recap',
      v_data->>'source_citation'
    )
    ON CONFLICT (snippet_id, language) DO UPDATE SET
      hook              = EXCLUDED.hook,
      explanation       = EXCLUDED.explanation,
      key_term          = EXCLUDED.key_term,
      key_term_meaning  = EXCLUDED.key_term_meaning,
      life_connection   = EXCLUDED.life_connection,
      quiz_recap        = EXCLUDED.quiz_recap,
      source_citation   = EXCLUDED.source_citation;

    -- ── Publish quiz question if all five fields are present ───
    -- question, correct_option, and three wrong options must all be
    -- non-empty strings; if any are missing the block is skipped.
    IF (v_data->>'question')       IS NOT NULL AND (v_data->>'question')       <> '' AND
       (v_data->>'correct_option') IS NOT NULL AND (v_data->>'correct_option') <> '' AND
       (v_data->>'wrong_option_1') IS NOT NULL AND (v_data->>'wrong_option_1') <> '' AND
       (v_data->>'wrong_option_2') IS NOT NULL AND (v_data->>'wrong_option_2') <> '' AND
       (v_data->>'wrong_option_3') IS NOT NULL AND (v_data->>'wrong_option_3') <> ''
    THEN
      INSERT INTO snippet_questions (
        snippet_id, language,
        question,
        correct_option,
        wrong_option_1, wrong_option_2, wrong_option_3
      )
      VALUES (
        v_draft.content_id,
        v_draft.language_id,
        v_data->>'question',
        v_data->>'correct_option',
        v_data->>'wrong_option_1',
        v_data->>'wrong_option_2',
        v_data->>'wrong_option_3'
      )
      ON CONFLICT (snippet_id, language) DO UPDATE SET
        question       = EXCLUDED.question,
        correct_option = EXCLUDED.correct_option,
        wrong_option_1 = EXCLUDED.wrong_option_1,
        wrong_option_2 = EXCLUDED.wrong_option_2,
        wrong_option_3 = EXCLUDED.wrong_option_3;
    END IF;

    v_etype := 'snippet';

  ELSIF v_draft.content_type = 'lesson' THEN
    UPDATE lessons SET
      lesson_name        = COALESCE(NULLIF(v_data->>'lesson_name', ''),       lesson_name),
      lesson_description = COALESCE(NULLIF(v_data->>'lesson_description', ''), lesson_description)
    WHERE lesson_id = v_draft.content_id;

    v_etype := 'lesson';

  ELSE
    RAISE EXCEPTION 'Unknown content_type: %', v_draft.content_type;
  END IF;

  -- ── Apply taxonomy additions ───────────────────────────────
  -- draft_data.taxonomy_additions is an array of term_id strings
  -- e.g. ["TERM_001", "TERM_004"]
  IF jsonb_typeof(v_data->'taxonomy_additions') = 'array' THEN
    FOR v_term IN
      SELECT jsonb_array_elements_text(v_data->'taxonomy_additions')
    LOOP
      -- Only insert if the term exists; skip silently if already tagged
      IF EXISTS (SELECT 1 FROM taxonomy_terms WHERE term_id = v_term) THEN
        INSERT INTO content_taxonomy_mapping (term_id, entity_id, entity_type)
        VALUES (v_term, v_draft.content_id, v_etype)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- ── Mark draft published + log event ──────────────────────
  UPDATE content_drafts
  SET status = 'published', updated_at = now()
  WHERE id = p_draft_id;

  INSERT INTO content_workflow_events (draft_id, action, actor_id, comment)
  VALUES (p_draft_id, 'published', auth.uid(), 'Published to live content');

  RETURN true;
END;
$$;


--
-- Name: refresh_course_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_course_counts() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE courses c SET
    snippet_count = (
      SELECT COUNT(DISTINCT lsm.snippet_id)
      FROM modules m
      JOIN lessons l ON l.module_id = m.module_id
      JOIN lesson_snippet_mapping lsm ON lsm.lesson_id = l.lesson_id
      WHERE m.course_id = c.course_id
    ),
    language_count = (
      SELECT COUNT(DISTINCT st.language)
      FROM modules m
      JOIN lessons l ON l.module_id = m.module_id
      JOIN lesson_snippet_mapping lsm ON lsm.lesson_id = l.lesson_id
      JOIN snippet_translations st ON st.snippet_id = lsm.snippet_id
      WHERE m.course_id = c.course_id
    );
END;
$$;


--
-- Name: snippet_comments_profanity_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.snippet_comments_profanity_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF contains_profanity(NEW.body) THEN
    RAISE EXCEPTION 'COMMENT_BLOCKED: comment contains language that is not allowed'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: submit_quiz_attempt(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_quiz_attempt(p_quiz_id text, p_answers jsonb) RETURNS jsonb
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


--
-- Name: update_content_draft_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_content_draft_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_course_language_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_course_language_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE v_course_id text;
BEGIN
  SELECT t.course_id INTO v_course_id
  FROM lesson_snippet_mapping lsm
  JOIN lessons l ON lsm.lesson_id = l.lesson_id
  JOIN modules m ON l.module_id   = m.module_id
  JOIN themes  t ON m.theme_id    = t.theme_id
  WHERE lsm.snippet_id = COALESCE(NEW.snippet_id, OLD.snippet_id)
  LIMIT 1;

  IF v_course_id IS NOT NULL THEN
    UPDATE courses
    SET language_count = (
      SELECT COUNT(DISTINCT st.language)
      FROM snippet_translations st
      JOIN lesson_snippet_mapping lsm ON st.snippet_id = lsm.snippet_id
      JOIN lessons l                  ON lsm.lesson_id = l.lesson_id
      JOIN modules m                  ON l.module_id   = m.module_id
      JOIN themes  t                  ON m.theme_id    = t.theme_id
      WHERE t.course_id = v_course_id
    )
    WHERE course_id = v_course_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_course_snippet_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_course_snippet_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE v_course_id text;
BEGIN
  SELECT t.course_id INTO v_course_id
  FROM lessons l
  JOIN modules m ON l.module_id = m.module_id
  JOIN themes  t ON m.theme_id  = t.theme_id
  WHERE l.lesson_id = COALESCE(NEW.lesson_id, OLD.lesson_id)
  LIMIT 1;

  IF v_course_id IS NOT NULL THEN
    UPDATE courses
    SET snippet_count = (
      SELECT COUNT(*)
      FROM lesson_snippet_mapping lsm
      JOIN lessons l ON lsm.lesson_id = l.lesson_id
      JOIN modules m ON l.module_id   = m.module_id
      JOIN themes  t ON m.theme_id    = t.theme_id
      WHERE t.course_id = v_course_id
    )
    WHERE course_id = v_course_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_snippet_like_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_snippet_like_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE snippet_core SET like_count = like_count + 1
    WHERE snippet_id = NEW.snippet_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE snippet_core SET like_count = GREATEST(like_count - 1, 0)
    WHERE snippet_id = OLD.snippet_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: asset_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_library (
    asset_id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_path text NOT NULL,
    asset_type text DEFAULT 'IMAGE'::text NOT NULL,
    alt_text text,
    attribution text
);


--
-- Name: badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.badges (
    badge_id text NOT NULL,
    badge_name text NOT NULL,
    badge_icon text DEFAULT '🏆'::text NOT NULL,
    badge_category text NOT NULL,
    criteria_type text NOT NULL,
    criteria_value integer DEFAULT 1 NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT badges_badge_category_check CHECK ((badge_category = ANY (ARRAY['progression'::text, 'volume'::text, 'streak'::text, 'daily'::text])))
);


--
-- Name: blocked_words; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_words (
    word text NOT NULL,
    lang text DEFAULT 'en'::text NOT NULL,
    match_mode text DEFAULT 'word'::text NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT blocked_words_match_mode_check CHECK ((match_mode = ANY (ARRAY['word'::text, 'substr'::text])))
);


--
-- Name: bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    content_type text NOT NULL,
    content_id text NOT NULL,
    saved_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bookmarks_content_type_check CHECK ((content_type = ANY (ARRAY['lesson'::text, 'module'::text, 'theme'::text, 'course'::text, 'snippet'::text, 'quiz'::text, 'question'::text])))
);


--
-- Name: snippet_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snippet_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    snippet_id uuid,
    course_id uuid,
    liked_at timestamp with time zone DEFAULT now() NOT NULL,
    theme_id uuid,
    module_id uuid,
    lesson_id uuid
);


--
-- Name: bookmarks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookmarks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookmarks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookmarks_id_seq OWNED BY public.snippet_likes.id;


--
-- Name: comment_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid,
    snippet_id text,
    comment_body text NOT NULL,
    comment_author text,
    comment_author_id uuid,
    reporter_id uuid NOT NULL,
    reason text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    CONSTRAINT comment_reports_reason_check CHECK (((reason IS NULL) OR (char_length(reason) <= 300))),
    CONSTRAINT comment_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text, 'dismissed'::text])))
);


--
-- Name: content_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_type text NOT NULL,
    content_id text NOT NULL,
    language_id text,
    draft_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'unassigned'::text NOT NULL,
    assigned_to uuid,
    assigned_by uuid,
    due_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT content_drafts_content_type_check CHECK ((content_type = ANY (ARRAY['snippet_translation'::text, 'lesson'::text]))),
    CONSTRAINT content_drafts_status_check CHECK ((status = ANY (ARRAY['unassigned'::text, 'assigned'::text, 'in_draft'::text, 'submitted'::text, 'needs_revision'::text, 'approved'::text, 'published'::text, 'rejected'::text])))
);


--
-- Name: content_role_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_role_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    content_type text NOT NULL,
    content_id text NOT NULL,
    language_id text,
    sub_role text NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT content_role_assignments_content_type_check CHECK ((content_type = ANY (ARRAY['snippet_translation'::text, 'lesson'::text]))),
    CONSTRAINT content_role_assignments_sub_role_check CHECK ((sub_role = ANY (ARRAY['editor'::text, 'verifier'::text, 'supervisor'::text])))
);


--
-- Name: content_taxonomy_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_taxonomy_mapping (
    id bigint NOT NULL,
    term_id text,
    entity_id text NOT NULL,
    entity_type text NOT NULL,
    notes text,
    CONSTRAINT content_taxonomy_mapping_entity_type_check CHECK ((entity_type = ANY (ARRAY['snippet'::text, 'lesson'::text, 'module'::text, 'theme'::text, 'course'::text])))
);


--
-- Name: content_workflow_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_workflow_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    draft_id uuid NOT NULL,
    action text NOT NULL,
    actor_id uuid,
    comment text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    course_id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_name text NOT NULL,
    description text,
    asset_id uuid,
    course_number integer DEFAULT 1 NOT NULL,
    language_id text,
    sequential_unlock boolean DEFAULT false NOT NULL,
    snippet_count integer DEFAULT 0 NOT NULL,
    language_count integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    cover_image_url text
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id bigint NOT NULL,
    profile_id uuid NOT NULL,
    is_anonymous boolean DEFAULT false NOT NULL,
    event_type text NOT NULL,
    content_type text,
    content_id text,
    route text,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT events_content_id_check CHECK (((content_id IS NULL) OR (char_length(content_id) <= 100))),
    CONSTRAINT events_content_type_check CHECK (((content_type IS NULL) OR (content_type = ANY (ARRAY['snippet'::text, 'lesson'::text, 'module'::text, 'theme'::text, 'course'::text, 'quiz'::text, 'question'::text])))),
    CONSTRAINT events_event_type_check CHECK ((event_type = ANY (ARRAY['view'::text, 'like'::text, 'unlike'::text, 'bookmark'::text, 'unbookmark'::text, 'share'::text, 'complete'::text, 'quiz_start'::text, 'quiz_complete'::text, 'session_start'::text]))),
    CONSTRAINT events_route_check CHECK (((route IS NULL) OR (char_length(route) <= 200)))
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: featured_snippets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.featured_snippets (
    display_order integer NOT NULL,
    snippet_id uuid NOT NULL,
    set_by uuid,
    set_at timestamp with time zone DEFAULT now(),
    CONSTRAINT featured_snippets_display_order_check CHECK (((display_order >= 1) AND (display_order <= 10)))
);


--
-- Name: icons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.icons (
    icon_id text NOT NULL,
    asset_id uuid,
    mapping text NOT NULL
);


--
-- Name: languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.languages (
    language_id text NOT NULL,
    language_code text NOT NULL,
    language text NOT NULL
);


--
-- Name: lesson_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_completions (
    id bigint NOT NULL,
    profile_id uuid,
    lesson_id uuid,
    course_id uuid,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    points_earned integer DEFAULT 0,
    snippet_count smallint
);


--
-- Name: lesson_completions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lesson_completions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lesson_completions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lesson_completions_id_seq OWNED BY public.lesson_completions.id;


--
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_progress (
    profile_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    snippet_index smallint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lesson_snippet_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_snippet_mapping (
    id bigint NOT NULL,
    lesson_id uuid,
    snippet_id uuid,
    order_index integer DEFAULT 1 NOT NULL
);


--
-- Name: lesson_snippet_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lesson_snippet_mapping_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lesson_snippet_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lesson_snippet_mapping_id_seq OWNED BY public.lesson_snippet_mapping.id;


--
-- Name: lesson_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_views (
    id bigint NOT NULL,
    profile_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    active_seconds integer DEFAULT 0 NOT NULL,
    view_count integer DEFAULT 1 NOT NULL
);


--
-- Name: lesson_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lesson_views_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lesson_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lesson_views_id_seq OWNED BY public.lesson_views.id;


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    lesson_id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_number text,
    module_id uuid,
    lesson_name text NOT NULL,
    lesson_description text,
    asset_id uuid,
    language_id text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cover_image_url text
);


--
-- Name: levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.levels (
    level_id text NOT NULL,
    level_number integer NOT NULL,
    title text NOT NULL,
    description text,
    asset_id uuid
);


--
-- Name: likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    content_type text NOT NULL,
    content_id text NOT NULL,
    liked_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT likes_content_type_check CHECK ((content_type = ANY (ARRAY['module'::text, 'lesson'::text, 'quiz'::text, 'question'::text])))
);


--
-- Name: modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modules (
    module_id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_number text,
    module_name text NOT NULL,
    description text,
    level_id text,
    theme_id uuid,
    asset_id uuid,
    visibility text DEFAULT 'PUBLIC'::text NOT NULL,
    language_id text,
    course_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cover_image_url text,
    CONSTRAINT modules_visibility_check CHECK ((visibility = ANY (ARRAY['PUBLIC'::text, 'LOGGED_IN'::text, 'RESTRICTED'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text,
    avatar_url text,
    preferred_language text DEFAULT 'LANG_03'::text NOT NULL,
    font_size text DEFAULT 'md'::text NOT NULL,
    last_visited_route text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    snippet_share_message text,
    share_message text,
    leaderboard_visible boolean DEFAULT true NOT NULL,
    CONSTRAINT profiles_font_size_check CHECK ((font_size = ANY (ARRAY['sm'::text, 'md'::text, 'lg'::text])))
);


--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_attempts (
    id bigint NOT NULL,
    profile_id uuid,
    quiz_id text,
    score integer,
    max_score integer,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    answers jsonb
);


--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quiz_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quiz_attempts_id_seq OWNED BY public.quiz_attempts.id;


--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id text NOT NULL,
    question_type text NOT NULL,
    question_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    question_key integer,
    CONSTRAINT quiz_questions_question_type_check CHECK ((question_type = ANY (ARRAY['snippet'::text, 'standalone'::text])))
);


--
-- Name: COLUMN quiz_questions.question_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quiz_questions.question_key IS 'Language-agnostic reference. At runtime getQuizQuestions resolves this to the
   appropriate language row in snippet_questions or standalone_questions.';


--
-- Name: quiz_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_sets (
    quiz_id text NOT NULL,
    title text NOT NULL,
    description text,
    lesson_id uuid,
    module_id uuid,
    time_limit integer,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    theme_id uuid,
    level_id text,
    course_id uuid,
    shuffle_questions boolean DEFAULT false NOT NULL,
    question_time_limit integer,
    question_pool_size integer,
    pass_percent integer,
    max_attempts integer
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    role_id text NOT NULL,
    role_name text NOT NULL,
    description text
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    key text NOT NULL,
    value text,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: snippet_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snippet_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snippet_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    user_name text,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT snippet_comments_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 500)))
);


--
-- Name: snippet_core; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snippet_core (
    snippet_id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid,
    difficulty_level integer DEFAULT 1 NOT NULL,
    snippet_value integer DEFAULT 10 NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    import_key integer,
    CONSTRAINT snippet_core_difficulty_level_check CHECK (((difficulty_level >= 1) AND (difficulty_level <= 5))),
    CONSTRAINT snippet_core_status_check CHECK ((status = ANY (ARRAY['PUBLISHED'::text, 'DRAFT'::text, 'ARCHIVED'::text])))
);


--
-- Name: snippet_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snippet_questions (
    question_id uuid DEFAULT gen_random_uuid() NOT NULL,
    snippet_id uuid NOT NULL,
    language text NOT NULL,
    question text NOT NULL,
    correct_option text NOT NULL,
    wrong_option_1 text NOT NULL,
    wrong_option_2 text NOT NULL,
    wrong_option_3 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    hint text,
    question_key integer
);


--
-- Name: COLUMN snippet_questions.hint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.snippet_questions.hint IS 'Optional hint shown on learner request. May carry a score penalty.';


--
-- Name: COLUMN snippet_questions.question_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.snippet_questions.question_key IS 'Stable integer import key. Unique across snippet_questions + standalone_questions. Used as the dedup key for re-imports and as the bank identifier in the question picker.';


--
-- Name: snippet_question_map; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.snippet_question_map AS
 SELECT question_key,
    snippet_id,
    language
   FROM public.snippet_questions sq;


--
-- Name: snippet_taxonomy_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.snippet_taxonomy_mapping_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: snippet_taxonomy_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.snippet_taxonomy_mapping_id_seq OWNED BY public.content_taxonomy_mapping.id;


--
-- Name: snippet_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snippet_translations (
    snippet_translation_id text DEFAULT gen_random_uuid() NOT NULL,
    snippet_id uuid,
    language text NOT NULL,
    hook text,
    explanation text,
    key_term text,
    key_term_meaning text,
    life_connection text,
    quiz_recap text,
    source_citation text
);


--
-- Name: snippet_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snippet_views (
    id bigint NOT NULL,
    profile_id uuid,
    snippet_id uuid,
    course_id uuid,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: snippet_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.snippet_views_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: snippet_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.snippet_views_id_seq OWNED BY public.snippet_views.id;


--
-- Name: standalone_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.standalone_questions (
    question_id uuid DEFAULT gen_random_uuid() NOT NULL,
    language text NOT NULL,
    question text NOT NULL,
    correct_option text NOT NULL,
    wrong_option_1 text NOT NULL,
    wrong_option_2 text NOT NULL,
    wrong_option_3 text NOT NULL,
    explanation text,
    key_term text,
    key_term_meaning text,
    life_connection text,
    source_citation text,
    asset_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    question_key integer,
    hint text
);


--
-- Name: COLUMN standalone_questions.question_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.standalone_questions.question_key IS 'Stable integer import key. Same namespace as snippet_questions.question_key.';


--
-- Name: COLUMN standalone_questions.hint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.standalone_questions.hint IS 'Optional hint shown on learner request. May carry a score penalty.';


--
-- Name: taxonomy_term_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taxonomy_term_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    term_id text NOT NULL,
    language_id text NOT NULL,
    name text NOT NULL
);


--
-- Name: taxonomy_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taxonomy_terms (
    term_id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    slug text NOT NULL
);


--
-- Name: themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.themes (
    theme_id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid,
    title text NOT NULL,
    description text,
    asset_id uuid,
    language_id text,
    sort_order integer DEFAULT 0 NOT NULL,
    cover_image_url text
);


--
-- Name: tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tokens (
    token_type text NOT NULL,
    token_name text NOT NULL,
    token_icon text DEFAULT '🪙'::text NOT NULL,
    description text,
    earn_trigger text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    badge_id text NOT NULL,
    awarded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles_mapping (
    id bigint NOT NULL,
    profile_id uuid,
    role_id text
);


--
-- Name: user_roles_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_roles_mapping_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_roles_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_roles_mapping_id_seq OWNED BY public.user_roles_mapping.id;


--
-- Name: user_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    token_type text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    source_type text,
    source_id text,
    awarded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_taxonomy_mapping id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_taxonomy_mapping ALTER COLUMN id SET DEFAULT nextval('public.snippet_taxonomy_mapping_id_seq'::regclass);


--
-- Name: lesson_completions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_completions ALTER COLUMN id SET DEFAULT nextval('public.lesson_completions_id_seq'::regclass);


--
-- Name: lesson_snippet_mapping id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_snippet_mapping ALTER COLUMN id SET DEFAULT nextval('public.lesson_snippet_mapping_id_seq'::regclass);


--
-- Name: lesson_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_views ALTER COLUMN id SET DEFAULT nextval('public.lesson_views_id_seq'::regclass);


--
-- Name: quiz_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts ALTER COLUMN id SET DEFAULT nextval('public.quiz_attempts_id_seq'::regclass);


--
-- Name: snippet_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_views ALTER COLUMN id SET DEFAULT nextval('public.snippet_views_id_seq'::regclass);


--
-- Name: user_roles_mapping id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles_mapping ALTER COLUMN id SET DEFAULT nextval('public.user_roles_mapping_id_seq'::regclass);


--
-- Name: asset_library asset_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_library
    ADD CONSTRAINT asset_library_pkey PRIMARY KEY (asset_id);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (badge_id);


--
-- Name: blocked_words blocked_words_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_words
    ADD CONSTRAINT blocked_words_pkey PRIMARY KEY (word);


--
-- Name: snippet_likes bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_likes
    ADD CONSTRAINT bookmarks_pkey PRIMARY KEY (id);


--
-- Name: bookmarks bookmarks_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_pkey1 PRIMARY KEY (id);


--
-- Name: bookmarks bookmarks_profile_id_content_type_content_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_profile_id_content_type_content_id_key UNIQUE (profile_id, content_type, content_id);


--
-- Name: snippet_likes bookmarks_profile_id_snippet_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_likes
    ADD CONSTRAINT bookmarks_profile_id_snippet_id_key UNIQUE (profile_id, snippet_id);


--
-- Name: comment_reports comment_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reports
    ADD CONSTRAINT comment_reports_pkey PRIMARY KEY (id);


--
-- Name: content_drafts content_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_drafts
    ADD CONSTRAINT content_drafts_pkey PRIMARY KEY (id);


--
-- Name: content_role_assignments content_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_role_assignments
    ADD CONSTRAINT content_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: content_role_assignments content_role_assignments_profile_id_content_type_content_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_role_assignments
    ADD CONSTRAINT content_role_assignments_profile_id_content_type_content_id_key UNIQUE (profile_id, content_type, content_id, language_id, sub_role);


--
-- Name: content_workflow_events content_workflow_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_workflow_events
    ADD CONSTRAINT content_workflow_events_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (course_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: featured_snippets featured_snippets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_snippets
    ADD CONSTRAINT featured_snippets_pkey PRIMARY KEY (display_order);


--
-- Name: icons icons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.icons
    ADD CONSTRAINT icons_pkey PRIMARY KEY (icon_id);


--
-- Name: languages languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_pkey PRIMARY KEY (language_id);


--
-- Name: lesson_completions lc_points_sane; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.lesson_completions
    ADD CONSTRAINT lc_points_sane CHECK (((points_earned >= 0) AND (points_earned <= 1000))) NOT VALID;


--
-- Name: lesson_completions lc_snippets_sane; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.lesson_completions
    ADD CONSTRAINT lc_snippets_sane CHECK (((snippet_count IS NULL) OR ((snippet_count >= 0) AND (snippet_count <= 500)))) NOT VALID;


--
-- Name: lesson_completions lesson_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_completions
    ADD CONSTRAINT lesson_completions_pkey PRIMARY KEY (id);


--
-- Name: lesson_completions lesson_completions_profile_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_completions
    ADD CONSTRAINT lesson_completions_profile_id_lesson_id_key UNIQUE (profile_id, lesson_id);


--
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (profile_id, lesson_id);


--
-- Name: lesson_snippet_mapping lesson_snippet_mapping_lesson_id_snippet_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_snippet_mapping
    ADD CONSTRAINT lesson_snippet_mapping_lesson_id_snippet_id_key UNIQUE (lesson_id, snippet_id);


--
-- Name: lesson_snippet_mapping lesson_snippet_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_snippet_mapping
    ADD CONSTRAINT lesson_snippet_mapping_pkey PRIMARY KEY (id);


--
-- Name: lesson_views lesson_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_views
    ADD CONSTRAINT lesson_views_pkey PRIMARY KEY (id);


--
-- Name: lesson_views lesson_views_profile_lesson_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_views
    ADD CONSTRAINT lesson_views_profile_lesson_unique UNIQUE (profile_id, lesson_id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (lesson_id);


--
-- Name: levels levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT levels_pkey PRIMARY KEY (level_id);


--
-- Name: likes likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_pkey PRIMARY KEY (id);


--
-- Name: likes likes_profile_id_content_type_content_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_profile_id_content_type_content_id_key UNIQUE (profile_id, content_type, content_id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (module_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: quiz_attempts qa_score_sane; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.quiz_attempts
    ADD CONSTRAINT qa_score_sane CHECK (((score >= 0) AND (max_score >= 0) AND (max_score <= 1000) AND (score <= max_score))) NOT VALID;


--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: quiz_sets quiz_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_sets
    ADD CONSTRAINT quiz_sets_pkey PRIMARY KEY (quiz_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);


--
-- Name: snippet_comments snippet_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_comments
    ADD CONSTRAINT snippet_comments_pkey PRIMARY KEY (id);


--
-- Name: snippet_core snippet_core_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_core
    ADD CONSTRAINT snippet_core_pkey PRIMARY KEY (snippet_id);


--
-- Name: snippet_likes snippet_likes_profile_id_snippet_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_likes
    ADD CONSTRAINT snippet_likes_profile_id_snippet_id_key UNIQUE (profile_id, snippet_id);


--
-- Name: snippet_likes snippet_likes_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_likes
    ADD CONSTRAINT snippet_likes_unique UNIQUE (profile_id, snippet_id);


--
-- Name: snippet_questions snippet_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_questions
    ADD CONSTRAINT snippet_questions_pkey PRIMARY KEY (question_id);


--
-- Name: content_taxonomy_mapping snippet_taxonomy_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_taxonomy_mapping
    ADD CONSTRAINT snippet_taxonomy_mapping_pkey PRIMARY KEY (id);


--
-- Name: content_taxonomy_mapping snippet_taxonomy_mapping_term_id_entity_id_entity_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_taxonomy_mapping
    ADD CONSTRAINT snippet_taxonomy_mapping_term_id_entity_id_entity_type_key UNIQUE (term_id, entity_id, entity_type);


--
-- Name: snippet_translations snippet_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_translations
    ADD CONSTRAINT snippet_translations_pkey PRIMARY KEY (snippet_translation_id);


--
-- Name: snippet_translations snippet_translations_snippet_id_language_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_translations
    ADD CONSTRAINT snippet_translations_snippet_id_language_key UNIQUE (snippet_id, language);


--
-- Name: snippet_views snippet_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_views
    ADD CONSTRAINT snippet_views_pkey PRIMARY KEY (id);


--
-- Name: snippet_views snippet_views_profile_id_snippet_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_views
    ADD CONSTRAINT snippet_views_profile_id_snippet_id_key UNIQUE (profile_id, snippet_id);


--
-- Name: standalone_questions standalone_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standalone_questions
    ADD CONSTRAINT standalone_questions_pkey PRIMARY KEY (question_id);


--
-- Name: taxonomy_term_translations taxonomy_term_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taxonomy_term_translations
    ADD CONSTRAINT taxonomy_term_translations_pkey PRIMARY KEY (id);


--
-- Name: taxonomy_term_translations taxonomy_term_translations_term_id_language_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taxonomy_term_translations
    ADD CONSTRAINT taxonomy_term_translations_term_id_language_id_key UNIQUE (term_id, language_id);


--
-- Name: taxonomy_terms taxonomy_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taxonomy_terms
    ADD CONSTRAINT taxonomy_terms_pkey PRIMARY KEY (term_id);


--
-- Name: themes themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_pkey PRIMARY KEY (theme_id);


--
-- Name: tokens tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_pkey PRIMARY KEY (token_type);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_profile_id_badge_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_profile_id_badge_id_key UNIQUE (profile_id, badge_id);


--
-- Name: user_roles_mapping user_roles_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles_mapping
    ADD CONSTRAINT user_roles_mapping_pkey PRIMARY KEY (id);


--
-- Name: user_roles_mapping user_roles_mapping_profile_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles_mapping
    ADD CONSTRAINT user_roles_mapping_profile_id_role_id_key UNIQUE (profile_id, role_id);


--
-- Name: user_tokens user_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_pkey PRIMARY KEY (id);


--
-- Name: user_tokens ut_quantity_sane; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.user_tokens
    ADD CONSTRAINT ut_quantity_sane CHECK ((((token_type = 'dharma'::text) AND ((quantity >= 1) AND (quantity <= 1000))) OR ((token_type <> 'dharma'::text) AND (quantity = 1)))) NOT VALID;


--
-- Name: bookmarks_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookmarks_profile_idx ON public.bookmarks USING btree (profile_id);


--
-- Name: comment_reports_one_per_reporter; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX comment_reports_one_per_reporter ON public.comment_reports USING btree (comment_id, reporter_id) WHERE (comment_id IS NOT NULL);


--
-- Name: comment_reports_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comment_reports_status_idx ON public.comment_reports USING btree (status, created_at DESC);


--
-- Name: events_profile_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_profile_time_idx ON public.events USING btree (profile_id, created_at DESC);


--
-- Name: events_type_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_type_time_idx ON public.events USING btree (event_type, created_at DESC);


--
-- Name: idx_lesson_completions_course_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_completions_course_profile ON public.lesson_completions USING btree (course_id, profile_id);


--
-- Name: idx_lessons_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_created_at ON public.lessons USING btree (created_at DESC);


--
-- Name: idx_modules_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modules_created_at ON public.modules USING btree (created_at DESC);


--
-- Name: idx_quiz_attempts_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_attempts_profile_id ON public.quiz_attempts USING btree (profile_id);


--
-- Name: idx_quiz_questions_quiz_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions USING btree (quiz_id);


--
-- Name: idx_quiz_sets_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_sets_lesson_id ON public.quiz_sets USING btree (lesson_id);


--
-- Name: idx_snippet_core_import_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_snippet_core_import_key ON public.snippet_core USING btree (import_key) WHERE (import_key IS NOT NULL);


--
-- Name: idx_snippet_core_import_key_btree; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snippet_core_import_key_btree ON public.snippet_core USING btree (import_key);


--
-- Name: idx_snippet_questions_snippet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snippet_questions_snippet_id ON public.snippet_questions USING btree (snippet_id);


--
-- Name: idx_user_badges_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_badges_profile ON public.user_badges USING btree (profile_id);


--
-- Name: idx_user_tokens_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_tokens_profile ON public.user_tokens USING btree (profile_id);


--
-- Name: idx_user_tokens_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_tokens_type ON public.user_tokens USING btree (profile_id, token_type);


--
-- Name: lesson_views_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lesson_views_profile_idx ON public.lesson_views USING btree (profile_id);


--
-- Name: likes_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX likes_profile_idx ON public.likes USING btree (profile_id);


--
-- Name: snippet_comments_snippet_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX snippet_comments_snippet_idx ON public.snippet_comments USING btree (snippet_id, created_at DESC);


--
-- Name: uq_quiz_questions_quiz_question_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_quiz_questions_quiz_question_key ON public.quiz_questions USING btree (quiz_id, question_key) WHERE (question_key IS NOT NULL);


--
-- Name: uq_snippet_questions_question_key_language; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_snippet_questions_question_key_language ON public.snippet_questions USING btree (question_key, language) WHERE (question_key IS NOT NULL);


--
-- Name: uq_standalone_questions_question_key_language; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_standalone_questions_question_key_language ON public.standalone_questions USING btree (question_key, language) WHERE (question_key IS NOT NULL);


--
-- Name: content_drafts content_drafts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER content_drafts_updated_at BEFORE UPDATE ON public.content_drafts FOR EACH ROW EXECUTE FUNCTION public.update_content_draft_timestamp();


--
-- Name: lesson_completions trg_award_on_lesson_completion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_award_on_lesson_completion AFTER INSERT ON public.lesson_completions FOR EACH ROW EXECUTE FUNCTION public.fn_award_on_lesson_completion();


--
-- Name: snippet_comments trg_comments_profanity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_comments_profanity BEFORE INSERT OR UPDATE OF body ON public.snippet_comments FOR EACH ROW EXECUTE FUNCTION public.snippet_comments_profanity_guard();


--
-- Name: snippet_translations trg_language_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_language_count AFTER INSERT OR DELETE ON public.snippet_translations FOR EACH ROW EXECUTE FUNCTION public.update_course_language_count();


--
-- Name: lesson_snippet_mapping trg_snippet_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_snippet_count AFTER INSERT OR DELETE ON public.lesson_snippet_mapping FOR EACH ROW EXECUTE FUNCTION public.update_course_snippet_count();


--
-- Name: snippet_likes trg_snippet_like_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_snippet_like_count AFTER INSERT OR DELETE ON public.snippet_likes FOR EACH ROW EXECUTE FUNCTION public.update_snippet_like_count();


--
-- Name: snippet_likes bookmarks_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_likes
    ADD CONSTRAINT bookmarks_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id) ON DELETE SET NULL;


--
-- Name: snippet_likes bookmarks_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_likes
    ADD CONSTRAINT bookmarks_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: bookmarks bookmarks_profile_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_profile_id_fkey1 FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: snippet_likes bookmarks_snippet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_likes
    ADD CONSTRAINT bookmarks_snippet_id_fkey FOREIGN KEY (snippet_id) REFERENCES public.snippet_core(snippet_id) ON DELETE CASCADE;


--
-- Name: comment_reports comment_reports_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reports
    ADD CONSTRAINT comment_reports_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.snippet_comments(id) ON DELETE SET NULL;


--
-- Name: comment_reports comment_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reports
    ADD CONSTRAINT comment_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: content_drafts content_drafts_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_drafts
    ADD CONSTRAINT content_drafts_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: content_drafts content_drafts_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_drafts
    ADD CONSTRAINT content_drafts_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: content_role_assignments content_role_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_role_assignments
    ADD CONSTRAINT content_role_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id);


--
-- Name: content_role_assignments content_role_assignments_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_role_assignments
    ADD CONSTRAINT content_role_assignments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: content_workflow_events content_workflow_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_workflow_events
    ADD CONSTRAINT content_workflow_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: content_workflow_events content_workflow_events_draft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_workflow_events
    ADD CONSTRAINT content_workflow_events_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.content_drafts(id) ON DELETE CASCADE;


--
-- Name: courses courses_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset_library(asset_id) ON DELETE SET NULL;


--
-- Name: courses courses_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(language_id);


--
-- Name: featured_snippets featured_snippets_set_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_snippets
    ADD CONSTRAINT featured_snippets_set_by_fkey FOREIGN KEY (set_by) REFERENCES auth.users(id);


--
-- Name: featured_snippets featured_snippets_snippet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_snippets
    ADD CONSTRAINT featured_snippets_snippet_id_fkey FOREIGN KEY (snippet_id) REFERENCES public.snippet_core(snippet_id) ON DELETE CASCADE;


--
-- Name: icons icons_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.icons
    ADD CONSTRAINT icons_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset_library(asset_id) ON DELETE SET NULL;


--
-- Name: lesson_completions lesson_completions_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_completions
    ADD CONSTRAINT lesson_completions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id) ON DELETE SET NULL;


--
-- Name: lesson_completions lesson_completions_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_completions
    ADD CONSTRAINT lesson_completions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id) ON DELETE SET NULL;


--
-- Name: lesson_completions lesson_completions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_completions
    ADD CONSTRAINT lesson_completions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: lesson_snippet_mapping lesson_snippet_mapping_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_snippet_mapping
    ADD CONSTRAINT lesson_snippet_mapping_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id) ON DELETE CASCADE;


--
-- Name: lesson_snippet_mapping lesson_snippet_mapping_snippet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_snippet_mapping
    ADD CONSTRAINT lesson_snippet_mapping_snippet_id_fkey FOREIGN KEY (snippet_id) REFERENCES public.snippet_core(snippet_id) ON DELETE CASCADE;


--
-- Name: lesson_views lesson_views_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_views
    ADD CONSTRAINT lesson_views_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset_library(asset_id) ON DELETE SET NULL;


--
-- Name: lessons lessons_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(language_id);


--
-- Name: lessons lessons_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(module_id) ON DELETE SET NULL;


--
-- Name: levels levels_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT levels_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset_library(asset_id) ON DELETE SET NULL;


--
-- Name: likes likes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: modules modules_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset_library(asset_id) ON DELETE SET NULL;


--
-- Name: modules modules_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id) ON DELETE SET NULL;


--
-- Name: modules modules_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(language_id);


--
-- Name: modules modules_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(level_id);


--
-- Name: modules modules_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.themes(theme_id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_preferred_language_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_preferred_language_fkey FOREIGN KEY (preferred_language) REFERENCES public.languages(language_id);


--
-- Name: quiz_attempts quiz_attempts_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz_sets(quiz_id);


--
-- Name: quiz_questions quiz_questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz_sets(quiz_id) ON DELETE CASCADE;


--
-- Name: quiz_sets quiz_sets_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_sets
    ADD CONSTRAINT quiz_sets_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id) ON DELETE CASCADE;


--
-- Name: quiz_sets quiz_sets_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_sets
    ADD CONSTRAINT quiz_sets_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(module_id) ON DELETE SET NULL;


--
-- Name: quiz_sets quiz_sets_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_sets
    ADD CONSTRAINT quiz_sets_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.themes(theme_id) ON DELETE SET NULL;


--
-- Name: snippet_comments snippet_comments_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_comments
    ADD CONSTRAINT snippet_comments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: snippet_core snippet_core_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_core
    ADD CONSTRAINT snippet_core_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset_library(asset_id) ON DELETE SET NULL;


--
-- Name: snippet_questions snippet_questions_snippet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_questions
    ADD CONSTRAINT snippet_questions_snippet_id_fkey FOREIGN KEY (snippet_id) REFERENCES public.snippet_core(snippet_id) ON DELETE CASCADE;


--
-- Name: content_taxonomy_mapping snippet_taxonomy_mapping_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_taxonomy_mapping
    ADD CONSTRAINT snippet_taxonomy_mapping_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.taxonomy_terms(term_id);


--
-- Name: snippet_translations snippet_translations_snippet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_translations
    ADD CONSTRAINT snippet_translations_snippet_id_fkey FOREIGN KEY (snippet_id) REFERENCES public.snippet_core(snippet_id) ON DELETE CASCADE;


--
-- Name: snippet_views snippet_views_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_views
    ADD CONSTRAINT snippet_views_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id) ON DELETE SET NULL;


--
-- Name: snippet_views snippet_views_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_views
    ADD CONSTRAINT snippet_views_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: snippet_views snippet_views_snippet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snippet_views
    ADD CONSTRAINT snippet_views_snippet_id_fkey FOREIGN KEY (snippet_id) REFERENCES public.snippet_core(snippet_id) ON DELETE CASCADE;


--
-- Name: standalone_questions standalone_questions_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standalone_questions
    ADD CONSTRAINT standalone_questions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset_library(asset_id) ON DELETE SET NULL;


--
-- Name: taxonomy_term_translations taxonomy_term_translations_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taxonomy_term_translations
    ADD CONSTRAINT taxonomy_term_translations_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(language_id);


--
-- Name: taxonomy_term_translations taxonomy_term_translations_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taxonomy_term_translations
    ADD CONSTRAINT taxonomy_term_translations_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.taxonomy_terms(term_id) ON DELETE CASCADE;


--
-- Name: themes themes_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset_library(asset_id) ON DELETE SET NULL;


--
-- Name: themes themes_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id) ON DELETE SET NULL;


--
-- Name: themes themes_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(language_id);


--
-- Name: user_badges user_badges_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(badge_id);


--
-- Name: user_badges user_badges_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles_mapping user_roles_mapping_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles_mapping
    ADD CONSTRAINT user_roles_mapping_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles_mapping user_roles_mapping_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles_mapping
    ADD CONSTRAINT user_roles_mapping_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id);


--
-- Name: user_tokens user_tokens_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: asset_library Public read asset_library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read asset_library" ON public.asset_library FOR SELECT USING (true);


--
-- Name: courses Public read courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);


--
-- Name: icons Public read icons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read icons" ON public.icons FOR SELECT USING (true);


--
-- Name: languages Public read languages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read languages" ON public.languages FOR SELECT USING (true);


--
-- Name: lesson_snippet_mapping Public read lesson_snippet_mapping; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read lesson_snippet_mapping" ON public.lesson_snippet_mapping FOR SELECT USING (true);


--
-- Name: lessons Public read lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read lessons" ON public.lessons FOR SELECT USING (true);


--
-- Name: levels Public read levels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read levels" ON public.levels FOR SELECT USING (true);


--
-- Name: modules Public read modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read modules" ON public.modules FOR SELECT USING (true);


--
-- Name: quiz_sets Public read quiz_sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read quiz_sets" ON public.quiz_sets FOR SELECT USING (true);


--
-- Name: site_settings Public read site_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);


--
-- Name: snippet_core Public read snippet_core; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read snippet_core" ON public.snippet_core FOR SELECT USING (true);


--
-- Name: content_taxonomy_mapping Public read snippet_taxonomy_mapping; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read snippet_taxonomy_mapping" ON public.content_taxonomy_mapping FOR SELECT USING (true);


--
-- Name: snippet_translations Public read snippet_translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read snippet_translations" ON public.snippet_translations FOR SELECT USING (true);


--
-- Name: taxonomy_terms Public read taxonomy_terms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read taxonomy_terms" ON public.taxonomy_terms FOR SELECT USING (true);


--
-- Name: themes Public read themes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read themes" ON public.themes FOR SELECT USING (true);


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: snippet_likes Users manage own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own bookmarks" ON public.snippet_likes USING ((auth.uid() = profile_id));


--
-- Name: lesson_progress Users manage own lesson progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own lesson progress" ON public.lesson_progress USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: snippet_views Users manage own snippet views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own snippet views" ON public.snippet_views USING ((auth.uid() = profile_id));


--
-- Name: courses admin_delete_courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_courses ON public.courses FOR DELETE USING (public.is_admin());


--
-- Name: lesson_snippet_mapping admin_delete_lesson_snippet_mapping; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_lesson_snippet_mapping ON public.lesson_snippet_mapping FOR DELETE USING (public.is_admin());


--
-- Name: lessons admin_delete_lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_lessons ON public.lessons FOR DELETE USING (public.is_admin());


--
-- Name: levels admin_delete_levels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_levels ON public.levels FOR DELETE USING (public.is_admin());


--
-- Name: modules admin_delete_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_modules ON public.modules FOR DELETE USING (public.is_admin());


--
-- Name: snippet_core admin_delete_snippet_core; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_snippet_core ON public.snippet_core FOR DELETE USING (public.is_admin());


--
-- Name: snippet_translations admin_delete_snippet_translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_snippet_translations ON public.snippet_translations FOR DELETE USING (public.is_admin());


--
-- Name: taxonomy_terms admin_delete_taxonomy_terms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_taxonomy_terms ON public.taxonomy_terms FOR DELETE USING (public.is_admin());


--
-- Name: taxonomy_term_translations admin_delete_taxonomy_translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_taxonomy_translations ON public.taxonomy_term_translations FOR DELETE USING (public.is_admin());


--
-- Name: themes admin_delete_themes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_themes ON public.themes FOR DELETE USING (public.is_admin());


--
-- Name: courses admin_insert_courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_courses ON public.courses FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: lesson_snippet_mapping admin_insert_lesson_snippet_mapping; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_lesson_snippet_mapping ON public.lesson_snippet_mapping FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: lessons admin_insert_lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_lessons ON public.lessons FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: levels admin_insert_levels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_levels ON public.levels FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: modules admin_insert_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_modules ON public.modules FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: snippet_core admin_insert_snippet_core; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_snippet_core ON public.snippet_core FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: snippet_translations admin_insert_snippet_translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_snippet_translations ON public.snippet_translations FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: taxonomy_terms admin_insert_taxonomy_terms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_taxonomy_terms ON public.taxonomy_terms FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: taxonomy_term_translations admin_insert_taxonomy_translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_taxonomy_translations ON public.taxonomy_term_translations FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: themes admin_insert_themes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_themes ON public.themes FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: badges admin_update_badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_badges ON public.badges FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: courses admin_update_courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_courses ON public.courses FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: lesson_snippet_mapping admin_update_lesson_snippet_mapping; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_lesson_snippet_mapping ON public.lesson_snippet_mapping FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: lessons admin_update_lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_lessons ON public.lessons FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: levels admin_update_levels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_levels ON public.levels FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: modules admin_update_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_modules ON public.modules FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: snippet_core admin_update_snippet_core; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_snippet_core ON public.snippet_core FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: snippet_translations admin_update_snippet_translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_snippet_translations ON public.snippet_translations FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: taxonomy_terms admin_update_taxonomy_terms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_taxonomy_terms ON public.taxonomy_terms FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: taxonomy_term_translations admin_update_taxonomy_translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_taxonomy_translations ON public.taxonomy_term_translations FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: themes admin_update_themes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_themes ON public.themes FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: asset_library; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_library ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_library asset_library_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY asset_library_admin_delete ON public.asset_library FOR DELETE USING (public.is_admin());


--
-- Name: asset_library asset_library_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY asset_library_admin_insert ON public.asset_library FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: asset_library asset_library_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY asset_library_admin_update ON public.asset_library FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: asset_library asset_library_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY asset_library_public_read ON public.asset_library FOR SELECT USING (true);


--
-- Name: badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

--
-- Name: badges badges_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY badges_public_read ON public.badges FOR SELECT USING (true);


--
-- Name: blocked_words; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_words ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_words blocked_words_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blocked_words_admin_all ON public.blocked_words USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: bookmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: bookmarks bookmarks_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookmarks_delete_own ON public.bookmarks FOR DELETE USING ((auth.uid() = profile_id));


--
-- Name: bookmarks bookmarks_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookmarks_insert_own ON public.bookmarks FOR INSERT WITH CHECK ((auth.uid() = profile_id));


--
-- Name: bookmarks bookmarks_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookmarks_select_own ON public.bookmarks FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: comment_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_reports comment_reports_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comment_reports_admin_delete ON public.comment_reports FOR DELETE USING (public.is_admin());


--
-- Name: comment_reports comment_reports_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comment_reports_admin_update ON public.comment_reports FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: comment_reports comment_reports_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comment_reports_insert_own ON public.comment_reports FOR INSERT WITH CHECK ((auth.uid() = reporter_id));


--
-- Name: comment_reports comment_reports_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comment_reports_select ON public.comment_reports FOR SELECT USING ((public.is_admin() OR (auth.uid() = reporter_id)));


--
-- Name: snippet_comments comments_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_delete_admin ON public.snippet_comments FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_roles_mapping
  WHERE ((user_roles_mapping.profile_id = auth.uid()) AND (user_roles_mapping.role_id = 'ROLE_01'::text)))));


--
-- Name: snippet_comments comments_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_delete_own ON public.snippet_comments FOR DELETE USING ((auth.uid() = profile_id));


--
-- Name: snippet_comments comments_insert_real_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_insert_real_users ON public.snippet_comments FOR INSERT WITH CHECK (((auth.uid() = profile_id) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false)));


--
-- Name: snippet_comments comments_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_public_read ON public.snippet_comments FOR SELECT USING (true);


--
-- Name: snippet_comments comments_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_update_own ON public.snippet_comments FOR UPDATE USING ((auth.uid() = profile_id)) WITH CHECK (((auth.uid() = profile_id) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false)));


--
-- Name: content_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: content_role_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_role_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: content_taxonomy_mapping; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_taxonomy_mapping ENABLE ROW LEVEL SECURITY;

--
-- Name: content_workflow_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_workflow_events ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: courses courses_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_public_read ON public.courses FOR SELECT USING (true);


--
-- Name: content_role_assignments cra_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cra_delete ON public.content_role_assignments FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.user_roles_mapping urm
     JOIN public.roles r ON ((r.role_id = urm.role_id)))
  WHERE ((urm.profile_id = auth.uid()) AND (lower(r.role_name) = ANY (ARRAY['admin'::text, 'creator'::text]))))));


--
-- Name: content_role_assignments cra_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cra_insert ON public.content_role_assignments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_roles_mapping urm
     JOIN public.roles r ON ((r.role_id = urm.role_id)))
  WHERE ((urm.profile_id = auth.uid()) AND (lower(r.role_name) = ANY (ARRAY['admin'::text, 'creator'::text]))))));


--
-- Name: content_role_assignments cra_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cra_select ON public.content_role_assignments FOR SELECT USING (((profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.user_roles_mapping urm
     JOIN public.roles r ON ((r.role_id = urm.role_id)))
  WHERE ((urm.profile_id = auth.uid()) AND (lower(r.role_name) = ANY (ARRAY['admin'::text, 'creator'::text])))))));


--
-- Name: content_role_assignments cra_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cra_update ON public.content_role_assignments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.user_roles_mapping urm
     JOIN public.roles r ON ((r.role_id = urm.role_id)))
  WHERE ((urm.profile_id = auth.uid()) AND (lower(r.role_name) = ANY (ARRAY['admin'::text, 'creator'::text]))))));


--
-- Name: content_drafts drafts_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drafts_delete ON public.content_drafts FOR DELETE USING (public.is_supervisor_or_admin());


--
-- Name: content_drafts drafts_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drafts_insert ON public.content_drafts FOR INSERT WITH CHECK (public.is_supervisor_or_admin());


--
-- Name: content_drafts drafts_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drafts_select ON public.content_drafts FOR SELECT USING ((public.is_supervisor_or_admin() OR (assigned_to = auth.uid()) OR ((status = ANY (ARRAY['submitted'::text, 'needs_revision'::text, 'approved'::text])) AND (EXISTS ( SELECT 1
   FROM public.content_role_assignments
  WHERE ((content_role_assignments.profile_id = auth.uid()) AND (content_role_assignments.sub_role = 'verifier'::text)))))));


--
-- Name: content_drafts drafts_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drafts_update ON public.content_drafts FOR UPDATE USING ((public.is_supervisor_or_admin() OR (assigned_to = auth.uid()) OR ((status = ANY (ARRAY['submitted'::text, 'needs_revision'::text, 'approved'::text])) AND (EXISTS ( SELECT 1
   FROM public.content_role_assignments
  WHERE ((content_role_assignments.profile_id = auth.uid()) AND (content_role_assignments.sub_role = 'verifier'::text)))))));


--
-- Name: lessons editorial_read_lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY editorial_read_lessons ON public.lessons FOR SELECT USING (public.is_editorial_staff());


--
-- Name: snippet_translations editorial_read_snippet_translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY editorial_read_snippet_translations ON public.snippet_translations FOR SELECT USING (public.is_editorial_staff());


--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: events events_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_admin_select ON public.events FOR SELECT USING (public.is_admin());


--
-- Name: content_workflow_events events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_insert ON public.content_workflow_events FOR INSERT WITH CHECK (public.is_editorial_staff());


--
-- Name: events events_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_insert_own ON public.events FOR INSERT WITH CHECK ((auth.uid() = profile_id));


--
-- Name: content_workflow_events events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_select ON public.content_workflow_events FOR SELECT USING (public.is_editorial_staff());


--
-- Name: featured_snippets featured_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY featured_admin_all ON public.featured_snippets USING (public.is_admin());


--
-- Name: featured_snippets featured_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY featured_public_read ON public.featured_snippets FOR SELECT USING (true);


--
-- Name: featured_snippets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.featured_snippets ENABLE ROW LEVEL SECURITY;

--
-- Name: icons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.icons ENABLE ROW LEVEL SECURITY;

--
-- Name: languages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_completions lesson_completions_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_completions_own_insert ON public.lesson_completions FOR INSERT WITH CHECK ((profile_id = auth.uid()));


--
-- Name: lesson_completions lesson_completions_own_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_completions_own_select ON public.lesson_completions FOR SELECT USING ((profile_id = auth.uid()));


--
-- Name: lesson_completions lesson_completions_own_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_completions_own_update ON public.lesson_completions FOR UPDATE USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));


--
-- Name: lesson_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_snippet_mapping; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_snippet_mapping ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_snippet_mapping lesson_snippet_mapping_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_snippet_mapping_public_read ON public.lesson_snippet_mapping FOR SELECT USING (true);


--
-- Name: lesson_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_views ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_views lesson_views: own rows only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lesson_views: own rows only" ON public.lesson_views USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: lessons lessons_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_public_read ON public.lessons FOR SELECT USING (true);


--
-- Name: levels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

--
-- Name: likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

--
-- Name: likes likes_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY likes_delete_own ON public.likes FOR DELETE USING ((auth.uid() = profile_id));


--
-- Name: likes likes_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY likes_insert_own ON public.likes FOR INSERT WITH CHECK ((auth.uid() = profile_id));


--
-- Name: likes likes_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY likes_select_own ON public.likes FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

--
-- Name: modules modules_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY modules_public_read ON public.modules FOR SELECT USING (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: taxonomy_term_translations public read taxonomy_term_translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read taxonomy_term_translations" ON public.taxonomy_term_translations FOR SELECT USING (true);


--
-- Name: quiz_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_attempts quiz_attempts_own_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quiz_attempts_own_select ON public.quiz_attempts FOR SELECT USING ((profile_id = auth.uid()));


--
-- Name: quiz_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_questions quiz_questions_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quiz_questions_admin_delete ON public.quiz_questions FOR DELETE USING (public.is_supervisor_or_admin());


--
-- Name: quiz_questions quiz_questions_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quiz_questions_admin_insert ON public.quiz_questions FOR INSERT WITH CHECK (public.is_supervisor_or_admin());


--
-- Name: quiz_questions quiz_questions_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quiz_questions_admin_update ON public.quiz_questions FOR UPDATE USING (public.is_supervisor_or_admin()) WITH CHECK (public.is_supervisor_or_admin());


--
-- Name: quiz_questions quiz_questions_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quiz_questions_public_read ON public.quiz_questions FOR SELECT USING (true);


--
-- Name: quiz_sets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_sets quiz_sets_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quiz_sets_public_read ON public.quiz_sets FOR SELECT USING (true);


--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: roles roles_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_read_all ON public.roles FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: snippet_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snippet_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: snippet_core; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snippet_core ENABLE ROW LEVEL SECURITY;

--
-- Name: snippet_core snippet_core_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snippet_core_public_read ON public.snippet_core FOR SELECT USING (true);


--
-- Name: snippet_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snippet_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: snippet_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snippet_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: snippet_questions snippet_questions_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snippet_questions_admin_delete ON public.snippet_questions FOR DELETE USING (public.is_supervisor_or_admin());


--
-- Name: snippet_questions snippet_questions_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snippet_questions_admin_insert ON public.snippet_questions FOR INSERT WITH CHECK (public.is_supervisor_or_admin());


--
-- Name: snippet_questions snippet_questions_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snippet_questions_admin_update ON public.snippet_questions FOR UPDATE USING (public.is_supervisor_or_admin()) WITH CHECK (public.is_supervisor_or_admin());


--
-- Name: snippet_questions snippet_questions_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snippet_questions_staff_read ON public.snippet_questions FOR SELECT USING (public.is_editorial_staff());


--
-- Name: snippet_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snippet_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: snippet_translations snippet_translations_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snippet_translations_public_read ON public.snippet_translations FOR SELECT USING (true);


--
-- Name: snippet_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snippet_views ENABLE ROW LEVEL SECURITY;

--
-- Name: standalone_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.standalone_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: standalone_questions standalone_questions_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY standalone_questions_admin_delete ON public.standalone_questions FOR DELETE USING (public.is_supervisor_or_admin());


--
-- Name: standalone_questions standalone_questions_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY standalone_questions_admin_insert ON public.standalone_questions FOR INSERT WITH CHECK (public.is_supervisor_or_admin());


--
-- Name: standalone_questions standalone_questions_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY standalone_questions_admin_update ON public.standalone_questions FOR UPDATE USING (public.is_supervisor_or_admin()) WITH CHECK (public.is_supervisor_or_admin());


--
-- Name: standalone_questions standalone_questions_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY standalone_questions_staff_read ON public.standalone_questions FOR SELECT USING (public.is_editorial_staff());


--
-- Name: taxonomy_term_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.taxonomy_term_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: taxonomy_terms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.taxonomy_terms ENABLE ROW LEVEL SECURITY;

--
-- Name: themes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

--
-- Name: themes themes_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY themes_public_read ON public.themes FOR SELECT USING (true);


--
-- Name: tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: tokens tokens_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tokens_public_read ON public.tokens FOR SELECT USING (true);


--
-- Name: user_roles_mapping urm_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY urm_admin_delete ON public.user_roles_mapping FOR DELETE USING (public.is_admin());


--
-- Name: user_roles_mapping urm_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY urm_admin_insert ON public.user_roles_mapping FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: user_roles_mapping urm_read_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY urm_read_own_or_admin ON public.user_roles_mapping FOR SELECT USING (((profile_id = auth.uid()) OR public.is_admin()));


--
-- Name: user_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: user_badges user_badges_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_badges_admin_all ON public.user_badges USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: user_badges user_badges_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_badges_own_read ON public.user_badges FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: user_roles_mapping; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles_mapping ENABLE ROW LEVEL SECURITY;

--
-- Name: user_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: user_tokens user_tokens_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_tokens_admin_all ON public.user_tokens USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: user_tokens user_tokens_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_tokens_own_read ON public.user_tokens FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION admin_get_badge_counts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.admin_get_badge_counts() TO anon;
GRANT ALL ON FUNCTION public.admin_get_badge_counts() TO authenticated;
GRANT ALL ON FUNCTION public.admin_get_badge_counts() TO service_role;


--
-- Name: FUNCTION admin_get_tokens(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.admin_get_tokens() TO anon;
GRANT ALL ON FUNCTION public.admin_get_tokens() TO authenticated;
GRANT ALL ON FUNCTION public.admin_get_tokens() TO service_role;


--
-- Name: FUNCTION admin_get_users(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.admin_get_users() TO anon;
GRANT ALL ON FUNCTION public.admin_get_users() TO authenticated;
GRANT ALL ON FUNCTION public.admin_get_users() TO service_role;


--
-- Name: FUNCTION admin_set_editorial_role(p_profile uuid, p_role text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.admin_set_editorial_role(p_profile uuid, p_role text) TO anon;
GRANT ALL ON FUNCTION public.admin_set_editorial_role(p_profile uuid, p_role text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_set_editorial_role(p_profile uuid, p_role text) TO service_role;


--
-- Name: FUNCTION assign_content_role(p_profile_id uuid, p_content_type text, p_content_id text, p_language_id text, p_sub_role text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.assign_content_role(p_profile_id uuid, p_content_type text, p_content_id text, p_language_id text, p_sub_role text) TO anon;
GRANT ALL ON FUNCTION public.assign_content_role(p_profile_id uuid, p_content_type text, p_content_id text, p_language_id text, p_sub_role text) TO authenticated;
GRANT ALL ON FUNCTION public.assign_content_role(p_profile_id uuid, p_content_type text, p_content_id text, p_language_id text, p_sub_role text) TO service_role;


--
-- Name: FUNCTION contains_profanity(p_text text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.contains_profanity(p_text text) TO anon;
GRANT ALL ON FUNCTION public.contains_profanity(p_text text) TO authenticated;
GRANT ALL ON FUNCTION public.contains_profanity(p_text text) TO service_role;


--
-- Name: FUNCTION fn_award_badge(p_profile uuid, p_badge text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fn_award_badge(p_profile uuid, p_badge text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fn_award_badge(p_profile uuid, p_badge text) TO service_role;


--
-- Name: FUNCTION fn_award_on_lesson_completion(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fn_award_on_lesson_completion() FROM PUBLIC;
GRANT ALL ON FUNCTION public.fn_award_on_lesson_completion() TO service_role;


--
-- Name: FUNCTION fn_award_token(p_profile uuid, p_type text, p_qty integer, p_source_type text, p_source_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fn_award_token(p_profile uuid, p_type text, p_qty integer, p_source_type text, p_source_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fn_award_token(p_profile uuid, p_type text, p_qty integer, p_source_type text, p_source_id text) TO service_role;


--
-- Name: FUNCTION get_all_drafts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_all_drafts() TO anon;
GRANT ALL ON FUNCTION public.get_all_drafts() TO authenticated;
GRANT ALL ON FUNCTION public.get_all_drafts() TO service_role;


--
-- Name: FUNCTION get_course_learner_counts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_course_learner_counts() TO anon;
GRANT ALL ON FUNCTION public.get_course_learner_counts() TO authenticated;
GRANT ALL ON FUNCTION public.get_course_learner_counts() TO service_role;


--
-- Name: FUNCTION get_course_tree(p_course_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_course_tree(p_course_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_course_tree(p_course_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_course_tree(p_course_id uuid) TO service_role;


--
-- Name: FUNCTION get_editorial_role(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_editorial_role() TO anon;
GRANT ALL ON FUNCTION public.get_editorial_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_editorial_role() TO service_role;


--
-- Name: FUNCTION get_editorial_staff(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_editorial_staff() TO anon;
GRANT ALL ON FUNCTION public.get_editorial_staff() TO authenticated;
GRANT ALL ON FUNCTION public.get_editorial_staff() TO service_role;


--
-- Name: FUNCTION get_leaderboard(p_course_id uuid, p_profile_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_leaderboard(p_course_id uuid, p_profile_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_leaderboard(p_course_id uuid, p_profile_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_leaderboard(p_course_id uuid, p_profile_id uuid) TO service_role;


--
-- Name: FUNCTION get_my_drafts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_my_drafts() TO anon;
GRANT ALL ON FUNCTION public.get_my_drafts() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_drafts() TO service_role;


--
-- Name: FUNCTION get_quiz_questions_secure(p_quiz_id text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_quiz_questions_secure(p_quiz_id text) TO anon;
GRANT ALL ON FUNCTION public.get_quiz_questions_secure(p_quiz_id text) TO authenticated;
GRANT ALL ON FUNCTION public.get_quiz_questions_secure(p_quiz_id text) TO service_role;


--
-- Name: FUNCTION get_quiz_ranks(p_profile_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_quiz_ranks(p_profile_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_quiz_ranks(p_profile_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_quiz_ranks(p_profile_id uuid) TO service_role;


--
-- Name: FUNCTION get_recommendations(p_profile_id uuid, p_limit integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_recommendations(p_profile_id uuid, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_recommendations(p_profile_id uuid, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_recommendations(p_profile_id uuid, p_limit integer) TO service_role;


--
-- Name: FUNCTION get_review_queue(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_review_queue() TO anon;
GRANT ALL ON FUNCTION public.get_review_queue() TO authenticated;
GRANT ALL ON FUNCTION public.get_review_queue() TO service_role;


--
-- Name: FUNCTION get_team_members(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_team_members() TO anon;
GRANT ALL ON FUNCTION public.get_team_members() TO authenticated;
GRANT ALL ON FUNCTION public.get_team_members() TO service_role;


--
-- Name: FUNCTION get_top_liked_items(p_limit integer, p_min_stories integer, p_min_lessons integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_top_liked_items(p_limit integer, p_min_stories integer, p_min_lessons integer) TO anon;
GRANT ALL ON FUNCTION public.get_top_liked_items(p_limit integer, p_min_stories integer, p_min_lessons integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_top_liked_items(p_limit integer, p_min_stories integer, p_min_lessons integer) TO service_role;


--
-- Name: FUNCTION get_top_liked_lessons(p_limit integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_top_liked_lessons(p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_top_liked_lessons(p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_top_liked_lessons(p_limit integer) TO service_role;


--
-- Name: FUNCTION get_top_saved_items(p_limit integer, p_min_stories integer, p_min_lessons integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_top_saved_items(p_limit integer, p_min_stories integer, p_min_lessons integer) TO anon;
GRANT ALL ON FUNCTION public.get_top_saved_items(p_limit integer, p_min_stories integer, p_min_lessons integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_top_saved_items(p_limit integer, p_min_stories integer, p_min_lessons integer) TO service_role;


--
-- Name: FUNCTION get_top_saved_lessons(p_limit integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_top_saved_lessons(p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_top_saved_lessons(p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_top_saved_lessons(p_limit integer) TO service_role;


--
-- Name: FUNCTION get_user_bookmarks(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_bookmarks() TO anon;
GRANT ALL ON FUNCTION public.get_user_bookmarks() TO authenticated;
GRANT ALL ON FUNCTION public.get_user_bookmarks() TO service_role;


--
-- Name: FUNCTION get_user_likes(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_likes() TO anon;
GRANT ALL ON FUNCTION public.get_user_likes() TO authenticated;
GRANT ALL ON FUNCTION public.get_user_likes() TO service_role;


--
-- Name: FUNCTION get_user_likes_by_type(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_likes_by_type() TO anon;
GRANT ALL ON FUNCTION public.get_user_likes_by_type() TO authenticated;
GRANT ALL ON FUNCTION public.get_user_likes_by_type() TO service_role;


--
-- Name: FUNCTION get_workspace_access(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_workspace_access() TO anon;
GRANT ALL ON FUNCTION public.get_workspace_access() TO authenticated;
GRANT ALL ON FUNCTION public.get_workspace_access() TO service_role;


--
-- Name: FUNCTION grade_quiz_answer(p_question_type text, p_question_id uuid, p_chosen text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.grade_quiz_answer(p_question_type text, p_question_id uuid, p_chosen text) TO anon;
GRANT ALL ON FUNCTION public.grade_quiz_answer(p_question_type text, p_question_id uuid, p_chosen text) TO authenticated;
GRANT ALL ON FUNCTION public.grade_quiz_answer(p_question_type text, p_question_id uuid, p_chosen text) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION is_editorial_staff(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_editorial_staff() TO anon;
GRANT ALL ON FUNCTION public.is_editorial_staff() TO authenticated;
GRANT ALL ON FUNCTION public.is_editorial_staff() TO service_role;


--
-- Name: FUNCTION is_supervisor_or_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_supervisor_or_admin() TO anon;
GRANT ALL ON FUNCTION public.is_supervisor_or_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_supervisor_or_admin() TO service_role;


--
-- Name: FUNCTION publish_draft(p_draft_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.publish_draft(p_draft_id uuid) TO anon;
GRANT ALL ON FUNCTION public.publish_draft(p_draft_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.publish_draft(p_draft_id uuid) TO service_role;


--
-- Name: FUNCTION refresh_course_counts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.refresh_course_counts() TO anon;
GRANT ALL ON FUNCTION public.refresh_course_counts() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_course_counts() TO service_role;


--
-- Name: FUNCTION snippet_comments_profanity_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.snippet_comments_profanity_guard() TO anon;
GRANT ALL ON FUNCTION public.snippet_comments_profanity_guard() TO authenticated;
GRANT ALL ON FUNCTION public.snippet_comments_profanity_guard() TO service_role;


--
-- Name: FUNCTION submit_quiz_attempt(p_quiz_id text, p_answers jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.submit_quiz_attempt(p_quiz_id text, p_answers jsonb) TO anon;
GRANT ALL ON FUNCTION public.submit_quiz_attempt(p_quiz_id text, p_answers jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.submit_quiz_attempt(p_quiz_id text, p_answers jsonb) TO service_role;


--
-- Name: FUNCTION update_content_draft_timestamp(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_content_draft_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_content_draft_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_content_draft_timestamp() TO service_role;


--
-- Name: FUNCTION update_course_language_count(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_course_language_count() TO anon;
GRANT ALL ON FUNCTION public.update_course_language_count() TO authenticated;
GRANT ALL ON FUNCTION public.update_course_language_count() TO service_role;


--
-- Name: FUNCTION update_course_snippet_count(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_course_snippet_count() TO anon;
GRANT ALL ON FUNCTION public.update_course_snippet_count() TO authenticated;
GRANT ALL ON FUNCTION public.update_course_snippet_count() TO service_role;


--
-- Name: FUNCTION update_snippet_like_count(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_snippet_like_count() TO anon;
GRANT ALL ON FUNCTION public.update_snippet_like_count() TO authenticated;
GRANT ALL ON FUNCTION public.update_snippet_like_count() TO service_role;


--
-- Name: TABLE asset_library; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_library TO anon;
GRANT ALL ON TABLE public.asset_library TO authenticated;
GRANT ALL ON TABLE public.asset_library TO service_role;


--
-- Name: TABLE badges; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.badges TO anon;
GRANT ALL ON TABLE public.badges TO authenticated;
GRANT ALL ON TABLE public.badges TO service_role;


--
-- Name: TABLE blocked_words; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.blocked_words TO anon;
GRANT ALL ON TABLE public.blocked_words TO authenticated;
GRANT ALL ON TABLE public.blocked_words TO service_role;


--
-- Name: TABLE bookmarks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bookmarks TO anon;
GRANT ALL ON TABLE public.bookmarks TO authenticated;
GRANT ALL ON TABLE public.bookmarks TO service_role;


--
-- Name: TABLE snippet_likes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.snippet_likes TO anon;
GRANT ALL ON TABLE public.snippet_likes TO authenticated;
GRANT ALL ON TABLE public.snippet_likes TO service_role;


--
-- Name: SEQUENCE bookmarks_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.bookmarks_id_seq TO anon;
GRANT ALL ON SEQUENCE public.bookmarks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.bookmarks_id_seq TO service_role;


--
-- Name: TABLE comment_reports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.comment_reports TO anon;
GRANT ALL ON TABLE public.comment_reports TO authenticated;
GRANT ALL ON TABLE public.comment_reports TO service_role;


--
-- Name: TABLE content_drafts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.content_drafts TO anon;
GRANT ALL ON TABLE public.content_drafts TO authenticated;
GRANT ALL ON TABLE public.content_drafts TO service_role;


--
-- Name: TABLE content_role_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.content_role_assignments TO anon;
GRANT ALL ON TABLE public.content_role_assignments TO authenticated;
GRANT ALL ON TABLE public.content_role_assignments TO service_role;


--
-- Name: TABLE content_taxonomy_mapping; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.content_taxonomy_mapping TO anon;
GRANT ALL ON TABLE public.content_taxonomy_mapping TO authenticated;
GRANT ALL ON TABLE public.content_taxonomy_mapping TO service_role;


--
-- Name: TABLE content_workflow_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.content_workflow_events TO anon;
GRANT ALL ON TABLE public.content_workflow_events TO authenticated;
GRANT ALL ON TABLE public.content_workflow_events TO service_role;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.courses TO anon;
GRANT ALL ON TABLE public.courses TO authenticated;
GRANT ALL ON TABLE public.courses TO service_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;


--
-- Name: SEQUENCE events_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.events_id_seq TO anon;
GRANT ALL ON SEQUENCE public.events_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.events_id_seq TO service_role;


--
-- Name: TABLE featured_snippets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.featured_snippets TO anon;
GRANT ALL ON TABLE public.featured_snippets TO authenticated;
GRANT ALL ON TABLE public.featured_snippets TO service_role;


--
-- Name: TABLE icons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.icons TO anon;
GRANT ALL ON TABLE public.icons TO authenticated;
GRANT ALL ON TABLE public.icons TO service_role;


--
-- Name: TABLE languages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.languages TO anon;
GRANT ALL ON TABLE public.languages TO authenticated;
GRANT ALL ON TABLE public.languages TO service_role;


--
-- Name: TABLE lesson_completions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_completions TO anon;
GRANT ALL ON TABLE public.lesson_completions TO authenticated;
GRANT ALL ON TABLE public.lesson_completions TO service_role;


--
-- Name: SEQUENCE lesson_completions_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.lesson_completions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.lesson_completions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.lesson_completions_id_seq TO service_role;


--
-- Name: TABLE lesson_progress; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_progress TO anon;
GRANT ALL ON TABLE public.lesson_progress TO authenticated;
GRANT ALL ON TABLE public.lesson_progress TO service_role;


--
-- Name: TABLE lesson_snippet_mapping; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_snippet_mapping TO anon;
GRANT ALL ON TABLE public.lesson_snippet_mapping TO authenticated;
GRANT ALL ON TABLE public.lesson_snippet_mapping TO service_role;


--
-- Name: SEQUENCE lesson_snippet_mapping_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.lesson_snippet_mapping_id_seq TO anon;
GRANT ALL ON SEQUENCE public.lesson_snippet_mapping_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.lesson_snippet_mapping_id_seq TO service_role;


--
-- Name: TABLE lesson_views; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_views TO anon;
GRANT ALL ON TABLE public.lesson_views TO authenticated;
GRANT ALL ON TABLE public.lesson_views TO service_role;


--
-- Name: SEQUENCE lesson_views_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.lesson_views_id_seq TO anon;
GRANT ALL ON SEQUENCE public.lesson_views_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.lesson_views_id_seq TO service_role;


--
-- Name: TABLE lessons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lessons TO anon;
GRANT ALL ON TABLE public.lessons TO authenticated;
GRANT ALL ON TABLE public.lessons TO service_role;


--
-- Name: TABLE levels; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.levels TO anon;
GRANT ALL ON TABLE public.levels TO authenticated;
GRANT ALL ON TABLE public.levels TO service_role;


--
-- Name: TABLE likes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.likes TO anon;
GRANT ALL ON TABLE public.likes TO authenticated;
GRANT ALL ON TABLE public.likes TO service_role;


--
-- Name: TABLE modules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.modules TO anon;
GRANT ALL ON TABLE public.modules TO authenticated;
GRANT ALL ON TABLE public.modules TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE quiz_attempts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quiz_attempts TO anon;
GRANT ALL ON TABLE public.quiz_attempts TO authenticated;
GRANT ALL ON TABLE public.quiz_attempts TO service_role;


--
-- Name: SEQUENCE quiz_attempts_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.quiz_attempts_id_seq TO anon;
GRANT ALL ON SEQUENCE public.quiz_attempts_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.quiz_attempts_id_seq TO service_role;


--
-- Name: TABLE quiz_questions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quiz_questions TO anon;
GRANT ALL ON TABLE public.quiz_questions TO authenticated;
GRANT ALL ON TABLE public.quiz_questions TO service_role;


--
-- Name: TABLE quiz_sets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quiz_sets TO anon;
GRANT ALL ON TABLE public.quiz_sets TO authenticated;
GRANT ALL ON TABLE public.quiz_sets TO service_role;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.roles TO anon;
GRANT ALL ON TABLE public.roles TO authenticated;
GRANT ALL ON TABLE public.roles TO service_role;


--
-- Name: TABLE site_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.site_settings TO anon;
GRANT ALL ON TABLE public.site_settings TO authenticated;
GRANT ALL ON TABLE public.site_settings TO service_role;


--
-- Name: TABLE snippet_comments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.snippet_comments TO anon;
GRANT ALL ON TABLE public.snippet_comments TO authenticated;
GRANT ALL ON TABLE public.snippet_comments TO service_role;


--
-- Name: TABLE snippet_core; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.snippet_core TO anon;
GRANT ALL ON TABLE public.snippet_core TO authenticated;
GRANT ALL ON TABLE public.snippet_core TO service_role;


--
-- Name: TABLE snippet_questions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.snippet_questions TO anon;
GRANT ALL ON TABLE public.snippet_questions TO authenticated;
GRANT ALL ON TABLE public.snippet_questions TO service_role;


--
-- Name: TABLE snippet_question_map; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.snippet_question_map TO anon;
GRANT ALL ON TABLE public.snippet_question_map TO authenticated;
GRANT ALL ON TABLE public.snippet_question_map TO service_role;


--
-- Name: SEQUENCE snippet_taxonomy_mapping_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.snippet_taxonomy_mapping_id_seq TO anon;
GRANT ALL ON SEQUENCE public.snippet_taxonomy_mapping_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.snippet_taxonomy_mapping_id_seq TO service_role;


--
-- Name: TABLE snippet_translations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.snippet_translations TO anon;
GRANT ALL ON TABLE public.snippet_translations TO authenticated;
GRANT ALL ON TABLE public.snippet_translations TO service_role;


--
-- Name: TABLE snippet_views; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.snippet_views TO anon;
GRANT ALL ON TABLE public.snippet_views TO authenticated;
GRANT ALL ON TABLE public.snippet_views TO service_role;


--
-- Name: SEQUENCE snippet_views_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.snippet_views_id_seq TO anon;
GRANT ALL ON SEQUENCE public.snippet_views_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.snippet_views_id_seq TO service_role;


--
-- Name: TABLE standalone_questions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.standalone_questions TO anon;
GRANT ALL ON TABLE public.standalone_questions TO authenticated;
GRANT ALL ON TABLE public.standalone_questions TO service_role;


--
-- Name: TABLE taxonomy_term_translations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.taxonomy_term_translations TO anon;
GRANT ALL ON TABLE public.taxonomy_term_translations TO authenticated;
GRANT ALL ON TABLE public.taxonomy_term_translations TO service_role;


--
-- Name: TABLE taxonomy_terms; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.taxonomy_terms TO anon;
GRANT ALL ON TABLE public.taxonomy_terms TO authenticated;
GRANT ALL ON TABLE public.taxonomy_terms TO service_role;


--
-- Name: TABLE themes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.themes TO anon;
GRANT ALL ON TABLE public.themes TO authenticated;
GRANT ALL ON TABLE public.themes TO service_role;


--
-- Name: TABLE tokens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tokens TO anon;
GRANT ALL ON TABLE public.tokens TO authenticated;
GRANT ALL ON TABLE public.tokens TO service_role;


--
-- Name: TABLE user_badges; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_badges TO anon;
GRANT ALL ON TABLE public.user_badges TO authenticated;
GRANT ALL ON TABLE public.user_badges TO service_role;


--
-- Name: TABLE user_roles_mapping; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles_mapping TO anon;
GRANT ALL ON TABLE public.user_roles_mapping TO authenticated;
GRANT ALL ON TABLE public.user_roles_mapping TO service_role;


--
-- Name: SEQUENCE user_roles_mapping_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.user_roles_mapping_id_seq TO anon;
GRANT ALL ON SEQUENCE public.user_roles_mapping_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.user_roles_mapping_id_seq TO service_role;


--
-- Name: TABLE user_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_tokens TO anon;
GRANT ALL ON TABLE public.user_tokens TO authenticated;
GRANT ALL ON TABLE public.user_tokens TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict XgECtIrobbSIMboif5UxvKIT5SNjoqIZ8WD0vEyHkzmkOQfC6TEkH4iQGI5zjMx

