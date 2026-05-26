-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Token Catalogue
-- Run this in Supabase SQL Editor
-- Defines available token types; user_tokens stores award records only.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. tokens table (catalogue) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens (
  token_type    TEXT        PRIMARY KEY,
  token_name    TEXT        NOT NULL,
  token_icon    TEXT        NOT NULL DEFAULT '🪙',
  description   TEXT,
  earn_trigger  TEXT,           -- e.g. "lesson", "module", "theme", "level", "course", "points"
  sort_order    INT         NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT true
);

-- ── 2. RLS policies ──────────────────────────────────────────────────────────
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;

-- tokens: anyone can read (catalogue is public)
CREATE POLICY "tokens_public_read" ON tokens
  FOR SELECT USING (true);

-- tokens: only admins can write (managed via service_role or admin functions)
-- Admin writes go through supabaseClient (JWT) with admin check enforced in app layer.
-- If you add a DB-level admin role later, add policies here.

-- ── 3. Optional: add FK from user_tokens.token_type → tokens.token_type ──────
-- Run only if user_tokens already exists and you want referential integrity.
-- Comment out if you prefer loose coupling during development.
--
-- ALTER TABLE user_tokens
--   ADD CONSTRAINT fk_user_tokens_type
--   FOREIGN KEY (token_type) REFERENCES tokens(token_type)
--   ON UPDATE CASCADE ON DELETE RESTRICT;

-- ── 4. Seed: 6 existing token types ──────────────────────────────────────────
-- earn_trigger maps to the completion tier that awards this token.
-- "points" is special — dharma quantity equals lesson points earned.

INSERT INTO tokens
  (token_type, token_name, token_icon, description, earn_trigger, sort_order)
VALUES
  ('tulsi',  'Tulsi Leaf',   '🌿', 'Common sacred plant — awarded for every lesson completed',     'lesson',  10),
  ('ashoka', 'Ashoka Token', '🌸', 'Sacred tree — awarded when a module is fully completed',       'module',  20),
  ('lotus',  'Lotus Bloom',  '🪷', 'Knowledge flower — awarded when a theme is fully completed',   'theme',   30),
  ('peepal', 'Peepal Leaf',  '🍃', 'Sacred fig — awarded when a level is fully completed',         'level',   40),
  ('banyan', 'Banyan Seed',  '🌳', 'Majestic deep roots — awarded when a course is completed',     'course',  50),
  ('dharma', 'Dharma Point', '✦',  'Seed currency — quantity equals lesson points earned',         'points',  60)
ON CONFLICT (token_type) DO NOTHING;
