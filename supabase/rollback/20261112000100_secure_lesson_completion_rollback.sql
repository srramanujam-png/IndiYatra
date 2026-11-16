-- Rollback for 20261112000100_secure_lesson_completion.sql
-- Restores direct client writes to lesson_completions (re-opens audit finding H1).
-- The app keeps working either way: saveCompletion falls back to the upsert when complete_lesson is missing.
GRANT INSERT, UPDATE ON public.lesson_completions TO authenticated;
DROP POLICY IF EXISTS lesson_completions_own_insert ON public.lesson_completions;
CREATE POLICY lesson_completions_own_insert ON public.lesson_completions
  FOR INSERT WITH CHECK ((profile_id = auth.uid()));
DROP POLICY IF EXISTS lesson_completions_own_update ON public.lesson_completions;
CREATE POLICY lesson_completions_own_update ON public.lesson_completions
  FOR UPDATE USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));
DROP FUNCTION IF EXISTS public.complete_lesson(uuid);
