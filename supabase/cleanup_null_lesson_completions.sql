-- cleanup_null_lesson_completions.sql
-- Deletes lesson_completions rows where lesson_id IS NULL.
-- These are orphaned records — the lesson was deleted after completion,
-- or the completion was written with a null lesson_id due to a bug.
-- They cannot be attributed to any course and inflate "All Courses" totals
-- with phantom dharma points and snippet counts.
--
-- Preview first (should show 3 rows):
SELECT id, completed_at, points_earned, snippet_count
FROM   lesson_completions
WHERE  lesson_id IS NULL;

-- Then delete:
-- DELETE FROM lesson_completions WHERE lesson_id IS NULL;
