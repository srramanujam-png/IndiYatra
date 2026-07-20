-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Leaderboard RPC  (Phase 1)
--
-- PHASE 1 — live aggregation on every call (SECURITY DEFINER bypasses RLS).
-- Simple, flexible, rule changes require only editing this function.
--
-- TODO: Once leaderboard scoring rules are finalised, migrate to Phase 2:
--   • Create a leaderboard_cache table (profile_id, course_id, total_tokens,
--     lessons_completed, snippets_read)
--   • Add triggers on lesson_completions, user_tokens, snippet_views to
--     upsert running totals on every write
--   • Run this function once as the backfill query to seed the cache
--   • Replace the RPC call in DashboardPage.jsx with a direct table SELECT
--   See: Phase 2 is worth doing when rules are locked AND read traffic is high.
--
-- SCORING NOTES (current rules — update here when they change):
--   • total_tokens  = SUM of all user_tokens.quantity (global, not course-scoped)
--                     Tokens are a lifetime forest — growing across all courses.
--   • lessons_completed = COUNT of lesson_completions rows
--                         (filtered by course_id when p_course_id is supplied)
--   • snippets_read = SUM of lesson_completions.snippet_count
--                     (filtered by course_id when p_course_id is supplied)
--
-- PRIVACY:
--   • Returns display_name only — no email, no profile_id exposed to clients.
--     profile_id is used server-side only to highlight the current user's row
--     (the frontend filters by comparing to auth.uid(), not by reading others').
--   • Only users with at least one lesson completion OR one token are included
--     (HAVING clause) — lurkers and empty accounts are excluded.
--
-- Run once in Supabase SQL Editor. Safe to re-run (CREATE OR REPLACE).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_leaderboard(
  p_course_id   uuid DEFAULT NULL,
  p_profile_id  uuid DEFAULT NULL   -- caller's own profile; appended if outside top 25
)
RETURNS TABLE (
  rank               int,
  profile_id         uuid,
  display_name       text,
  plant_tokens       int,
  lessons_completed  int,
  snippets_read      int,
  is_current_user    boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH

  -- Plant tokens: tulsi / ashoka / lotus / peepal / banyan only.
  -- Dharma tokens are excluded — their quantity = dharma point value which
  -- inflates totals and is tracked separately via lesson_completions.points_earned.
  -- Tokens are lifetime/global — not filtered by course.
  plant_totals AS (
    SELECT
      profile_id,
      COUNT(*)::int AS plant_count
    FROM user_tokens
    WHERE token_type != 'dharma'
    GROUP BY profile_id
  ),

  -- Deduplicate lesson_completions: a lesson may have multiple rows if it was
  -- replayed or if legacy data was imported. Take the most recent row per lesson.
  deduped_completions AS (
    SELECT DISTINCT ON (profile_id, lesson_id)
      profile_id,
      lesson_id,
      course_id,
      snippet_count
    FROM lesson_completions
    ORDER BY profile_id, lesson_id, completed_at DESC NULLS LAST
  ),

  full_ranking AS (
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        COALESCE(pt.plant_count, 0) DESC,
        COUNT(DISTINCT dc.lesson_id) DESC
    )::int                                                AS rank,

    p.id                                                  AS profile_id,
    COALESCE(NULLIF(TRIM(p.display_name), ''), 'Traveller')::text
                                                          AS display_name,
    COALESCE(pt.plant_count, 0)::int                      AS plant_tokens,
    COUNT(DISTINCT dc.lesson_id)::int                     AS lessons_completed,
    COALESCE(SUM(dc.snippet_count), 0)::int               AS snippets_read,
    (p.id = p_profile_id)                                 AS is_current_user

  FROM profiles p
  LEFT JOIN plant_totals pt      ON pt.profile_id = p.id
  LEFT JOIN deduped_completions dc
    ON  dc.profile_id = p.id
    AND (p_course_id IS NULL OR dc.course_id = p_course_id)

  GROUP BY p.id, p.display_name, pt.plant_count
  HAVING
    COUNT(DISTINCT dc.lesson_id) > 0
    OR COALESCE(pt.plant_count, 0) > 0
),

-- Top 25 by rank
top25 AS (
  SELECT * FROM full_ranking ORDER BY rank LIMIT 25
),

-- Current user's row only if they are outside the top 25
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

-- Allow authenticated users (and anon, for guest previews) to call this RPC
GRANT EXECUTE ON FUNCTION get_leaderboard(uuid, uuid) TO authenticated, anon;
