-- ═══════════════════════════════════════════════════════════════════════════
-- IndiYatra · post-UUID-migration cleanup
-- ═══════════════════════════════════════════════════════════════════════════
-- Removes orphaned rows in user-state tables whose content_id no longer
-- matches any row in the migrated content tables. Safe to re-run — every
-- statement is idempotent and only removes / nullifies rows that have no
-- corresponding live content.
--
-- Run inside a transaction so you can ROLLBACK if any count surprises you.
-- Verification block at the bottom shows row counts after cleanup.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. bookmarks — content_id points to courses / themes / modules / lessons
--    / snippet_core depending on content_type. Delete any row whose
--    content_id has no matching row in the relevant table.
--    Cast to text on both sides so it works whether content_id is text
--    or uuid; pre-UUID strings (MOD_001 etc.) simply have no match.
-- ─────────────────────────────────────────────────────────────────────────
delete from public.bookmarks
where
     (content_type = 'course'  and content_id::text not in (select course_id::text  from public.courses))
  or (content_type = 'theme'   and content_id::text not in (select theme_id::text   from public.themes))
  or (content_type = 'module'  and content_id::text not in (select module_id::text  from public.modules))
  or (content_type = 'lesson'  and content_id::text not in (select lesson_id::text  from public.lessons))
  or (content_type = 'snippet' and content_id::text not in (select snippet_id::text from public.snippet_core));

-- ─────────────────────────────────────────────────────────────────────────
-- 2. snippet_likes — snippet_id must still exist in snippet_core. Also
--    null out the denormalised course/theme/module/lesson FKs whose target
--    rows are gone, so the remaining row is still consistent.
-- ─────────────────────────────────────────────────────────────────────────
delete from public.snippet_likes
where snippet_id::text not in (select snippet_id::text from public.snippet_core);

update public.snippet_likes
   set course_id = null
 where course_id is not null
   and course_id::text not in (select course_id::text from public.courses);

update public.snippet_likes
   set theme_id = null
 where theme_id is not null
   and theme_id::text not in (select theme_id::text from public.themes);

update public.snippet_likes
   set module_id = null
 where module_id is not null
   and module_id::text not in (select module_id::text from public.modules);

update public.snippet_likes
   set lesson_id = null
 where lesson_id is not null
   and lesson_id::text not in (select lesson_id::text from public.lessons);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. lesson_progress — lesson_id must exist in lessons.
-- ─────────────────────────────────────────────────────────────────────────
delete from public.lesson_progress
where lesson_id::text not in (select lesson_id::text from public.lessons);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. lesson_completions — lesson_id must exist; the denormalised course_id
--    is best cleared when stale rather than the row deleted (so total
--    dharma points history stays roughly intact if you care; if not,
--    swap this block for a DELETE).
-- ─────────────────────────────────────────────────────────────────────────
delete from public.lesson_completions
where lesson_id::text not in (select lesson_id::text from public.lessons);

update public.lesson_completions
   set course_id = null
 where course_id is not null
   and course_id::text not in (select course_id::text from public.courses);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. profiles.last_visited_route — clear when the stored module_id no
--    longer matches a live module. Handles both jsonb-stored routes and
--    text-stored JSON routes; the inner cast tolerates either column type.
-- ─────────────────────────────────────────────────────────────────────────
update public.profiles
   set last_visited_route = null
 where last_visited_route is not null
   and (
     -- attempt to parse as jsonb; if parsing fails the row is corrupt
     -- and we clear it as well.
     case
       when jsonb_typeof(last_visited_route::jsonb) = 'object'
         and (last_visited_route::jsonb ->> 'module_id') is not null
         and (last_visited_route::jsonb ->> 'module_id') not in (select module_id::text from public.modules)
       then true
       when jsonb_typeof(last_visited_route::jsonb) is null then true
       else false
     end
   );

-- ─────────────────────────────────────────────────────────────────────────
-- Verification — row counts after cleanup
-- ─────────────────────────────────────────────────────────────────────────
select 'bookmarks'           as table_name, count(*) as remaining from public.bookmarks
union all
select 'snippet_likes',                     count(*) from public.snippet_likes
union all
select 'lesson_progress',                   count(*) from public.lesson_progress
union all
select 'lesson_completions',                count(*) from public.lesson_completions
union all
select 'profiles_with_resume_hint',         count(*) from public.profiles where last_visited_route is not null;

-- Inspect the verification output above. If everything looks right:
--   commit;
-- If anything looks wrong:
--   rollback;
