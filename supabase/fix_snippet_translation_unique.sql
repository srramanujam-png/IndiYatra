-- Fix: snippet_translations was missing a unique constraint on (snippet_id, language).
-- Without it, upserts with onConflict: "snippet_id,language" fail with
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification".
--
-- Also used by editorial_publish.sql's publish_draft() RPC.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE snippet_translations
  ADD CONSTRAINT IF NOT EXISTS snippet_translations_snippet_id_language_key
  UNIQUE (snippet_id, language);
