-- ── get_recommendations(p_profile_id, p_limit) ────────────────────────────────
-- Content-based recommendation RPC for Phase 1.
--
-- Tags live on SNIPPETS via taxonomy_terms + content_taxonomy_mapping
-- (entity_type = 'snippet', entity_id = snippet_id).
-- Lessons themselves have no tags yet.
--
-- Algorithm:
--   1. Collect the user's interest term_ids from snippet tags on:
--      - snippets in lessons they completed  (lesson_snippet_mapping + lesson_completions)
--      - snippets they liked                 (snippet_likes.snippet_id)
--      - snippets in lessons they viewed     (lesson_snippet_mapping + lesson_views)
--   2. Score every unread lesson by counting how many of its snippets' tags
--      overlap with the user's interest term_ids.
--   3. Return top N lessons with metadata for the RecommendationsRail UI.

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

-- Grant access to authenticated users
grant execute on function public.get_recommendations(uuid, int) to authenticated;
