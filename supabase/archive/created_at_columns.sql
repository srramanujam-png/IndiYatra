-- created_at_columns migration
-- Adds created_at to modules and lessons (needed for the ForYouPage "Latest"
-- section, which sorts by creation time).
--
-- Note: quiz_sets already has a created_at column (confirmed live) — no
-- action needed there.
--
-- Existing rows have no real creation timestamp recorded anywhere, so this
-- backfills them all to the moment this migration runs (a single shared
-- timestamp). Every module/lesson created after this point will get an
-- accurate created_at automatically via the column default.
--
-- Run once in the Supabase SQL editor.

ALTER TABLE modules ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Indexes to keep "ORDER BY created_at DESC LIMIT n" queries cheap as tables grow.
CREATE INDEX IF NOT EXISTS idx_modules_created_at ON modules(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);
