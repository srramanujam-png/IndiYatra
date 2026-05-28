-- diagnose_null_completions.sql
-- Shows the 3 lesson_completions rows still missing course_id after the backfill,
-- along with their lesson and module details to understand why they couldn't be resolved.

SELECT
  lc.id                  AS completion_id,
  lc.lesson_id,
  lc.profile_id,
  lc.completed_at,
  lc.points_earned,
  lc.snippet_count,
  -- lesson row (NULL if lesson no longer exists)
  l.lesson_id            AS l_lesson_id,
  l.lesson_name,
  l.module_id,
  -- module row (NULL if module no longer exists or has no course_id)
  m.module_id            AS m_module_id,
  m.module_name,
  m.course_id            AS m_course_id
FROM lesson_completions lc
LEFT JOIN lessons l  ON l.lesson_id  = lc.lesson_id
LEFT JOIN modules m  ON m.module_id  = l.module_id
WHERE lc.course_id IS NULL
ORDER BY lc.completed_at;
