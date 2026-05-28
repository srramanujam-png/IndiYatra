-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Public SELECT policies for content tables
--
-- admin_content_schema.sql only added write (INSERT/UPDATE/DELETE) policies.
-- Without a SELECT policy, RLS blocks all reads for anon and non-admin users,
-- causing empty lesson_snippet_mapping, snippet_core, and snippet_translations
-- on every page that uses the anon supabase() helper.
--
-- All content is publicly readable — no auth required to browse snippets,
-- lessons, modules, etc.  Write operations remain admin-only.
--
-- Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── snippet_core ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "snippet_core_public_read" ON snippet_core;
CREATE POLICY "snippet_core_public_read" ON snippet_core
  FOR SELECT USING (true);

-- ── snippet_translations ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "snippet_translations_public_read" ON snippet_translations;
CREATE POLICY "snippet_translations_public_read" ON snippet_translations
  FOR SELECT USING (true);

-- ── lesson_snippet_mapping ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "lesson_snippet_mapping_public_read" ON lesson_snippet_mapping;
CREATE POLICY "lesson_snippet_mapping_public_read" ON lesson_snippet_mapping
  FOR SELECT USING (true);

-- ── lessons ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "lessons_public_read" ON lessons;
CREATE POLICY "lessons_public_read" ON lessons
  FOR SELECT USING (true);

-- ── modules ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "modules_public_read" ON modules;
CREATE POLICY "modules_public_read" ON modules
  FOR SELECT USING (true);

-- ── courses ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "courses_public_read" ON courses;
CREATE POLICY "courses_public_read" ON courses
  FOR SELECT USING (true);

-- ── themes ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "themes_public_read" ON themes;
CREATE POLICY "themes_public_read" ON themes
  FOR SELECT USING (true);

-- ── Verify — all should return > 0 after a successful import ─────────────────
SELECT
  (SELECT COUNT(*) FROM snippet_core)           AS snippets,
  (SELECT COUNT(*) FROM snippet_translations)   AS translations,
  (SELECT COUNT(*) FROM lesson_snippet_mapping) AS mappings,
  (SELECT COUNT(*) FROM lessons)                AS lessons,
  (SELECT COUNT(*) FROM modules)                AS modules,
  (SELECT COUNT(*) FROM courses)                AS courses,
  (SELECT COUNT(*) FROM themes)                 AS themes;
