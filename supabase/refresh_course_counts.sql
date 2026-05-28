-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Refresh course snippet_count and language_count
--
-- These columns default to 0 and are not maintained by triggers.
-- Run after any bulk import to bring them up to date.
-- Also used by the post-import refresh RPC below.
-- Safe to re-run at any time.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE courses c SET
  snippet_count = (
    SELECT COUNT(DISTINCT lsm.snippet_id)
    FROM modules m
    JOIN lessons l          ON l.module_id  = m.module_id
    JOIN lesson_snippet_mapping lsm ON lsm.lesson_id = l.lesson_id
    WHERE m.course_id = c.course_id
  ),
  language_count = (
    SELECT COUNT(DISTINCT st.language)
    FROM modules m
    JOIN lessons l          ON l.module_id  = m.module_id
    JOIN lesson_snippet_mapping lsm ON lsm.lesson_id = l.lesson_id
    JOIN snippet_translations st    ON st.snippet_id = lsm.snippet_id
    WHERE m.course_id = c.course_id
  );

-- Verify
SELECT course_name, snippet_count, language_count FROM courses ORDER BY course_name;

-- ─────────────────────────────────────────────────────────────────────────────
-- Optional: expose as an RPC so the importer can call it automatically
-- after every import run without needing direct table UPDATE permission.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_course_counts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
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

GRANT EXECUTE ON FUNCTION refresh_course_counts() TO authenticated;
