-- Run this in the Supabase SQL Editor (or via supabase db push).
-- Safe to re-run — uses CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION get_course_tree(p_course_id uuid)
RETURNS TABLE (
  level_id     text,
  theme_id     uuid,
  theme_title  text,
  theme_sort   int,
  module_id    uuid,
  module_name  text,
  module_sort  int,
  lesson_id    uuid,
  lesson_name  text,
  lesson_sort  int
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    m.level_id,
    t.theme_id,
    t.title        AS theme_title,
    t.sort_order   AS theme_sort,
    m.module_id,
    m.module_name,
    m.sort_order   AS module_sort,
    l.lesson_id,
    l.lesson_name,
    l.sort_order   AS lesson_sort
  FROM modules m
  JOIN themes  t ON t.theme_id  = m.theme_id
  JOIN lessons l ON l.module_id = m.module_id
  WHERE m.course_id = p_course_id
  ORDER BY m.level_id, t.sort_order, m.sort_order, l.sort_order;
$$;
