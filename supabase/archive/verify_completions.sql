-- verify_completions.sql
-- Shows all your real lesson_completions (lesson_id NOT NULL) with their snippet and dharma data.
-- Also shows the current in-progress positions from lesson_progress.

-- 1. Completed lessons
SELECT
  lc.id,
  lc.lesson_id,
  l.lesson_name,
  lc.course_id,
  lc.snippet_count,
  lc.points_earned,
  lc.completed_at
FROM lesson_completions lc
LEFT JOIN lessons l ON l.lesson_id = lc.lesson_id
WHERE lc.lesson_id IS NOT NULL
ORDER BY lc.completed_at;

-- 2. In-progress lessons (not yet completed)
SELECT
  lp.lesson_id,
  l.lesson_name,
  lp.snippet_index,          -- 0-based, so snippets viewed = snippet_index + 1
  lp.snippet_index + 1 AS snippets_viewed,
  lp.updated_at
FROM lesson_progress lp
LEFT JOIN lessons l ON l.lesson_id = lp.lesson_id
WHERE lp.lesson_id NOT IN (
  SELECT lesson_id FROM lesson_completions WHERE lesson_id IS NOT NULL
)
ORDER BY lp.updated_at DESC;
