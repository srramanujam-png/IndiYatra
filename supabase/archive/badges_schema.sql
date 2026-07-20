-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Badge System
-- Run this in Supabase SQL Editor
-- Names / icons / descriptions can be edited directly in the badges table later
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. badges table (catalogue) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  badge_id        TEXT PRIMARY KEY,
  badge_name      TEXT        NOT NULL,
  badge_icon      TEXT        NOT NULL DEFAULT '🏆',
  badge_category  TEXT        NOT NULL CHECK (badge_category IN ('progression','volume','streak','daily')),
  criteria_type   TEXT        NOT NULL,
  criteria_value  INT         NOT NULL DEFAULT 1,
  description     TEXT,
  sort_order      INT         NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT true
);

-- ── 2. user_badges table (earned records) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id    TEXT        NOT NULL REFERENCES badges(badge_id),
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, badge_id)
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_user_badges_profile ON user_badges (profile_id);

-- ── 3. RLS policies ──────────────────────────────────────────────────────────
ALTER TABLE badges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- badges: anyone can read (catalogue is public)
CREATE POLICY "badges_public_read" ON badges
  FOR SELECT USING (true);

-- user_badges: users can read their own rows
CREATE POLICY "user_badges_own_read" ON user_badges
  FOR SELECT USING (auth.uid() = profile_id);

-- user_badges: authenticated users can insert their own rows (client-side awarding)
CREATE POLICY "user_badges_own_insert" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- ── 4. Seed: 25 badges ───────────────────────────────────────────────────────
-- criteria_type reference:
--   lessons_completed   total lessons completed ≥ value
--   modules_completed   modules where all lessons done ≥ value
--   themes_completed    themes where all modules done ≥ value
--   levels_completed    levels where all themes done ≥ value
--   courses_completed   courses fully done ≥ value
--   snippets_viewed     total snippets viewed ≥ value
--   dharma_total        total dharma points ≥ value
--   streak_days         best streak ≥ value days
--   comeback            returned after ≥ value days away
--   daily_lessons       ≥ value lessons completed in a single day
--   daily_dharma        ≥ value dharma earned in a single day

INSERT INTO badges
  (badge_id, badge_name, badge_icon, badge_category, criteria_type, criteria_value, description, sort_order)
VALUES

-- ── Progression ──────────────────────────────────────────────────────────────
('BADGE_P01', 'First Step',        '🪔', 'progression', 'lessons_completed',  1, 'Complete your very first lesson',               10),
('BADGE_P02', 'Module Complete',   '📜', 'progression', 'modules_completed',  1, 'Complete all lessons in a module',              20),
('BADGE_P03', 'Theme Explorer',    '🗺️', 'progression', 'themes_completed',   1, 'Complete all modules in a theme',               30),
('BADGE_P04', 'Level Achiever',    '⭐', 'progression', 'levels_completed',   1, 'Complete all themes in a level',                40),
('BADGE_P05', 'Course Master',     '🏛️', 'progression', 'courses_completed',  1, 'Complete an entire course',                     50),

-- ── Volume — Lessons ─────────────────────────────────────────────────────────
('BADGE_V01', '10 Lessons',        '📖', 'volume',      'lessons_completed',  10,  'Complete 10 lessons',                          110),
('BADGE_V02', '25 Lessons',        '📚', 'volume',      'lessons_completed',  25,  'Complete 25 lessons',                          120),
('BADGE_V03', '50 Lessons',        '🎓', 'volume',      'lessons_completed',  50,  'Complete 50 lessons',                          130),

-- ── Volume — Snippets ────────────────────────────────────────────────────────
('BADGE_V04', '25 Snippets',       '👁️', 'volume',      'snippets_viewed',    25,  'View 25 snippets',                             140),
('BADGE_V05', '100 Snippets',      '🌿', 'volume',      'snippets_viewed',    100, 'View 100 snippets',                            150),
('BADGE_V06', '500 Snippets',      '🌟', 'volume',      'snippets_viewed',    500, 'View 500 snippets',                            160),

-- ── Volume — Dharma ──────────────────────────────────────────────────────────
('BADGE_V07', '100 Dharma',        '✦',  'volume',      'dharma_total',       100,  'Earn 100 Dharma Points',                      170),
('BADGE_V08', '500 Dharma',        '🪷', 'volume',      'dharma_total',       500,  'Earn 500 Dharma Points',                      180),
('BADGE_V09', '2000 Dharma',       '🌳', 'volume',      'dharma_total',       2000, 'Earn 2000 Dharma Points',                     190),
('BADGE_V10', '5000 Dharma',       '🌊', 'volume',      'dharma_total',       5000, 'Earn 5000 Dharma Points',                     200),

-- ── Streak ───────────────────────────────────────────────────────────────────
('BADGE_S01', '3-Day Streak',      '🌅', 'streak',      'streak_days',        3,  'Learn 3 days in a row',                        310),
('BADGE_S02', '7-Day Streak',      '🌙', 'streak',      'streak_days',        7,  'Learn 7 days in a row',                        320),
('BADGE_S03', '14-Day Streak',     '🌠', 'streak',      'streak_days',        14, 'Learn 14 days in a row',                       330),
('BADGE_S04', '30-Day Streak',     '☀️', 'streak',      'streak_days',        30, 'Learn 30 days in a row',                       340),
('BADGE_S05', 'Comeback',          '🔄', 'streak',      'comeback',           7,  'Return after 7 or more days away',             350),

-- ── Daily Achievement ────────────────────────────────────────────────────────
('BADGE_D01', '3 Lessons in a Day',  '🌞', 'daily',    'daily_lessons',      3,   'Complete 3 lessons in a single day',           410),
('BADGE_D02', '5 Lessons in a Day',  '🔥', 'daily',    'daily_lessons',      5,   'Complete 5 lessons in a single day',           420),
('BADGE_D03', '10 Lessons in a Day', '💫', 'daily',    'daily_lessons',      10,  'Complete 10 lessons in a single day',          430),
('BADGE_D04', '50 Dharma in a Day',  '✨', 'daily',    'daily_dharma',       50,  'Earn 50 Dharma Points in a single day',        440),
('BADGE_D05', '100 Dharma in a Day', '⚡', 'daily',    'daily_dharma',       100, 'Earn 100 Dharma Points in a single day',       450)

ON CONFLICT (badge_id) DO NOTHING;
