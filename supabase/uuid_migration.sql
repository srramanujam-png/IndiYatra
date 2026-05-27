-- =============================================================
-- uuid_migration.sql  (v3 — complete FK coverage from live schema)
-- Run AFTER the content wipe (TRUNCATE) + user activity wipe.
-- All content + activity tables must be empty before running this.
-- =============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 1. DROP ALL FK CONSTRAINTS that reference PKs we are changing
--    Listed exhaustively from the live schema query.
--    IF EXISTS makes every DROP safe to re-run.
-- ──────────────────────────────────────────────────────────────

-- → asset_library.asset_id (7 tables reference it)
ALTER TABLE courses      DROP CONSTRAINT IF EXISTS courses_asset_id_fkey;
ALTER TABLE icons        DROP CONSTRAINT IF EXISTS icons_asset_id_fkey;
ALTER TABLE lessons      DROP CONSTRAINT IF EXISTS lessons_asset_id_fkey;
ALTER TABLE levels       DROP CONSTRAINT IF EXISTS levels_asset_id_fkey;
ALTER TABLE modules      DROP CONSTRAINT IF EXISTS modules_asset_id_fkey;
ALTER TABLE snippet_core DROP CONSTRAINT IF EXISTS snippet_core_asset_id_fkey;
ALTER TABLE themes       DROP CONSTRAINT IF EXISTS themes_asset_id_fkey;

-- → courses.course_id (5 tables reference it)
ALTER TABLE lesson_completions DROP CONSTRAINT IF EXISTS lesson_completions_course_id_fkey;
ALTER TABLE modules            DROP CONSTRAINT IF EXISTS modules_course_id_fkey;
ALTER TABLE snippet_likes      DROP CONSTRAINT IF EXISTS bookmarks_course_id_fkey;
ALTER TABLE snippet_views      DROP CONSTRAINT IF EXISTS snippet_views_course_id_fkey;
ALTER TABLE themes             DROP CONSTRAINT IF EXISTS themes_course_id_fkey;

-- → lessons.lesson_id (4 tables reference it)
ALTER TABLE lesson_completions     DROP CONSTRAINT IF EXISTS lesson_completions_lesson_id_fkey;
ALTER TABLE lesson_editors         DROP CONSTRAINT IF EXISTS lesson_editors_lesson_id_fkey;
ALTER TABLE lesson_snippet_mapping DROP CONSTRAINT IF EXISTS lesson_snippet_mapping_lesson_id_fkey;
ALTER TABLE quiz_sets              DROP CONSTRAINT IF EXISTS quiz_sets_lesson_id_fkey;

-- → modules.module_id (2 tables reference it)
ALTER TABLE lessons   DROP CONSTRAINT IF EXISTS lessons_module_id_fkey;
ALTER TABLE quiz_sets DROP CONSTRAINT IF EXISTS quiz_sets_module_id_fkey;

-- → snippet_core.snippet_id (4 tables reference it)
ALTER TABLE lesson_snippet_mapping DROP CONSTRAINT IF EXISTS lesson_snippet_mapping_snippet_id_fkey;
ALTER TABLE snippet_likes          DROP CONSTRAINT IF EXISTS bookmarks_snippet_id_fkey;
ALTER TABLE snippet_translations   DROP CONSTRAINT IF EXISTS snippet_translations_snippet_id_fkey;
ALTER TABLE snippet_views          DROP CONSTRAINT IF EXISTS snippet_views_snippet_id_fkey;

-- → themes.theme_id (1 table references it)
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_theme_id_fkey;

-- ──────────────────────────────────────────────────────────────
-- 2. DROP UNIQUE/PK CONSTRAINTS on activity tables that include
--    text ID columns we are changing
-- ──────────────────────────────────────────────────────────────

ALTER TABLE lesson_progress
  DROP CONSTRAINT IF EXISTS lesson_progress_pkey;

ALTER TABLE snippet_likes
  DROP CONSTRAINT IF EXISTS snippet_likes_profile_id_snippet_id_key;

-- ──────────────────────────────────────────────────────────────
-- 3. CHANGE PK COLUMN TYPES  (tables are empty — USING is safe)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE asset_library
  ALTER COLUMN asset_id   TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN asset_id   SET DEFAULT gen_random_uuid();

ALTER TABLE courses
  ALTER COLUMN course_id  TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN course_id  SET DEFAULT gen_random_uuid();

ALTER TABLE themes
  ALTER COLUMN theme_id   TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN theme_id   SET DEFAULT gen_random_uuid();

