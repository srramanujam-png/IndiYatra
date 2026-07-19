-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Backfill user_tokens for existing lesson_completions
-- Run once in Supabase SQL Editor.
-- Safe to re-run — NOT EXISTS guards prevent duplicates.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tulsi tokens — 1 per completed lesson ────────────────────────────────────
INSERT INTO user_tokens (profile_id, token_type, quantity, source_type, source_id, awarded_at)
SELECT
  lc.profile_id,
  'tulsi',
  1,
  'lesson',
  lc.lesson_id,
  lc.completed_at
FROM lesson_completions lc
WHERE NOT EXISTS (
  SELECT 1 FROM user_tokens ut
  WHERE ut.profile_id  = lc.profile_id
    AND ut.token_type  = 'tulsi'
    AND ut.source_id   = lc.lesson_id
);

-- ── Dharma tokens — points earned per completed lesson ───────────────────────
INSERT INTO user_tokens (profile_id, token_type, quantity, source_type, source_id, awarded_at)
SELECT
  lc.profile_id,
  'dharma',
  COALESCE(lc.points_earned, 0),
  'lesson',
  lc.lesson_id,
  lc.completed_at
FROM lesson_completions lc
WHERE COALESCE(lc.points_earned, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM user_tokens ut
    WHERE ut.profile_id  = lc.profile_id
      AND ut.token_type  = 'dharma'
      AND ut.source_id   = lc.lesson_id
  );

-- ── Verify ───────────────────────────────────────────────────────────────────
SELECT token_type, COUNT(*) AS rows, SUM(quantity) AS total
FROM user_tokens
GROUP BY token_type
ORDER BY token_type;
