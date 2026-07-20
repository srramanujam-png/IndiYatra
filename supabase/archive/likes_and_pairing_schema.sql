-- ─────────────────────────────────────────────────────────────────────────────
-- Likes + bookmark pairing schema
-- Adds: generic `likes` table for module / lesson / quiz / question,
--       `quiz` + `question` content_types on bookmarks,
--       lessons.asset_id (own image, independent of parent module),
--       lesson-level like/save leaderboard RPCs,
--       get_user_bookmarks() + new get_user_likes() extended with all 5 types.
--
-- Pairing rules (enforced in application code, not DB triggers):
--   Module            -> stands alone, never paired.
--   Lesson  <-> Quiz   -> bidirectional. Liking/bookmarking either marks both.
--   Question <-> Snippet -> bidirectional, only when the question is
--                            snippet-linked (snippet_questions row exists).
--                            Standalone questions have no pair.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Generic likes table (module / lesson / quiz / question) ───────────────
-- Snippet likes continue to live in the existing snippet_likes table.

CREATE TABLE IF NOT EXISTS likes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type text        NOT NULL CHECK (content_type IN ('module', 'lesson', 'quiz', 'question')),
  content_id   text        NOT NULL,
  liked_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS likes_profile_idx ON likes (profile_id);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_select_own" ON likes;
CREATE POLICY "likes_select_own" ON likes
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "likes_insert_own" ON likes;
CREATE POLICY "likes_insert_own" ON likes
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "likes_delete_own" ON likes;
CREATE POLICY "likes_delete_own" ON likes
  FOR DELETE USING (auth.uid() = profile_id);

-- ── 1b. Bring snippet_likes.id in line with uuid ──────────────────────────────
-- Leftover from the original uuid_migration.sql: every FK column on
-- snippet_likes (snippet_id, course_id, theme_id, module_id, lesson_id) was
-- converted to uuid, but its own primary key `id` was never touched and is
-- still a legacy bigint. Nothing references snippet_likes.id as a foreign key
-- and no app code reads it, so existing rows can safely get a fresh
-- gen_random_uuid() without affecting anything.

ALTER TABLE snippet_likes ALTER COLUMN id DROP IDENTITY IF EXISTS;
ALTER TABLE snippet_likes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE snippet_likes ALTER COLUMN id TYPE uuid USING gen_random_uuid();
ALTER TABLE snippet_likes ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ── 2. Extend bookmarks.content_type with quiz + question ────────────────────

ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_content_type_check;
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_content_type_check
  CHECK (content_type IN ('lesson', 'module', 'theme', 'course', 'snippet', 'quiz', 'question'));

-- ── 3. Lessons get their own image, independent of the parent module ─────────

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES asset_library(asset_id) ON DELETE SET NULL;

-- ── 4. Lesson-level like / save leaderboards (direct lesson likes, not the ────
--       old aggregate-of-child-snippet-likes approach) ────────────────────────

