-- ─── Migration: add 'course' to bookmarks content_type ───────────────────────
-- Run this in Supabase SQL editor AFTER bookmarks_schema.sql

-- 1. Drop the old check constraint and recreate with 'course' included
ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_content_type_check;
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_content_type_check
  CHECK (content_type IN ('lesson', 'module', 'theme', 'course'));

-- 2. Recreate get_user_bookmarks() with course UNION
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
  -- Lessons
  SELECT b.id, b.content_type, b.content_id, b.saved_at,
    l.lesson_name, l.lesson_name, m.module_name, m.module_id,
    t.title, t.theme_id, m.course_id, c.course_name
  FROM bookmarks b
  JOIN lessons l  ON b.content_id = l.lesson_id
  JOIN modules m  ON l.module_id  = m.module_id
  JOIN themes  t  ON m.theme_id   = t.theme_id
  LEFT JOIN courses c ON m.course_id = c.course_id
  WHERE b.profile_id = auth.uid() AND b.content_type = 'lesson'

  UNION ALL

  -- Modules
  SELECT b.id, b.content_type, b.content_id, b.saved_at,
    m.module_name, NULL, m.module_name, m.module_id,
    t.title, t.theme_id, m.course_id, c.course_name
  FROM bookmarks b
  JOIN modules m  ON b.content_id = m.module_id
  JOIN themes  t  ON m.theme_id   = t.theme_id
  LEFT JOIN courses c ON m.course_id = c.course_id
  WHERE b.profile_id = auth.uid() AND b.content_type = 'module'

  UNION ALL

  -- Themes
  SELECT b.id, b.content_type, b.content_id, b.saved_at,
    t.title, NULL, NULL, NULL, t.title, t.theme_id, NULL, NULL
  FROM bookmarks b
  JOIN themes t ON b.content_id = t.theme_id
  WHERE b.profile_id = auth.uid() AND b.content_type = 'theme'

  UNION ALL

  -- Courses
  SELECT b.id, b.content_type, b.content_id, b.saved_at,
    c.course_name, NULL, NULL, NULL, NULL, NULL, c.course_id, c.course_name
  FROM bookmarks b
  JOIN courses c ON b.content_id = c.course_id
  WHERE b.profile_id = auth.uid() AND b.content_type = 'course'

  ORDER BY saved_at DESC;
$$;
