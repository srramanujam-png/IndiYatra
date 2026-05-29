-- sort_order migration
-- Adds sort_order to courses, themes, modules, lessons.
-- Seeds initial values from name / existing position.
-- Run once in the Supabase SQL editor.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE themes  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Seed courses (global, alphabetical as starting point)
WITH ranked AS (
  SELECT course_id,
         ROW_NUMBER() OVER (ORDER BY course_name) AS rn
  FROM courses
)
UPDATE courses SET sort_order = ranked.rn
FROM ranked WHERE courses.course_id = ranked.course_id;

-- Seed themes (global, alphabetical)
WITH ranked AS (
  SELECT theme_id,
         ROW_NUMBER() OVER (ORDER BY title) AS rn
  FROM themes
)
UPDATE themes SET sort_order = ranked.rn
FROM ranked WHERE themes.theme_id = ranked.theme_id;

-- Seed modules (ordered within each course+level+theme group, alphabetical)
WITH ranked AS (
  SELECT module_id,
         ROW_NUMBER() OVER (
           PARTITION BY course_id, level_id, theme_id
           ORDER BY module_name
         ) AS rn
  FROM modules
)
UPDATE modules SET sort_order = ranked.rn
FROM ranked WHERE modules.module_id = ranked.module_id;

-- Seed lessons (ordered within each module, alphabetical)
WITH ranked AS (
  SELECT lesson_id,
         ROW_NUMBER() OVER (
           PARTITION BY module_id
           ORDER BY lesson_name
         ) AS rn
  FROM lessons
)
UPDATE lessons SET sort_order = ranked.rn
FROM ranked WHERE lessons.lesson_id = ranked.lesson_id;
