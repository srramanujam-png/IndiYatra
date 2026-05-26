-- ============================================================
-- rename_taxonomy_table.sql
-- Rename snippet_taxonomy_mapping → content_taxonomy_mapping
-- Run this in the Supabase SQL Editor (once, when table is empty)
-- ============================================================

ALTER TABLE snippet_taxonomy_mapping RENAME TO content_taxonomy_mapping;

-- Supabase automatically renames dependent indexes and RLS policies
-- when a table is renamed, so no further action is needed.

-- Verify:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'content_taxonomy_mapping';
