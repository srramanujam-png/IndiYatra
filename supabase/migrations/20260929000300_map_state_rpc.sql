-- ─────────────────────────────────────────────────────────────────────────────
-- Map release · 3/3 · secure, read-only map-state query for the dashboard
--
--   select public.get_map_state();                 -- whole platform (shipped)
--   select public.get_map_state('<course uuid>');  -- one course (ready; not used by the UI yet)
--
-- • Derives everything for auth.uid(); there is NO user-id parameter, so one learner can never
--   ask for another's map. SECURITY INVOKER: the caller's own RLS applies to user_tokens/user_badges.
-- • Reuses the existing ledger (user_tokens, user_badges). No second award table.
-- • progress = awarded dharma seeds / possible dharma seeds, where possible mirrors what the
--   player awards per lesson: sum of snippet_value over the lesson's snippets that have a default-
--   language (LANG_03) translation, capped at 1000 per lesson (the trigger/CHECK cap).
--   Awarded is clamped to possible. possible = 0 → status 'no_content' (never a false 0%).
-- • Plants are counted DISTINCT per (token_type, source) so duplicate award rows can't add plants.
-- Rollback: supabase/rollback/20260929000300_map_state_rpc_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_lsm_lesson            ON public.lesson_snippet_mapping (lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_profile_type_source ON public.user_tokens (profile_id, token_type, source_type);
CREATE INDEX IF NOT EXISTS idx_snippet_translations_snippet_lang ON public.snippet_translations (snippet_id, language);

CREATE OR REPLACE FUNCTION public.get_map_state(p_course_id uuid DEFAULT NULL) RETURNS jsonb
  LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_scope     uuid[];
  v_possible  bigint;
  v_awarded   bigint;
  v_lessons   int;
  v_idx       int := 0;
  v_progress  numeric;
  v_status    text := 'ok';
  v_counts    jsonb;
  v_badges    jsonb;
  v_features  jsonb;
  v_revision  int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'get_map_state requires a signed-in user' USING ERRCODE = '28000';
  END IF;

  -- lessons in scope
  SELECT COALESCE(array_agg(l.lesson_id), ARRAY[]::uuid[]) INTO v_scope
  FROM lessons l LEFT JOIN modules m ON m.module_id = l.module_id
  WHERE p_course_id IS NULL OR m.course_id = p_course_id;

  -- possible dharma seeds: per-lesson snippet_value total, capped at 1000
  SELECT COALESCE(SUM(pts), 0), COUNT(*) FILTER (WHERE pts > 0) INTO v_possible, v_lessons
  FROM (
    SELECT LEAST(1000, COALESCE(SUM(sc.snippet_value), 0)) AS pts
    FROM unnest(v_scope) AS s(lesson_id)
    LEFT JOIN lesson_snippet_mapping lsm ON lsm.lesson_id = s.lesson_id
    LEFT JOIN snippet_core sc ON sc.snippet_id = lsm.snippet_id
         AND EXISTS (SELECT 1 FROM snippet_translations st WHERE st.snippet_id = sc.snippet_id AND st.language = 'LANG_03')
    GROUP BY s.lesson_id
  ) per_lesson;

  -- awarded dharma seeds (own rows only — RLS user_tokens_own_read also enforces this)
  SELECT COALESCE(SUM(ut.quantity), 0) INTO v_awarded
  FROM user_tokens ut
  WHERE ut.profile_id = v_uid AND ut.token_type = 'dharma' AND ut.source_type = 'lesson'
    AND (p_course_id IS NULL OR ut.source_id IN (SELECT x::text FROM unnest(v_scope) x));

  IF v_possible <= 0 THEN
    v_status := 'no_content'; v_progress := NULL; v_idx := 0;
  ELSE
    v_awarded  := LEAST(v_awarded, v_possible);
    v_progress := round(100.0 * v_awarded / v_possible, 4);
    v_idx      := LEAST(20, ((v_awarded * 20) / v_possible)::int);   -- integer floor: exact at 5% boundaries
  END IF;

  -- earned plants per rule token type (distinct sources)
  SELECT COALESCE(jsonb_object_agg(r.token_type, COALESCE(c.qty, 0)), '{}'::jsonb) INTO v_counts
  FROM map_plant_rules r
  LEFT JOIN (
    SELECT ut.token_type, COUNT(DISTINCT ut.source_type || ':' || COALESCE(ut.source_id, ut.id::text)) AS qty
    FROM user_tokens ut
    WHERE ut.profile_id = v_uid
      AND (p_course_id IS NULL OR CASE ut.source_type
            WHEN 'lesson' THEN ut.source_id IN (SELECT x::text FROM unnest(v_scope) x)
            WHEN 'module' THEN ut.source_id IN (SELECT module_id::text FROM modules WHERE course_id = p_course_id)
            WHEN 'theme'  THEN ut.source_id IN (SELECT theme_id::text  FROM themes  WHERE course_id = p_course_id)
            WHEN 'level'  THEN ut.source_id IN (SELECT level_id        FROM modules WHERE course_id = p_course_id)
            WHEN 'course' THEN ut.source_id = p_course_id::text
            ELSE false END)
    GROUP BY ut.token_type
  ) c ON c.token_type = r.token_type;

  -- badge ring: first 12 active catalogue badges, earned flag from user_badges
  SELECT COALESCE(jsonb_agg(jsonb_build_object('badgeId', b.badge_id, 'name', b.badge_name, 'icon', b.badge_icon,
           'description', b.description, 'earned', ub.badge_id IS NOT NULL) ORDER BY b.sort_order, b.badge_id), '[]'::jsonb)
    INTO v_badges
  FROM (SELECT * FROM badges WHERE is_active ORDER BY sort_order, badge_id LIMIT 12) b
  LEFT JOIN user_badges ub ON ub.badge_id = b.badge_id AND ub.profile_id = v_uid;

  -- features/temples unlocked by the crossed milestones (published configuration)
  SELECT COALESCE(jsonb_agg(id ORDER BY ord, id), '[]'::jsonb) INTO v_features FROM (
    SELECT mf.feature_id AS id, mf.milestone_index AS ord FROM map_milestone_features mf WHERE mf.milestone_index <= v_idx
    UNION ALL
    SELECT mt.temple_id, mt.milestone_index FROM map_milestone_temples mt
      JOIN map_temples t ON t.temple_id = mt.temple_id AND t.enabled WHERE mt.milestone_index <= v_idx
  ) u;

  SELECT revision INTO v_revision FROM map_config_meta;

  RETURN jsonb_build_object(
    'status', v_status,
    'scope', CASE WHEN p_course_id IS NULL THEN 'platform' ELSE 'course' END,
    'courseId', p_course_id,
    'contentVersion', 'c-' || substr(md5(v_possible::text || ':' || v_lessons::text), 1, 8),
    'configRevision', v_revision,
    'progressPercent', v_progress,
    'dharma', jsonb_build_object('awarded', v_awarded, 'possible', v_possible),
    'milestoneIndex', v_idx,                                        -- == plate number == thresholds crossed
    'crossedMilestones', (SELECT COALESCE(jsonb_agg(i), '[]'::jsonb) FROM generate_series(1, v_idx) i),
    'plantCounts', v_counts,
    'badges', v_badges,
    'unlockedFeatureIds', v_features
  );
END $$;

REVOKE ALL ON FUNCTION public.get_map_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_map_state(uuid) TO authenticated;
