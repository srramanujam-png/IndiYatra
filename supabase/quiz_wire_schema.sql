-- ─────────────────────────────────────────────────────────────────────────────
-- Quiz wiring schema
-- Adds question_key to quiz_questions so quizzes are language-agnostic.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add question_key — the language-agnostic reference to a question concept
ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS question_key integer;

-- question_id was a language-specific UUID; make it optional now that
-- question_key is the primary reference
ALTER TABLE quiz_questions
  ALTER COLUMN question_id DROP NOT NULL;

-- Prevent the same question appearing twice in the same quiz
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_questions_quiz_question_key
  ON quiz_questions (quiz_id, question_key)
  WHERE question_key IS NOT NULL;

COMMENT ON COLUMN quiz_questions.question_key IS
  'Language-agnostic reference. At runtime getQuizQuestions resolves this to the
   appropriate language row in snippet_questions or standalone_questions.';
