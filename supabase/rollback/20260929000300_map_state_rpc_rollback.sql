-- ROLLBACK of 20260929000300_map_state_rpc.sql
DROP FUNCTION IF EXISTS public.get_map_state(uuid);
DROP INDEX IF EXISTS public.idx_lsm_lesson, public.idx_user_tokens_profile_type_source, public.idx_snippet_translations_snippet_lang;