ALTER TABLE modules
  ALTER COLUMN module_id  TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN module_id  SET DEFAULT gen_random_uuid();

ALTER TABLE lessons
  ALTER COLUMN lesson_id  TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN lesson_id  SET DEFAULT gen_random_uuid();

ALTER TABLE snippet_core
  ALTER COLUMN snippet_id TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN snippet_id SET DEFAULT gen_random_uuid();

-- ──────────────────────────────────────────────────────────────
-- 4. CHANGE FK REFERENCE COLUMNS IN CONTENT TABLES
--    (tables are empty — NULL-safe to use gen_random_uuid() USING)
-- ──────────────────────────────────────────────────────────────

-- courses → asset_library
ALTER TABLE courses
  ALTER COLUMN asset_id TYPE uuid USING gen_random_uuid();

-- themes → courses, asset_library
ALTER TABLE themes
  ALTER COLUMN course_id TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN asset_id  TYPE uuid USING gen_random_uuid();

-- modules → courses, themes, asset_library
ALTER TABLE modules
  ALTER COLUMN course_id TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN theme_id  TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN asset_id  TYPE uuid USING gen_random_uuid();

-- lessons → modules, asset_library
ALTER TABLE lessons
  ALTER COLUMN module_id TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN asset_id  TYPE uuid USING gen_random_uuid();

-- snippet_core → asset_library (nullable)
ALTER TABLE snippet_core
  ALTER COLUMN asset_id TYPE uuid USING gen_random_uuid();

-- snippet_translations → snippet_core
ALTER TABLE snippet_translations
  ALTER COLUMN snippet_id TYPE uuid USING gen_random_uuid();
  -- language column (LANG_01 etc.) stays text

-- lesson_snippet_mapping → lessons, snippet_core
ALTER TABLE lesson_snippet_mapping
  ALTER COLUMN lesson_id  TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN snippet_id TYPE uuid USING gen_random_uuid();

-- icons → asset_library (level_id-style lookup table; asset_id is FK only)
ALTER TABLE icons
  ALTER COLUMN asset_id TYPE uuid USING gen_random_uuid();

-- levels → asset_library  (level_id stays text — LEVEL_001 etc.)
ALTER TABLE levels
  ALTER COLUMN asset_id TYPE uuid USING gen_random_uuid();

-- ──────────────────────────────────────────────────────────────
-- 5. CHANGE ACTIVITY TABLE REFERENCE COLUMNS
--    (safe — these tables are empty after the wipe)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE lesson_completions
  ALTER COLUMN lesson_id TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN course_id TYPE uuid USING gen_random_uuid();

ALTER TABLE lesson_progress
  ALTER COLUMN lesson_id TYPE uuid USING gen_random_uuid();

ALTER TABLE snippet_likes
  ALTER COLUMN snippet_id TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN lesson_id  TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN module_id  TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN theme_id   TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN course_id  TYPE uuid USING gen_random_uuid();

ALTER TABLE snippet_comments
  ALTER COLUMN snippet_id TYPE uuid USING gen_random_uuid();

ALTER TABLE snippet_views
  ALTER COLUMN snippet_id TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN course_id  TYPE uuid USING gen_random_uuid();

ALTER TABLE lesson_editors
  ALTER COLUMN lesson_id TYPE uuid USING gen_random_uuid();

ALTER TABLE quiz_sets
  ALTER COLUMN lesson_id TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN module_id TYPE uuid USING gen_random_uuid();

-- ──────────────────────────────────────────────────────────────
-- 6. RESTORE UNIQUE / PK CONSTRAINTS
-- ──────────────────────────────────────────────────────────────

ALTER TABLE lesson_progress
  ADD PRIMARY KEY (profile_id, lesson_id);

ALTER TABLE snippet_likes
  ADD CONSTRAINT snippet_likes_profile_id_snippet_id_key
  UNIQUE (profile_id, snippet_id);

-- ──────────────────────────────────────────────────────────────
-- 7. RESTORE ALL FK CONSTRAINTS
-- ──────────────────────────────────────────────────────────────

-- Content table FKs
ALTER TABLE courses
  ADD CONSTRAINT courses_asset_id_fkey
    FOREIGN KEY (asset_id) REFERENCES asset_library(asset_id) ON DELETE SET NULL;

ALTER TABLE themes
  ADD CONSTRAINT themes_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(course_id)     ON DELETE SET NULL,
  ADD CONSTRAINT themes_asset_id_fkey
    FOREIGN KEY (asset_id)  REFERENCES asset_library(asset_id) ON DELETE SET NULL;

