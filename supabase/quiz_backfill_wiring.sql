-- ─────────────────────────────────────────────────────────────────────────────
-- Quiz wiring backfill
-- Run ONCE after quiz_wire_schema.sql to wire all already-imported questions.
-- Safe to re-run — both steps use INSERT ... WHERE NOT EXISTS guards.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Create a quiz_set for every lesson that has snippet questions
--            but no quiz_set yet ────────────────────────────────────────────

INSERT INTO quiz_sets (quiz_id, lesson_id, title, is_published, shuffle_questions)
SELECT
  gen_random_uuid()::text,
  l.lesson_id,
  COALESCE(l.lesson_name, 'Quiz') AS title,
  true,
  false
FROM lessons l
WHERE
  -- lesson has at least one snippet with a question
  EXISTS (
    SELECT 1
    FROM lesson_snippet_mapping lsm
    JOIN snippet_questions sq ON sq.snippet_id = lsm.snippet_id
    WHERE lsm.lesson_id = l.lesson_id
      AND sq.question_key IS NOT NULL
  )
  -- and no quiz_set exists yet
  AND NOT EXISTS (
    SELECT 1 FROM quiz_sets qs WHERE qs.lesson_id = l.lesson_id
  );

-- ── Step 2: Wire question_keys into quiz_questions ────────────────────────────
-- One row per (quiz_id, question_key) — language-agnostic.
-- DISTINCT prevents duplicates when a snippet has multiple language rows
-- for the same question_key.

INSERT INTO quiz_questions (quiz_id, question_type, question_key, sort_order, points)
SELECT DISTINCT ON (qs.quiz_id, sq.question_key)
  qs.quiz_id,
  'snippet'          AS question_type,
  sq.question_key,
  ROW_NUMBER() OVER (PARTITION BY qs.quiz_id ORDER BY sq.question_key) - 1 AS sort_order,
  1                  AS points
FROM quiz_sets qs
JOIN lesson_snippet_mapping lsm ON lsm.lesson_id = qs.lesson_id
JOIN snippet_questions sq       ON sq.snippet_id  = lsm.snippet_id
WHERE sq.question_key IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM quiz_questions qq
    WHERE qq.quiz_id      = qs.quiz_id
      AND qq.question_key = sq.question_key
  );
