-- fix_top_items_overload.sql
-- Fixes PGRST203 "Could not choose the best candidate function" errors on
-- get_top_liked_items / get_top_saved_items.
--
-- Root cause: an earlier pass created get_top_liked_items(p_limit integer)
-- and get_top_saved_items(p_limit integer) (single-param versions). A later
-- pass (the quota-logic rewrite in likes_and_pairing_schema.sql) added the
-- p_min_stories/p_min_lessons params — but since Postgres treats a different
-- parameter list as a DIFFERENT overload, `CREATE OR REPLACE` did not replace
-- the old single-param version, it just added a second one alongside it. Now
-- PostgREST sees two candidates for a call with just p_limit and can't pick.
--
-- Fix: explicitly drop the old single-param overloads. The 3-param versions
-- (with defaults, so `getTopLikedItems(10)` from auth.js still works
-- unchanged) are the ones that remain, matching likes_and_pairing_schema.sql.
--
-- Run once in the Supabase SQL editor.

DROP FUNCTION IF EXISTS get_top_liked_items(integer);
DROP FUNCTION IF EXISTS get_top_saved_items(integer);