-- NOTE: these two are community-wide leaderboards — they must aggregate every
-- user's likes/bookmarks, not just the caller's own. Both `likes` and
-- `bookmarks` have row-level security limiting SELECT to `profile_id =
-- auth.uid()` (see "likes_select_own" above and "bookmarks_select_own" in
-- bookmarks_schema.sql). Without SECURITY DEFINER these functions run as the
-- calling user under RLS, so they can only ever see that one user's own rows
-- — for a guest/anonymous call (auth.uid() IS NULL) that's zero rows, and for
-- a signed-in user it's at most their own single like per lesson. That's the
-- root cause of "Most Liked"/"Most Bookmarked" coming back empty: SECURITY
-- DEFINER is required to bypass RLS for this aggregate-only (no per-user
-- data returned) query, the same way get_user_bookmarks() etc. do below.
CREATE OR REPLACE FUNCTION get_top_liked_lessons(p_limit integer DEFAULT 20)
RETURNS TABLE (lesson_id uuid, like_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT content_id::uuid AS lesson_id, COUNT(*) AS like_count
  FROM likes
  WHERE content_type = 'lesson'
  GROUP BY content_id
  ORDER BY like_count DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_top_saved_lessons(p_limit integer DEFAULT 20)
RETURNS TABLE (lesson_id uuid, save_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT content_id::uuid AS lesson_id, COUNT(*) AS save_count
  FROM bookmarks
  WHERE content_type = 'lesson'
  GROUP BY content_id
  ORDER BY save_count DESC
  LIMIT p_limit;
$$;

-- ── 4b. Community leaderboards across ALL likeable/bookmarkable types ────────
-- get_top_liked_lessons/get_top_saved_lessons above only ever covered lessons.
-- These two supersede them for ForYouPage's "Most Liked"/"Most Bookmarked"
-- panels, combining Module + Lesson + Snippet ("story") into one ranked list
-- with ready-to-render name/sub text (same JOIN patterns as
-- get_user_bookmarks()/get_user_likes_by_type() above). Quiz and Question are
-- deliberately excluded — they're mirrors of their paired Lesson/Snippet
-- (liking/bookmarking one cascades to the other), so counting them too would
-- just double-count the same underlying like/bookmark, and the app's own UI
-- never surfaces quiz/question as separate entities (see ITEM_TYPE_META in
-- ForYouPage.jsx — only module/lesson/story are ever shown).
-- Quota rule: the list always totals p_limit (10 by default), ranked overall
-- by count descending — EXCEPT that Story and Lesson each get a guaranteed
-- floor (p_min_stories / p_min_lessons) so a type with fewer raw likes than
-- Lessons doesn't get crowded out entirely. The floor is filled with that
-- type's own top entries first; whatever's left of p_limit after both floors
-- is then filled by the next-highest-count items of ANY type (which could
-- still be more stories/lessons, or modules). The whole thing is re-sorted
-- by count descending at the end, so the guaranteed rows land wherever their
-- own count actually ranks — the floor is a presence guarantee, not a
-- guarantee that stories/lessons appear first.
CREATE OR REPLACE FUNCTION get_top_liked_items(
  p_limit       integer DEFAULT 10,
  p_min_stories integer DEFAULT 4,
  p_min_lessons integer DEFAULT 2
)
RETURNS TABLE (
  content_type text,
  content_id   text,
  name         text,
  sub          text,
  item_count   bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH module_likes AS (
    SELECT lk.content_id, m.module_name AS name, t.title AS sub
    FROM likes lk
    JOIN modules m      ON lk.content_id::uuid = m.module_id
    LEFT JOIN themes t  ON m.theme_id           = t.theme_id
    WHERE lk.content_type = 'module'
  ),
  lesson_likes AS (
    SELECT lk.content_id, l.lesson_name AS name, t.title AS sub
    FROM likes lk
    JOIN lessons l      ON lk.content_id::uuid = l.lesson_id
    LEFT JOIN modules m ON l.module_id          = m.module_id
    LEFT JOIN themes t  ON m.theme_id           = t.theme_id
    WHERE lk.content_type = 'lesson'
  ),
  -- One row per snippet_likes.id: a snippet can map to more than one lesson
  -- via lesson_snippet_mapping, so pick a single mapping (DISTINCT ON) before
  -- counting — otherwise one like could get counted more than once.
  snippet_likes_dedup AS (
    SELECT DISTINCT ON (sl.id)
      sl.id, sl.snippet_id,
      COALESCE(
        (SELECT st.hook FROM snippet_translations st WHERE st.snippet_id = sc.snippet_id LIMIT 1),
        'Snippet'
      ) AS name,
      COALESCE(l.lesson_name, t.title, c.course_name) AS sub
    FROM snippet_likes sl
    JOIN snippet_core sc                     ON sl.snippet_id = sc.snippet_id
    LEFT JOIN lesson_snippet_mapping lsm     ON lsm.snippet_id = sc.snippet_id
    LEFT JOIN lessons l ON lsm.lesson_id = l.lesson_id
    LEFT JOIN modules m ON l.module_id   = m.module_id
    LEFT JOIN themes  t ON m.theme_id    = t.theme_id
    LEFT JOIN courses c ON m.course_id   = c.course_id
    ORDER BY sl.id, lsm.order_index
  ),
  ranked AS (
    SELECT 'module'::text AS content_type, content_id, name, sub, COUNT(*) AS item_count
    FROM module_likes GROUP BY content_id, name, sub

    UNION ALL

    SELECT 'lesson'::text, content_id, name, sub, COUNT(*)
    FROM lesson_likes GROUP BY content_id, name, sub

    UNION ALL

    SELECT 'story'::text, snippet_id::text, name, sub, COUNT(*)
    FROM snippet_likes_dedup GROUP BY snippet_id, name, sub
  ),
  floor_stories AS (
    SELECT * FROM ranked WHERE content_type = 'story'  ORDER BY item_count DESC LIMIT p_min_stories
  ),
  floor_lessons AS (
    SELECT * FROM ranked WHERE content_type = 'lesson' ORDER BY item_count DESC LIMIT p_min_lessons
  ),
  guaranteed AS (
    SELECT * FROM floor_stories
    UNION ALL
    SELECT * FROM floor_lessons
  ),
  backfill AS (
    SELECT r.* FROM ranked r
    WHERE NOT EXISTS (
      SELECT 1 FROM guaranteed g
      WHERE g.content_type = r.content_type AND g.content_id = r.content_id
    )
    ORDER BY r.item_count DESC
    LIMIT GREATEST(p_limit - (SELECT COUNT(*) FROM guaranteed), 0)
  )
  SELECT * FROM (
    SELECT * FROM guaranteed
    UNION ALL
    SELECT * FROM backfill
  ) final_list
  ORDER BY item_count DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_top_saved_items(
  p_limit       integer DEFAULT 10,
  p_min_stories integer DEFAULT 4,
  p_min_lessons integer DEFAULT 2
)
RETURNS TABLE (
  content_type text,
  content_id   text,
  name         text,
  sub          text,
  item_count   bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH module_saves AS (
    SELECT b.content_id, m.module_name AS name, t.title AS sub
    FROM bookmarks b
    JOIN modules m      ON b.content_id::uuid = m.module_id
    LEFT JOIN themes t  ON m.theme_id          = t.theme_id
    WHERE b.content_type = 'module'
  ),
  lesson_saves AS (
    SELECT b.content_id, l.lesson_name AS name, t.title AS sub
    FROM bookmarks b
    JOIN lessons l      ON b.content_id::uuid = l.lesson_id
    LEFT JOIN modules m ON l.module_id         = m.module_id
    LEFT JOIN themes t  ON m.theme_id          = t.theme_id
    WHERE b.content_type = 'lesson'
  ),
  snippet_saves_dedup AS (
    SELECT DISTINCT ON (b.id)
      b.id, b.content_id,
      COALESCE(
        (SELECT st.hook FROM snippet_translations st WHERE st.snippet_id = sc.snippet_id LIMIT 1),
        'Snippet'
      ) AS name,
      COALESCE(l.lesson_name, t.title, c.course_name) AS sub
    FROM bookmarks b
    JOIN snippet_core sc                 ON b.content_id::uuid = sc.snippet_id
    LEFT JOIN lesson_snippet_mapping lsm ON lsm.snippet_id     = sc.snippet_id
    LEFT JOIN lessons l ON lsm.lesson_id = l.lesson_id
    LEFT JOIN modules m ON l.module_id   = m.module_id
    LEFT JOIN themes  t ON m.theme_id    = t.theme_id
    LEFT JOIN courses c ON m.course_id   = c.course_id
    WHERE b.content_type = 'snippet'
    ORDER BY b.id, lsm.order_index
  ),
  ranked AS (
    SELECT 'module'::text AS content_type, content_id, name, sub, COUNT(*) AS item_count
    FROM module_saves GROUP BY content_id, name, sub

    UNION ALL

    SELECT 'lesson'::text, content_id, name, sub, COUNT(*)
    FROM lesson_saves GROUP BY content_id, name, sub

    UNION ALL

    SELECT 'story'::text, content_id, name, sub, COUNT(*)
    FROM snippet_saves_dedup GROUP BY content_id, name, sub
  ),
  floor_stories AS (
    SELECT * FROM ranked WHERE content_type = 'story'  ORDER BY item_count DESC LIMIT p_min_stories
  ),
  floor_lessons AS (
    SELECT * FROM ranked WHERE content_type = 'lesson' ORDER BY item_count DESC LIMIT p_min_lessons
  ),
  guaranteed AS (
    SELECT * FROM floor_stories
    UNION ALL
    SELECT * FROM floor_lessons
  ),
  backfill AS (
    SELECT r.* FROM ranked r
    WHERE NOT EXISTS (
      SELECT 1 FROM guaranteed g
      WHERE g.content_type = r.content_type AND g.content_id = r.content_id
    )
    ORDER BY r.item_count DESC
    LIMIT GREATEST(p_limit - (SELECT COUNT(*) FROM guaranteed), 0)
  )
  SELECT * FROM (
    SELECT * FROM guaranteed
    UNION ALL
    SELECT * FROM backfill
  ) final_list
  ORDER BY item_count DESC
  LIMIT p_limit;
$$;

-- ── 5. get_user_bookmarks() — add quiz + question branches ───────────────────
-- content_id stays text throughout: quiz_id is text (quiz_sets PK), question
-- branch matches on question_key (integer, stored as text in content_id).

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

    -- Snippets
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

    UNION ALL

    -- Quizzes: quiz_id is text (quiz_sets PK), no cast needed
    SELECT
      b.id, b.content_type, b.content_id, b.saved_at,
      qs.title                     AS item_name,
      l.lesson_name,
      m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM bookmarks b
    JOIN quiz_sets qs    ON b.content_id = qs.quiz_id
    LEFT JOIN lessons l  ON qs.lesson_id  = l.lesson_id
    LEFT JOIN modules m  ON l.module_id   = m.module_id
    LEFT JOIN themes  t  ON m.theme_id    = t.theme_id
    LEFT JOIN courses c  ON m.course_id   = c.course_id
    WHERE b.profile_id = auth.uid() AND b.content_type = 'quiz'

    UNION ALL

    -- Questions: content_id is question_key (integer, stored as text).
    -- Matches whichever of snippet_questions / standalone_questions has that key.
    SELECT * FROM (
      SELECT DISTINCT ON (b.id)
        b.id, b.content_type, b.content_id, b.saved_at,
        COALESCE(sq.question, stq.question, 'Question') AS item_name,
        NULL::text AS lesson_name,
        NULL::text AS module_name,
        NULL::text AS module_id,
        NULL::text AS theme_title,
        NULL::text AS theme_id,
        NULL::text AS course_id,
        NULL::text AS course_name
      FROM bookmarks b
      LEFT JOIN snippet_questions    sq  ON sq.question_key::text  = b.content_id
      LEFT JOIN standalone_questions stq ON stq.question_key::text = b.content_id
      WHERE b.profile_id = auth.uid() AND b.content_type = 'question'
      ORDER BY b.id
    ) questions

  ) all_bookmarks
  ORDER BY saved_at DESC;
$$;

-- ── 6. get_user_likes_by_type() — same shape as get_user_bookmarks(), sourced ─
--       from `likes` (module/lesson/quiz/question) UNION `snippet_likes`
--       (snippet). NOTE: a different, pre-existing get_user_likes() RPC already
--       lives in this database (used by LikesPage.jsx / ForYouPage.jsx for the
--       snippet-centric "My Likes" playlist view) — deliberately NOT touched
--       here, hence the distinct name.

CREATE OR REPLACE FUNCTION get_user_likes_by_type()
RETURNS TABLE (
  id           uuid,
  content_type text,
  content_id   text,
  liked_at     timestamptz,
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
      lk.id, lk.content_type, lk.content_id, lk.liked_at,
      l.lesson_name                AS item_name,
      l.lesson_name                AS lesson_name,
      m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM likes lk
    JOIN lessons l  ON lk.content_id::uuid = l.lesson_id
    JOIN modules m  ON l.module_id         = m.module_id
    JOIN themes  t  ON m.theme_id          = t.theme_id
    LEFT JOIN courses c ON m.course_id     = c.course_id
    WHERE lk.profile_id = auth.uid() AND lk.content_type = 'lesson'

    UNION ALL

    -- Modules
    SELECT
      lk.id, lk.content_type, lk.content_id, lk.liked_at,
      m.module_name                AS item_name,
      NULL, m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM likes lk
    JOIN modules m  ON lk.content_id::uuid = m.module_id
    JOIN themes  t  ON m.theme_id          = t.theme_id
    LEFT JOIN courses c ON m.course_id     = c.course_id
    WHERE lk.profile_id = auth.uid() AND lk.content_type = 'module'

    UNION ALL

    -- Quizzes
    SELECT
      lk.id, lk.content_type, lk.content_id, lk.liked_at,
      qs.title                     AS item_name,
      l.lesson_name,
      m.module_name,
      m.module_id::text            AS module_id,
      t.title                      AS theme_title,
      t.theme_id::text             AS theme_id,
      m.course_id::text            AS course_id,
      c.course_name
    FROM likes lk
    JOIN quiz_sets qs    ON lk.content_id = qs.quiz_id
    LEFT JOIN lessons l  ON qs.lesson_id  = l.lesson_id
    LEFT JOIN modules m  ON l.module_id   = m.module_id
    LEFT JOIN themes  t  ON m.theme_id    = t.theme_id
    LEFT JOIN courses c  ON m.course_id   = c.course_id
    WHERE lk.profile_id = auth.uid() AND lk.content_type = 'quiz'

    UNION ALL

    -- Questions
    SELECT * FROM (
      SELECT DISTINCT ON (lk.id)
        lk.id, lk.content_type, lk.content_id, lk.liked_at,
        COALESCE(sq.question, stq.question, 'Question') AS item_name,
        NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text
      FROM likes lk
      LEFT JOIN snippet_questions    sq  ON sq.question_key::text  = lk.content_id
      LEFT JOIN standalone_questions stq ON stq.question_key::text = lk.content_id
      WHERE lk.profile_id = auth.uid() AND lk.content_type = 'question'
      ORDER BY lk.id
    ) questions

    UNION ALL

    -- Snippets (existing snippet_likes table)
    SELECT * FROM (
      SELECT DISTINCT ON (sl.id)
        sl.id, 'snippet'::text AS content_type, sl.snippet_id::text AS content_id, sl.liked_at,
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
      FROM snippet_likes sl
      JOIN snippet_core sc              ON sl.snippet_id = sc.snippet_id
      LEFT JOIN lesson_snippet_mapping lsm ON lsm.snippet_id = sc.snippet_id
      LEFT JOIN lessons l  ON lsm.lesson_id  = l.lesson_id
      LEFT JOIN modules m  ON l.module_id    = m.module_id
      LEFT JOIN themes  t  ON m.theme_id     = t.theme_id
      LEFT JOIN courses c  ON m.course_id    = c.course_id
      WHERE sl.profile_id = auth.uid()
      ORDER BY sl.id, lsm.order_index
    ) snippets

  ) all_likes
  ORDER BY liked_at DESC;
$$;
