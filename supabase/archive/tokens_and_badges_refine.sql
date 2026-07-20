-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Forest token system + badge table cleanup
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. user_tokens — the growing forest ──────────────────────────────────────
--
-- token_type values:
--   'tulsi'   — 1 per lesson completed          (common, grows in every home)
--   'ashoka'  — 1 per module completed          (sacred, marks achievement)
--   'lotus'   — 1 per theme completed           (knowledge unfolding)
--   'peepal'  — 1 per level completed           (large, enduring)
--   'banyan'  — 1 per course completed          (majestic, deep roots)
--   'dharma'  — quantity = dharma points earned (seeds that fuel the forest)
--                 recorded at lesson completion (per-snippet granularity: Phase II)
--
CREATE TABLE IF NOT EXISTS user_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_type  TEXT        NOT NULL CHECK (token_type IN ('tulsi','ashoka','lotus','peepal','banyan','dharma')),
  quantity    INT         NOT NULL DEFAULT 1,   -- 1 for plants; dharma_points for 'dharma'
  source_type TEXT,                             -- 'lesson' | 'module' | 'theme' | 'level' | 'course' | 'snippet'
  source_id   TEXT,                             -- ID of the triggering entity
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_tokens_profile ON user_tokens (profile_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_type    ON user_tokens (profile_id, token_type);

ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_tokens_own_read" ON user_tokens
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "user_tokens_own_insert" ON user_tokens
  FOR INSERT WITH CHECK (auth.uid() = profile_id);


-- ── 2. Trim badges table to 10 rows ──────────────────────────────────────────
--
-- Keep 10 slots:
--   BADGE_P01  First Step          (reserve — inactive)
--   BADGE_P02  Curiosity           (ACTIVE — modules completed)
--   BADGE_P03  Theme Explorer      (reserve — inactive)
--   BADGE_P05  Endurance           (ACTIVE — courses completed)
--   BADGE_S02  Persistence         (ACTIVE — 7-day streak)
--   BADGE_S04  30-Day Streak       (reserve — inactive)
--   BADGE_S05  Comeback            (reserve — inactive)
--   BADGE_V09  2000 Dharma         (reserve — inactive)
--   BADGE_V10  5000 Dharma         (reserve — inactive)
--   BADGE_D02  5 Lessons in a Day  (reserve — inactive)

DELETE FROM badges WHERE badge_id IN (
  'BADGE_P04',                                  -- Level Achiever
  'BADGE_V01','BADGE_V02','BADGE_V03',           -- lesson count milestones
  'BADGE_V04','BADGE_V05','BADGE_V06',           -- snippet milestones
  'BADGE_V07','BADGE_V08',                       -- low dharma milestones
  'BADGE_S01','BADGE_S03',                       -- 3-day and 14-day streak
  'BADGE_D01','BADGE_D03','BADGE_D04','BADGE_D05' -- daily milestones not in scope
);

-- ── 3. Set all remaining to inactive (clean slate) ───────────────────────────
UPDATE badges SET is_active = false;

-- ── 4. Name and activate the 3 live badges ───────────────────────────────────
UPDATE badges SET
  badge_name  = 'Curiosity',
  badge_icon  = '🗺️',
  description = 'Complete your first module — the mark of a true explorer',
  is_active   = true
WHERE badge_id = 'BADGE_P02';

UPDATE badges SET
  badge_name  = 'Persistence',
  badge_icon  = '🌙',
  description = 'Maintain a 7-day learning streak',
  is_active   = true
WHERE badge_id = 'BADGE_S02';

UPDATE badges SET
  badge_name  = 'Endurance',
  badge_icon  = '🏛️',
  description = 'Complete an entire course — a full yatra',
  is_active   = true
WHERE badge_id = 'BADGE_P05';

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT badge_id, badge_name, badge_icon, badge_category,
       criteria_type, criteria_value, is_active
FROM badges
ORDER BY sort_order;
