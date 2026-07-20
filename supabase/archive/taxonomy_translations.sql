-- ============================================================
-- taxonomy_translations.sql
-- Create taxonomy_term_translations table for multilingual
-- taxonomy term names. Consistent with snippet_translations pattern.
-- Run AFTER rename_taxonomy_table.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS taxonomy_term_translations (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  term_id     text        NOT NULL REFERENCES taxonomy_terms(term_id) ON DELETE CASCADE,
  language_id text        NOT NULL REFERENCES languages(language_id),
  name        text        NOT NULL,
  UNIQUE (term_id, language_id)
);

-- Public read (same as taxonomy_terms)
ALTER TABLE taxonomy_term_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read taxonomy_term_translations"
  ON taxonomy_term_translations
  FOR SELECT
  USING (true);

-- ============================================================
-- How to add translations later:
-- INSERT INTO taxonomy_term_translations (term_id, language_id, name) VALUES
--   ('TERM_001', 'LANG_02', 'ವಾಸ್ತುಶಿಲ್ಪ'),   -- Architecture in Kannada
--   ('TERM_002', 'LANG_02', 'ಕಲೆ'),              -- Art in Kannada
--   ...
-- ON CONFLICT (term_id, language_id) DO UPDATE SET name = EXCLUDED.name;
-- ============================================================
