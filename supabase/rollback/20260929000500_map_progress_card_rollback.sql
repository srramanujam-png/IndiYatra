-- Rollback for 20260929000500_map_progress_card.sql (the dashboard map keeps working; it just loses the progress card)
DROP FUNCTION IF EXISTS public.get_map_card(uuid);
DROP INDEX IF EXISTS public.idx_lesson_views_profile_seen;
DROP INDEX IF EXISTS public.idx_quiz_attempts_profile_started;
DROP INDEX IF EXISTS public.idx_lesson_completions_profile;
