-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Badge activation — run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Disable everything we're not using right now
UPDATE badges SET is_active = false WHERE badge_id IN (
  'BADGE_V01', 'BADGE_V02', 'BADGE_V03',   -- lesson count milestones (10/25/50)
  'BADGE_V04', 'BADGE_V05', 'BADGE_V06',   -- snippet milestones
  'BADGE_V07',                              -- 100 dharma (too low)
  'BADGE_V08',                              -- 500 dharma (too low — replaced below)
  'BADGE_D04', 'BADGE_D05'                 -- daily dharma (not in scope)
);

-- Step 2: Fix dharma thresholds to 1000 / 2000 / 5000
-- Repurpose BADGE_V08 (was 500) → 1000
UPDATE badges
SET badge_name     = '1000 Dharma',
    badge_icon     = '✦',
    criteria_value = 1000,
    description    = 'Earn 1000 Dharma Points',
    is_active      = true
WHERE badge_id = 'BADGE_V08';

-- BADGE_V09 is already 2000 — just confirm active
UPDATE badges SET is_active = true WHERE badge_id = 'BADGE_V09';

-- BADGE_V10 is already 5000 — just confirm active
UPDATE badges SET is_active = true WHERE badge_id = 'BADGE_V10';

-- ── Resulting active set (16 badges) ─────────────────────────────────────────
-- Progression  (5): P01 first lesson · P02 first module · P03 first theme
--                   P04 first level  · P05 first course
-- Streak       (4): S01 3-day · S02 7-day · S03 14-day · S04 30-day
-- Comeback     (1): S05 return after 7+ days away
-- Daily        (3): D01 3 lessons/day · D02 5 lessons/day · D03 10 lessons/day
-- Dharma       (3): V08 1000pts · V09 2000pts · V10 5000pts
-- ─────────────────────────────────────────────────────────────────────────────

-- Verify
SELECT badge_id, badge_name, badge_category, criteria_type, criteria_value, is_active
FROM badges
ORDER BY sort_order;
