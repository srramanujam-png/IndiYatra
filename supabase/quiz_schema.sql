-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra Quiz Feature Schema
-- Branch: feature/quiz
-- Run this in the Supabase SQL Editor. Safe to re-run (uses IF NOT EXISTS /
-- CREATE OR REPLACE / ADD COLUMN IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. snippet_questions (Type 1 — linked to snippet_core) ───────────────────
-- One MCQ question per snippet per language.
-- Image comes from snippet_core via asset_id.
-- Post-answer reveal comes from snippet_translations (all fields except hook).

CREATE TABLE IF NOT EXISTS snippet_questions (
  question_id     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  snippet_id      uuid        NOT NULL REFERENCES snippet_core(snippet_id) ON DELETE CASCADE,
  language        text        NOT NULL,
  question        text        NOT NULL,
  correct_option  text        NOT NULL,
  wrong_option_1  text        NOT NULL,
  wrong_option_2  text        NOT NULL,
  wrong_option_3  text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snippet_id, language)
);

-- ── 2. standalone_questions (Type 2 — self-contained) ────────────────────────
-- Not linked to any snippet. Carries its own explanation block and optional image.

CREATE TABLE IF NOT EXISTS standalone_questions (
  question_id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  language          text        NOT NULL,
  question          text        NOT NULL,
  correct_option    text        NOT NULL,
  wrong_option_1    text        NOT NULL,
  wrong_option_2    text        NOT NULL,
  wrong_option_3    text        NOT NULL,
  explanation       text,
  key_term          text,
  key_term_meaning  text,
  life_connection   text,
  source_citation   text,
  asset_id          uuid        REFERENCES asset_library(asset_id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── 3. quiz_questions (junction — links quiz to questions) ────────────────────
-- Supports mixing Type 1 (snippet) and Type 2 (standalone) in the same quiz.
-- sort_order controls display sequence when shuffle_questions is false.
-- points allows different weight per question (default 1).

CREATE TABLE IF NOT EXISTS quiz_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        text NOT NULL REFERENCES quiz_sets(quiz_id) ON DELETE CASCADE,
  question_type  text NOT NULL CHECK (question_type IN ('snippet', 'standalone')),
  question_id    uuid NOT NULL,
  sort_order     int  NOT NULL DEFAULT 0,
  points         int  NOT NULL DEFAULT 1
);

-- ── 4. ALTER quiz_sets — add configuration columns ───────────────────────────

ALTER TABLE quiz_sets
  ADD COLUMN IF NOT EXISTS theme_id            uuid    REFERENCES themes(theme_id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level_id            text,
  ADD COLUMN IF NOT EXISTS course_id           uuid,
  ADD COLUMN IF NOT EXISTS shuffle_questions   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS question_time_limit integer,   -- seconds per question; NULL = untimed
  ADD COLUMN IF NOT EXISTS question_pool_size  integer,   -- pick N random from set; NULL = use all
  ADD COLUMN IF NOT EXISTS pass_percent        integer,   -- 0–100; NULL = no pass/fail threshold
  ADD COLUMN IF NOT EXISTS max_attempts        integer;   -- NULL = unlimited retakes

-- ── 5. ALTER quiz_attempts — add per-question answers ────────────────────────
-- answers JSON structure (array):
-- [{ question_id, question_type, chosen_option, correct_option,
--    is_correct (bool | null — null = unanswered/timed-out), points_awarded }]

ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS answers jsonb;

-- ── 6. Row Level Security ─────────────────────────────────────────────────────

-- snippet_questions
ALTER TABLE snippet_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snippet_questions_public_read"
  ON snippet_questions FOR SELECT USING (true);

CREATE POLICY "snippet_questions_auth_insert"
  ON snippet_questions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "snippet_questions_auth_update"
  ON snippet_questions FOR UPDATE
  USING (auth.role() = 'authenticated');

-- standalone_questions
ALTER TABLE standalone_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "standalone_questions_public_read"
  ON standalone_questions FOR SELECT USING (true);

CREATE POLICY "standalone_questions_auth_insert"
  ON standalone_questions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "standalone_questions_auth_update"
  ON standalone_questions FOR UPDATE
  USING (auth.role() = 'authenticated');

-- quiz_questions
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_questions_public_read"
  ON quiz_questions FOR SELECT USING (true);

CREATE POLICY "quiz_questions_auth_insert"
  ON quiz_questions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- quiz_attempts — users can only read/insert their own rows
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_attempts_own_select"
  ON quiz_attempts FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "quiz_attempts_own_insert"
  ON quiz_attempts FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- ── 7. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_snippet_questions_snippet_id
  ON snippet_questions (snippet_id);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id
  ON quiz_questions (quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_profile_id
  ON quiz_attempts (profile_id);

CREATE INDEX IF NOT EXISTS idx_quiz_sets_lesson_id
  ON quiz_sets (lesson_id);
