-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Cleanup after partial import failure
--
-- The bulk import created snippet_core rows but all snippet_translations
-- inserts failed (snippet_translation_id NOT NULL + asset_library RLS).
-- On re-import the deduplication hook-lookup comes up empty, causing
-- duplicate snippet_core rows.
--
-- This script removes the orphaned snippet_core rows (those with no
-- translation) and their dangling lesson_snippet_mapping rows.
-- Lessons, themes, courses are KEPT — they're valid and will be reused.
--
-- Run AFTER fix_import_errors.sql, BEFORE re-running the import.
-- Safe to re-run — deletes are scoped to truly orphaned rows only.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Remove mappings pointing at snippets with no translations ─────────
DELETE FROM lesson_snippet_mapping
WHERE snippet_id IN (
  SELECT sc.snippet_id
  FROM snippet_core sc
  LEFT JOIN snippet_translations st ON st.snippet_id = sc.snippet_id
  WHERE st.snippet_id IS NULL
);

-- ── Step 2: Remove the orphaned snippet_core rows themselves ──────────────────
DELETE FROM snippet_core
WHERE snippet_id NOT IN (
  SELECT DISTINCT snippet_id FROM snippet_translations
);

-- ── Sanity check: should return 0 rows ───────────────────────────────────────
SELECT COUNT(*) AS orphaned_snippets_remaining
FROM snippet_core sc
LEFT JOIN snippet_translations st ON st.snippet_id = sc.snippet_id
WHERE st.snippet_id IS NULL;
