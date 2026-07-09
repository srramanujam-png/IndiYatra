-- ============================================================
-- module_cover_image.sql
--
-- Adds a cover-photo column to courses, themes, modules, and lessons, plus
-- a public storage bucket to host them. Mirrors the pattern in
-- snippet_image_feature.sql (which does the same thing for per-snippet
-- images). Also updates get_course_tree() so the module photo reaches
-- AllCoursesPage, and is used by the Admin > Content editor's image
-- upload widget for all four content types.
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
--
-- After running, set a cover photo either by:
--   a) Admin > Content > (Courses/Themes/Modules/Lessons) > Edit — upload
--      a file directly, or
--   b) Uploading a file to the "content-images" bucket in the Supabase
--      Storage UI, copying its public URL, then e.g.:
--        UPDATE modules SET cover_image_url = '<public url>'
--        WHERE module_id = '...';
--   c) Any other publicly-reachable https image URL — the column just
--      stores a URL string, it doesn't have to come from this bucket.
-- ============================================================

-- ── 1. Columns ───────────────────────────────────────────────────────────
ALTER TABLE modules ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE themes  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- ── 2. Storage bucket (mirrors snippet_image_feature.sql's snippet-images
-- bucket) ────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-images',
  'content-images',
  true,
  5242880,   -- 5 MB max per file
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

-- Public: anyone can view images
DROP POLICY IF EXISTS "content_images_public_read" ON storage.objects;
CREATE POLICY "content_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'content-images');

-- Editorial staff can upload
DROP POLICY IF EXISTS "content_images_editorial_insert" ON storage.objects;
CREATE POLICY "content_images_editorial_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'content-images'
    AND is_editorial_staff()
  );

-- Editorial staff can replace (upsert uses UPDATE)
DROP POLICY IF EXISTS "content_images_editorial_update" ON storage.objects;
CREATE POLICY "content_images_editorial_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'content-images'
    AND is_editorial_staff()
  );

-- ── 3. get_course_tree(): surface module_image_url ────────────────────────
-- Postgres won't let CREATE OR REPLACE change a function's return column
-- list, so drop first (safe — nothing else overloads this name/signature).
DROP FUNCTION IF EXISTS get_course_tree(uuid);

CREATE FUNCTION get_course_tree(p_course_id uuid)
RETURNS TABLE (
  level_id          text,
  theme_id          uuid,
  theme_title       text,
  theme_sort        int,
  module_id         uuid,
  module_name       text,
  module_sort       int,
  module_image_url  text,
  lesson_id         uuid,
  lesson_name       text,
  lesson_sort       int
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    m.level_id,
    t.theme_id,
    t.title            AS theme_title,
    t.sort_order       AS theme_sort,
    m.module_id,
    m.module_name,
    m.sort_order       AS module_sort,
    m.cover_image_url  AS module_image_url,
    l.lesson_id,
    l.lesson_name,
    l.sort_order       AS lesson_sort
  FROM modules m
  JOIN themes  t ON t.theme_id  = m.theme_id
  JOIN lessons l ON l.module_id = m.module_id
  WHERE m.course_id = p_course_id
  ORDER BY m.level_id, t.sort_order, m.sort_order, l.sort_order;
$$;

-- Restore grants explicitly (DROP FUNCTION clears them) — All Courses browsing
-- works for guests too, so both roles need EXECUTE.
GRANT EXECUTE ON FUNCTION get_course_tree(uuid) TO anon, authenticated;
