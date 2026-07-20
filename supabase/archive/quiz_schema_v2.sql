-- ─────────────────────────────────────────────────────────────────────────────
-- Quiz Schema v2
-- Branch: feature/quiz
-- Supersedes: quiz_questions_hint.sql (run this instead, not both)
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. snippet_questions: add question_key, add hint, drop per-snippet unique ─

-- Stable integer import/reference key — mirrors snippet_core.import_key
-- Allows multiple questions per snippet (different difficulties, angles, etc.)
ALTER TABLE snippet_questions
  ADD COLUMN IF NOT EXISTS question_key integer,
  ADD COLUMN IF NOT EXISTS hint         text;

-- Drop old single-column index if it was created by an earlier run of this migration
DROP INDEX IF EXISTS uq_snippet_questions_question_key;

-- question_key identifies the question concept; language is a separate dimension.
-- The same question_key can appear in multiple languages (one row per concept per language).
CREATE UNIQUE INDEX IF NOT EXISTS uq_snippet_questions_question_key_language
  ON snippet_questions (question_key, language)
  WHERE question_key IS NOT NULL;

-- Drop the one-question-per-snippet-per-language constraint so we can have
-- multiple questions mapped to the same snippet.
ALTER TABLE snippet_questions
  DROP CONSTRAINT IF EXISTS snippet_questions_snippet_id_language_key;

-- ── 2. standalone_questions: add question_key + hint ─────────────────────────

ALTER TABLE standalone_questions
  ADD COLUMN IF NOT EXISTS question_key integer,
  ADD COLUMN IF NOT EXISTS hint         text;

DROP INDEX IF EXISTS uq_standalone_questions_question_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_standalone_questions_question_key_language
  ON standalone_questions (question_key, language)
  WHERE question_key IS NOT NULL;

-- ── 3. Comments ───────────────────────────────────────────────────────────────

COMMENT ON COLUMN snippet_questions.question_key IS
  'Stable integer import key. Unique across snippet_questions + standalone_questions. Used as the dedup key for re-imports and as the bank identifier in the question picker.';

COMMENT ON COLUMN snippet_questions.hint IS
  'Optional hint shown on learner request. May carry a score penalty.';

COMMENT ON COLUMN standalone_questions.question_key IS
  'Stable integer import key. Same namespace as snippet_questions.question_key.';

COMMENT ON COLUMN standalone_questions.hint IS
  'Optional hint shown on learner request. May carry a score penalty.';
