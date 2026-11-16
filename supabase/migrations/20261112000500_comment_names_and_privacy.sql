-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Audit fixes M6, L1, L4 (12 Nov 2026): comment names and privacy
--
-- M6  snippet_comments.user_name was whatever the browser sent, so a comment could be
--     signed with any name. It is now always copied from the author's profile.
-- L1  get_recommendations() and get_leaderboard() acted on whichever profile id the
--     caller passed (another user's reading history could be inferred; a user hidden
--     from the leaderboard could be revealed). Both now use the signed-in user only.
--     The p_profile_id argument stays so the app's calls keep working; it is ignored.
-- L4  Functions that only make sense when signed in are no longer executable by
--     anonymous visitors; refresh_course_counts() is restricted to editorial staff.
--
-- Safe to re-run (idempotent). Rollback: supabase/rollback/20261112000500_*.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── M6 ──
CREATE OR REPLACE FUNCTION public.snippet_comments_set_author_name() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  SELECT COALESCE(NULLIF(btrim(p.display_name), ''), 'Learner') INTO NEW.user_name
  FROM profiles p WHERE p.id = NEW.profile_id;
  NEW.user_name := COALESCE(NEW.user_name, 'Learner');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.snippet_comments_set_author_name() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_comments_author_name ON public.snippet_comments;
CREATE TRIGGER trg_comments_author_name BEFORE INSERT OR UPDATE ON public.snippet_comments
  FOR EACH ROW EXECUTE FUNCTION public.snippet_comments_set_author_name();

-- ── L1 ──
create or replace function public.get_recommendations(
  p_profile_id uuid,
  p_limit      int  default 8
)
returns table (
  lesson_id         text,
  lesson_name       text,
  module_id         text,
  course_id         text,
  theme_id          text,
  theme_title       text,
  course_name       text,
  tag_names         text[],
  tag_overlap       int,
  total_completions bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with
  -- 1. Lessons already seen by this user
  user_seen as (
    select lesson_id from lesson_completions where profile_id = auth.uid()
    union
    select lesson_id from lesson_progress    where profile_id = auth.uid()
  ),

  -- 2. Snippet ids from completed lessons (strongest signal, weighted 3x)
  completed_snippets as (
    select lsm.snippet_id
    from   lesson_completions lc
    join   lesson_snippet_mapping lsm on lsm.lesson_id = lc.lesson_id
    where  lc.profile_id = auth.uid()
  ),

  -- 3. Snippet ids the user explicitly liked (strong signal, weighted 2x)
  liked_snippets as (
    select snippet_id
    from   snippet_likes
    where  profile_id = auth.uid()
  ),

  -- 4. Snippet ids from viewed (not completed) lessons (weak signal, weighted 1x)
  viewed_snippets as (
    select lsm.snippet_id
    from   lesson_views lv
    join   lesson_snippet_mapping lsm on lsm.lesson_id = lv.lesson_id
    where  lv.profile_id = auth.uid()
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

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_course_id uuid DEFAULT NULL::uuid, p_profile_id uuid DEFAULT NULL::uuid) RETURNS TABLE(rank integer, profile_id uuid, display_name text, plant_tokens integer, lessons_completed integer, snippets_read integer, is_current_user boolean)
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
      (p.id = auth.uid())                               AS is_current_user
    FROM profiles p
    LEFT JOIN plant_totals pt ON pt.profile_id = p.id
    LEFT JOIN deduped_completions dc
      ON  dc.profile_id = p.id
      AND (p_course_id IS NULL OR dc.course_id = p_course_id)
    WHERE (p.leaderboard_visible OR p.id = auth.uid())
    GROUP BY p.id, p.display_name, pt.plant_count
    HAVING COUNT(DISTINCT dc.lesson_id) > 0
        OR COALESCE(pt.plant_count, 0) > 0
  ),
  top25 AS (
    SELECT * FROM full_ranking ORDER BY rank LIMIT 25
  ),
  my_row AS (
    SELECT * FROM full_ranking
    WHERE profile_id = auth.uid()
      AND profile_id NOT IN (SELECT profile_id FROM top25)
  )
  SELECT * FROM top25
  UNION ALL
  SELECT * FROM my_row
  ORDER BY rank;
$$;

-- ── L4 ──
CREATE OR REPLACE FUNCTION public.refresh_course_counts() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'permission denied: editorial staff only';
  END IF;
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

REVOKE ALL ON FUNCTION public.admin_get_badge_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_badge_counts() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_get_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_editorial_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_editorial_role(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.assign_content_role(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_content_role(uuid, text, text, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_drafts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_drafts() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_team_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_members() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.publish_draft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_draft(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(text, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_course_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_course_counts() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_editorial_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_editorial_role() TO authenticated, service_role;
