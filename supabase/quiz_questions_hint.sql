-- ─────────────────────────────────────────────────────────────────────────────
-- Add hint column to snippet_questions
-- Branch: feature/quiz
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE snippet_questions
  ADD COLUMN IF NOT EXISTS hint text;   -- Optional learner hint; NULL = no hint

COMMENT ON COLUMN snippet_questions.hint IS
  'Optional hint shown to learner on request (may carry a score penalty). NULL = no hint for this question.';
