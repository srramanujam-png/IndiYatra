-- ============================================================
-- taxonomy_add_notes_column.sql
-- Add a nullable `notes` column to content_taxonomy_mapping.
-- Stores Gemini classification rationale for each term→entity mapping.
-- Safe to re-run: uses IF NOT EXISTS guard via DO block.
-- Run BEFORE snippet_taxonomy_mapping.sql
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'content_taxonomy_mapping'
      AND column_name  = 'notes'
  ) THEN
    ALTER TABLE content_taxonomy_mapping ADD COLUMN notes text;
  END IF;
END $$;
