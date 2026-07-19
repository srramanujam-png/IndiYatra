-- backfill_completion_course_id.sql
-- Stamps the correct course_id on lesson_completions rows where it is NULL.
-- These are "legacy" rows written before course_id tracking was added to the table.
-- Safe to re-run: only touches rows with course_id IS NULL.
--
-- Trace:  lesson_completions.lesson_id
--           → lessons.module_id
--           → modules.course_id
--
-- Run once in the Supabase SQL editor, then verify with the SELECT below.

UPDATE lesson_completions lc
SET    course_id = m.course_id
FROM   lessons  l
JOIN   modules  m ON m.module_id = l.module_id
WHERE  lc.lesson_id  = l.lesson_id
  AND  lc.course_id  IS NULL
  AND  m.course_id   IS NOT NULL;

-- Verify: should return 0 rows after the backfill
-- (any remaining nulls have lessons not yet assigned to a course in the modules table)
SELECT COUNT(*) AS still_null
FROM   lesson_completions
WHERE  course_id IS NULL;
