-- ─────────────────────────────────────────────────────────────────────────────
-- Quiz rank RPC
-- Returns rank for the given user across every course and theme where at least
-- one user has quiz attempt data. Rank is based on last-attempt % score.
-- Safe to re-run (CREATE OR REPLACE).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_quiz_ranks(p_profile_id uuid)
RETURNS TABLE (
  scope_type  text,
  scope_id    text,
  user_rank   bigint,
  total_users bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
WITH last_attempts AS (
  -- Most recent completed attempt per (profile, quiz)
  SELECT DISTINCT ON (profile_id, quiz_id)
    profile_id,
    quiz_id,
    score,
    max_score
  FROM quiz_attempts
  WHERE completed_at IS NOT NULL
  ORDER BY profile_id, quiz_id, completed_at DESC NULLS LAST
),

quiz_scope AS (
  -- Map each published quiz to its course_id and theme_id
  SELECT
    qs.quiz_id,
    m.course_id::text AS course_id,
    m.theme_id::text  AS theme_id
  FROM quiz_sets qs
  JOIN lessons l ON l.lesson_id = qs.lesson_id
  JOIN modules m ON m.module_id = l.module_id
  WHERE qs.is_published = true
),

-- Aggregate last-attempt score per (user, course)
course_scores AS (
  SELECT
    la.profile_id,
    qsc.course_id                                             AS scope_id,
    SUM(la.score)::float / NULLIF(SUM(la.max_score), 0)      AS pct
  FROM last_attempts la
  JOIN quiz_scope qsc ON qsc.quiz_id = la.quiz_id
  WHERE qsc.course_id IS NOT NULL
  GROUP BY la.profile_id, qsc.course_id
),

-- Aggregate last-attempt score per (user, theme)
theme_scores AS (
  SELECT
    la.profile_id,
    qsc.theme_id                                              AS scope_id,
    SUM(la.score)::float / NULLIF(SUM(la.max_score), 0)      AS pct
  FROM last_attempts la
  JOIN quiz_scope qsc ON qsc.quiz_id = la.quiz_id
  WHERE qsc.theme_id IS NOT NULL
  GROUP BY la.profile_id, qsc.theme_id
),

-- Rank within each course (higher score = better rank)
course_ranks AS (
  SELECT
    'course'::text AS scope_type,
    scope_id,
    profile_id,
    RANK()   OVER (PARTITION BY scope_id ORDER BY pct DESC NULLS LAST)::bigint AS user_rank,
    COUNT(*) OVER (PARTITION BY scope_id)::bigint                              AS total_users
  FROM course_scores
),

-- Rank within each theme
theme_ranks AS (
  SELECT
    'theme'::text  AS scope_type,
    scope_id,
    profile_id,
    RANK()   OVER (PARTITION BY scope_id ORDER BY pct DESC NULLS LAST)::bigint AS user_rank,
    COUNT(*) OVER (PARTITION BY scope_id)::bigint                              AS total_users
  FROM theme_scores
)

SELECT scope_type, scope_id, user_rank, total_users FROM course_ranks WHERE profile_id = p_profile_id
UNION ALL
SELECT scope_type, scope_id, user_rank, total_users FROM theme_ranks  WHERE profile_id = p_profile_id;
$$;
