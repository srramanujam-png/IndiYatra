-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · PHASE 1 FOLLOW-UP #2  (from diagnostics §3 output, 19 Jul 2026)
-- Finding: legacy policy "Users manage own quiz attempts" (ALL) lets students
-- UPDATE or DELETE their own quiz_attempts rows — i.e. delete a failed attempt
-- to dodge max_attempts, or edit a score after submission.
-- The app only SELECTs and INSERTs attempts; those are already covered by
-- quiz_attempts_own_select / quiz_attempts_own_insert. Dropping the ALL
-- policy removes update/delete without breaking anything.
--
-- HOW TO RUN: paste into Supabase SQL Editor → Run. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users manage own quiz attempts" ON quiz_attempts;

-- Note: the similar "Users manage own lesson completions" (ALL) policy is
-- KEPT — saveCompletion() uses upsert, which needs UPDATE. Server-side
-- awarding (roadmap 2.4) will tighten that properly.
