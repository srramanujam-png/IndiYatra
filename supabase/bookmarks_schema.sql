-- ─── Bookmarks table ────────────────────────────────────────────────────────
-- Stores user-saved lessons, modules, and themes.
-- content_type: 'lesson' | 'module' | 'theme'
-- content_id  : lesson_id / module_id / theme_id (text, matches existing PKs)

CREATE TABLE IF NOT EXISTS bookmarks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type text        NOT NULL CHECK (content_type IN ('lesson', 'module', 'theme')),
  content_id   text        NOT NULL,
  saved_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, content_type, content_id)
);

-- Index for fast per-user loads
CREATE INDEX IF NOT EXISTS bookmarks_profile_idx ON bookmarks (profile_id);

-- ─── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own bookmarks
CREATE POLICY "bookmarks_select_own" ON bookmarks
  FOR SELECT USING (auth.uid() = profile_id);

-- Users can insert their own bookmarks
CREATE POLICY "bookmarks_insert_own" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Users can delete their own bookmarks
CREATE POLICY "bookmarks_delete_own" ON bookmarks
  FOR DELETE USING (auth.uid() = profile_id);

-- ─── RPC: get_user_bookmarks() ───────────────────────────────────────────────
-- Returns all bookmarks for the calling user with full breadcrumb metadata.
-- Uses UNION across the three content types so each JOIN is clean.

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
  -- Lessons: lesson → module → theme → course
  SELECT
    b.id, b.content_type, b.content_id, b.saved_at,
    l.lesson_name       AS item_name,
    l.lesson_name       AS lesson_name,
    m.module_name       AS module_name,
    m.module_id         AS module_id,
    t.title             AS theme_title,
    t.theme_id          AS theme_id,
    m.course_id         AS course_id,
    c.course_name       AS course_name
  FROM bookmarks b
  JOIN lessons l  ON b.content_id = l.lesson_id
  JOIN modules m  ON l.module_id  = m.module_id
  JOIN themes  t  ON m.theme_id   = t.theme_id
  LEFT JOIN courses c ON m.course_id = c.course_id
  WHERE b.profile_id = auth.uid() AND b.content_type = 'lesson'

  UNION ALL

  -- Modules: module → theme → course
  SELECT
    b.id, b.content_type, b.content_id, b.saved_at,
    m.module_name       AS item_name,
    NULL                AS lesson_name,
    m.module_name       AS module_name,
    m.module_id         AS module_id,
    t.title             AS theme_title,
    t.theme_id          AS theme_id,
    m.course_id         AS course_id,
    c.course_name       AS course_name
  FROM bookmarks b
  JOIN modules m  ON b.content_id = m.module_id
  JOIN themes  t  ON m.theme_id   = t.theme_id
  LEFT JOIN courses c ON m.course_id = c.course_id
  WHERE b.profile_id = auth.uid() AND b.content_type = 'module'

  UNION ALL

  -- Themes: theme only (global, no direct course)
  SELECT
    b.id, b.content_type, b.content_id, b.saved_at,
    t.title             AS item_name,
    NULL                AS lesson_name,
    NULL                AS module_name,
    NULL                AS module_id,
    t.title             AS theme_title,
    t.theme_id          AS theme_id,
    NULL                AS course_id,
    NULL                AS course_name
  FROM bookmarks b
  JOIN themes t ON b.content_id = t.theme_id
  WHERE b.profile_id = auth.uid() AND b.content_type = 'theme'

  ORDER BY saved_at DESC;
$$;
