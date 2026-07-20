-- ─── Migration: add 'snippet' (and 'course') to bookmarks content_type ────────
-- bookmarks.content_id is text; all content PKs are uuid after migration →
-- every JOIN needs an explicit ::uuid cast on b.content_id.

-- 1. Update CHECK constraint to allow all 5 types
ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_content_type_check;
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_content_type_check
  CHECK (content_type IN ('lesson', 'module', 'theme', 'course', 'snippet'));

-- 2. Recreate get_user_bookmarks() with ::uuid casts + snippet branch
CREATE OR REPLACE FUNCTION get_user_bookmarks()
RETURNS TABLE (
  id           uuid,
  content_type text,
  content_id   text,
  saved_at     timestamptz,
  item_name    text,
  lesson_name  text,
  module_name  text,
  module_id    text,
  theme_title  text,
  theme_id     text,
  course_id    text,
  course_name  text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM (

    -- Lessons
    SELECT
      b.id, b.content_type, b.content_id, b.saved_at,
      l.lesson_name                AS item_name,
      l.lesson_name                AS lesson_name,
      m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM bookmarks b
    JOIN lessons l  ON b.content_id::uuid = l.lesson_id
    JOIN modules m  ON l.module_id        = m.module_id
    JOIN themes  t  ON m.theme_id         = t.theme_id
    LEFT JOIN courses c ON m.course_id    = c.course_id
    WHERE b.profile_id = auth.uid() AND b.content_type = 'lesson'

    UNION ALL

    -- Modules
    SELECT
      b.id, b.content_type, b.content_id, b.saved_at,
      m.module_name                AS item_name,
      NULL                         AS lesson_name,
      m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM bookmarks b
    JOIN modules m  ON b.content_id::uuid = m.module_id
    JOIN themes  t  ON m.theme_id         = t.theme_id
    LEFT JOIN courses c ON m.course_id    = c.course_id
    WHERE b.profile_id = auth.uid() AND b.content_type = 'module'

    UNION ALL

    -- Themes
    SELECT
      b.id, b.content_type, b.content_id, b.saved_at,
      t.title AS item_name,
      NULL, NULL, NULL,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      NULL, NULL
    FROM bookmarks b
    JOIN themes t ON b.content_id::uuid = t.theme_id
    WHERE b.profile_id = auth.uid() AND b.content_type = 'theme'

    UNION ALL

    -- Courses
    SELECT
      b.id, b.content_type, b.content_id, b.saved_at,
      c.course_name AS item_name,
      NULL, NULL, NULL, NULL, NULL,
      c.course_id::text            AS course_id,
      c.course_name
    FROM bookmarks b
    JOIN courses c ON b.content_id::uuid = c.course_id
    WHERE b.profile_id = auth.uid() AND b.content_type = 'course'

    UNION ALL

    -- Snippets (DISTINCT ON wrapped in subquery — required for UNION ALL)
    SELECT * FROM (
      SELECT DISTINCT ON (b.id)
        b.id, b.content_type, b.content_id, b.saved_at,
        COALESCE(
          (SELECT st.hook FROM snippet_translations st
           WHERE st.snippet_id = sc.snippet_id LIMIT 1),
          'Snippet'
        )                            AS item_name,
        l.lesson_name,
        m.module_name,
        m.module_id::text            AS module_id,
        t.title                      AS theme_title,
        t.theme_id::text             AS theme_id,
        m.course_id::text            AS course_id,
        c.course_name
      FROM bookmarks b
      JOIN snippet_core sc             ON b.content_id::uuid = sc.snippet_id
      LEFT JOIN lesson_snippet_mapping lsm ON lsm.snippet_id = sc.snippet_id
      LEFT JOIN lessons l  ON lsm.lesson_id  = l.lesson_id
      LEFT JOIN modules m  ON l.module_id    = m.module_id
      LEFT JOIN themes  t  ON m.theme_id     = t.theme_id
      LEFT JOIN courses c  ON m.course_id    = c.course_id
      WHERE b.profile_id = auth.uid() AND b.content_type = 'snippet'
      ORDER BY b.id, lsm.order_index
    ) snippets

  ) all_bookmarks
  ORDER BY saved_at DESC;
$$;