ALTER TABLE modules
  ADD CONSTRAINT modules_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(course_id)     ON DELETE SET NULL,
  ADD CONSTRAINT modules_theme_id_fkey
    FOREIGN KEY (theme_id)  REFERENCES themes(theme_id)       ON DELETE SET NULL,
  ADD CONSTRAINT modules_asset_id_fkey
    FOREIGN KEY (asset_id)  REFERENCES asset_library(asset_id) ON DELETE SET NULL;

ALTER TABLE lessons
  ADD CONSTRAINT lessons_module_id_fkey
    FOREIGN KEY (module_id) REFERENCES modules(module_id)      ON DELETE SET NULL,
  ADD CONSTRAINT lessons_asset_id_fkey
    FOREIGN KEY (asset_id)  REFERENCES asset_library(asset_id) ON DELETE SET NULL;

ALTER TABLE snippet_core
  ADD CONSTRAINT snippet_core_asset_id_fkey
    FOREIGN KEY (asset_id) REFERENCES asset_library(asset_id) ON DELETE SET NULL;

ALTER TABLE snippet_translations
  ADD CONSTRAINT snippet_translations_snippet_id_fkey
    FOREIGN KEY (snippet_id) REFERENCES snippet_core(snippet_id) ON DELETE CASCADE;

ALTER TABLE lesson_snippet_mapping
  ADD CONSTRAINT lesson_snippet_mapping_lesson_id_fkey
    FOREIGN KEY (lesson_id)  REFERENCES lessons(lesson_id)        ON DELETE CASCADE,
  ADD CONSTRAINT lesson_snippet_mapping_snippet_id_fkey
    FOREIGN KEY (snippet_id) REFERENCES snippet_core(snippet_id)  ON DELETE CASCADE;

ALTER TABLE icons
  ADD CONSTRAINT icons_asset_id_fkey
    FOREIGN KEY (asset_id) REFERENCES asset_library(asset_id) ON DELETE SET NULL;

ALTER TABLE levels
  ADD CONSTRAINT levels_asset_id_fkey
    FOREIGN KEY (asset_id) REFERENCES asset_library(asset_id) ON DELETE SET NULL;

-- Activity table FKs
ALTER TABLE lesson_completions
  ADD CONSTRAINT lesson_completions_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(course_id)  ON DELETE SET NULL,
  ADD CONSTRAINT lesson_completions_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id)  ON DELETE SET NULL;

ALTER TABLE snippet_likes
  ADD CONSTRAINT bookmarks_course_id_fkey
    FOREIGN KEY (course_id)  REFERENCES courses(course_id)        ON DELETE SET NULL,
  ADD CONSTRAINT bookmarks_snippet_id_fkey
    FOREIGN KEY (snippet_id) REFERENCES snippet_core(snippet_id)  ON DELETE CASCADE;

ALTER TABLE snippet_views
  ADD CONSTRAINT snippet_views_course_id_fkey
    FOREIGN KEY (course_id)  REFERENCES courses(course_id)        ON DELETE SET NULL,
  ADD CONSTRAINT snippet_views_snippet_id_fkey
    FOREIGN KEY (snippet_id) REFERENCES snippet_core(snippet_id)  ON DELETE CASCADE;

ALTER TABLE lesson_editors
  ADD CONSTRAINT lesson_editors_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE;

ALTER TABLE quiz_sets
  ADD CONSTRAINT quiz_sets_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id)  ON DELETE CASCADE,
  ADD CONSTRAINT quiz_sets_module_id_fkey
    FOREIGN KEY (module_id) REFERENCES modules(module_id)  ON DELETE SET NULL;

COMMIT;

-- ──────────────────────────────────────────────────────────────
-- 8. SEED LEVELS (run after COMMIT — idempotent)
-- Levels keep text IDs. Titles must match LEVEL_LABELS in the
-- frontend (supabase.js). Do not add or rename levels without
-- updating that constant.
-- ──────────────────────────────────────────────────────────────

INSERT INTO levels (level_id, level_number, title) VALUES
  ('LEVEL_001', 1, 'Preparatory'),
  ('LEVEL_002', 2, 'Middle'),
  ('LEVEL_003', 3, 'Secondary')
ON CONFLICT (level_id) DO UPDATE
  SET level_number = EXCLUDED.level_number,
      title        = EXCLUDED.title;
