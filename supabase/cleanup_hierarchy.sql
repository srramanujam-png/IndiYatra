-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Full content wipe before clean re-import
--
-- Clears ALL content tables in dependency order so foreign key constraints
-- are not violated. User accounts and profile data are NOT touched.
--
-- Run BEFORE re-importing. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Mappings first (references lessons + snippets) ────────────────────────
DELETE FROM lesson_snippet_mapping;

-- ── 2. Snippets (translations reference snippet_core) ────────────────────────
DELETE FROM snippet_translations;
DELETE FROM snippet_core;

-- ── 3. Content hierarchy ─────────────────────────────────────────────────────
DELETE FROM lessons;
DELETE FROM modules;
DELETE FROM courses;
DELETE FROM themes;

-- ── 4. Asset library ─────────────────────────────────────────────────────────
DELETE FROM asset_library;

-- ── Sanity check — every count should be 0 ───────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM lesson_snippet_mapping) AS mappings,
  (SELECT COUNT(*) FROM snippet_translations)   AS translations,
  (SELECT COUNT(*) FROM snippet_core)           AS snippets,
  (SELECT COUNT(*) FROM lessons)                AS lessons,
  (SELECT COUNT(*) FROM modules)                AS modules,
  (SELECT COUNT(*) FROM courses)                AS courses,
  (SELECT COUNT(*) FROM themes)                 AS themes,
  (SELECT COUNT(*) FROM asset_library)          AS assets;
