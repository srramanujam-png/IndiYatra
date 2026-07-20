-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · PHASE 2.10 — LIVE-DB RECONCILIATION CHECKER
-- Date: 20 July 2026 · READ-ONLY (nothing is changed)
--
-- Supersedes check_migrations.sql (kept for history) — this covers the original
-- checks PLUS the FLAGGED_FUTURE_WORK §2 stragglers and every Phase 1/2 script.
--
-- HOW TO RUN: paste ENTIRE file into Supabase SQL Editor → Run.
-- Every row should read ✓. For any ✗, run the file named in column 1, then
-- re-run this checker. When all rows are ✓, take the migration-zero snapshot
-- (see supabase/migrations/README.md).
-- ─────────────────────────────────────────────────────────────────────────────

SELECT * FROM (

-- ═══ Flagged stragglers (FLAGGED_FUTURE_WORK §2) ═════════════════════════════

SELECT 10 AS ord, 'module_cover_image.sql' AS script, 'modules.cover_image_url column' AS detail,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='modules' AND column_name='cover_image_url')
       THEN '✓' ELSE '✗ RUN IT — cover-image features silently no-op' END AS status
UNION ALL
SELECT 11, 'module_cover_image.sql', 'content-images storage bucket',
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id='content-images')
       THEN '✓' ELSE '✗ RUN IT (bucket section)' END
UNION ALL
SELECT 12, 'taxonomy_seed_consolidated.sql', 'taxonomy_terms rows (expect > 0)',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='taxonomy_terms')
        AND (SELECT count(*) FROM taxonomy_terms) > 0
       THEN '✓ ' || (SELECT count(*)::text FROM taxonomy_terms) || ' terms'
       ELSE '✗ RUN IT — Discover shows nothing' END
UNION ALL
SELECT 13, 'snippet_taxonomy_mapping.sql', 'snippet taxonomy mappings (expect ~931 snippets tagged)',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='content_taxonomy_mapping')
        AND (SELECT count(*) FROM content_taxonomy_mapping WHERE content_type='snippet') > 0
       THEN '✓ ' || (SELECT count(*)::text FROM content_taxonomy_mapping WHERE content_type='snippet') || ' rows'
       ELSE '✗ RUN IT — snippet tagging missing' END
UNION ALL
SELECT 14, '(inline ALTER — see migrations/README)', 'user_tokens token_type CHECK dropped (custom token types)',
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage u ON u.constraint_name = cc.constraint_name
    WHERE u.table_name='user_tokens' AND cc.check_clause LIKE '%token_type%')
       THEN '✓ dropped' ELSE '✗ ALTER TABLE user_tokens DROP CONSTRAINT user_tokens_token_type_check' END
UNION ALL
SELECT 15, 'drafts_with_subrole.sql', 'get_my_drafts() returns sub_role',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines r
    JOIN information_schema.parameters p ON p.specific_name = r.specific_name
    WHERE r.routine_name='get_my_drafts' AND p.parameter_name='sub_role')
       THEN '✓' ELSE '✗ RUN IT — editor task lists missing sub_role' END

-- ═══ Phase 1 scripts ═════════════════════════════════════════════════════════

UNION ALL
SELECT 20, 'phase1_security_fixes.sql', 'quiz content admin-only (snippet_questions_admin_insert)',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='snippet_questions' AND policyname='snippet_questions_admin_insert')
       THEN '✓' ELSE '✗ RUN IT' END
UNION ALL
SELECT 21, 'phase1_security_fixes.sql', 'stopgap CHECKs (lc_points_sane)',
  CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lc_points_sane')
       THEN '✓' ELSE '✗ RUN IT' END
UNION ALL
SELECT 22, 'phase1_security_fixes.sql', 'profiles.leaderboard_visible column',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='leaderboard_visible')
       THEN '✓' ELSE '✗ RUN IT' END
UNION ALL
SELECT 23, 'phase1_comment_moderation.sql', 'profanity trigger on snippet_comments',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_comments_profanity')
       THEN '✓' ELSE '✗ RUN IT — profanity filter client-only' END
UNION ALL
SELECT 24, 'phase1_followup2_attempts.sql', 'legacy quiz_attempts ALL policy dropped',
  CASE WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quiz_attempts' AND policyname='Users manage own quiz attempts')
       THEN '✓' ELSE '✗ RUN IT' END
UNION ALL
SELECT 25, 'phase1_followup_fixes.sql', 'user_roles_mapping readable (urm_read_own_or_admin)',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_roles_mapping' AND policyname='urm_read_own_or_admin')
       THEN '✓' ELSE '✗ RUN IT' END

-- ═══ Phase 2 scripts ═════════════════════════════════════════════════════════

UNION ALL
SELECT 30, 'phase2_events.sql', 'events table (R3 analytics)',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='events' AND table_schema='public')
       THEN '✓' ELSE '✗ RUN IT — events silently drop' END
UNION ALL
SELECT 31, 'phase2_server_awarding.sql', 'awarding trigger on lesson_completions',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_award_on_lesson_completion')
       THEN '✓' ELSE '✗ RUN IT — no tokens/badges awarded at all' END
UNION ALL
SELECT 32, 'phase2_server_awarding.sql', 'submit_quiz_attempt() RPC',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='submit_quiz_attempt')
       THEN '✓' ELSE '✗ RUN IT — quiz attempts cannot save' END
UNION ALL
SELECT 33, 'phase2_server_awarding.sql', 'question tables locked (no public read)',
  CASE WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename IN ('snippet_questions','standalone_questions') AND policyname LIKE '%public_read')
       THEN '✓' ELSE '✗ RUN IT — quiz answers still shipped to clients' END
UNION ALL
SELECT 34, 'phase2_editorial_roles.sql', 'get_workspace_access() RPC',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_workspace_access')
       THEN '✓' ELSE '✗ RUN IT — Team tab + role consolidation inactive' END

-- ═══ Original check_migrations.sql items (still relevant) ════════════════════

UNION ALL
SELECT 40, 'badges_schema.sql', 'user_badges table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_badges')
       THEN '✓' ELSE '✗ RUN IT' END
UNION ALL
SELECT 41, 'tokens_and_badges_refine.sql', 'active badges count (expect 3)',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='badges')
       THEN (SELECT count(*)::text FROM badges WHERE is_active) || ' active (expect 3)'
       ELSE '✗ table missing' END
UNION ALL
SELECT 42, 'tokens_catalogue.sql', 'tokens catalogue seeded (expect 6)',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tokens')
       THEN (SELECT count(*)::text FROM tokens) || ' rows (expect 6)'
       ELSE '✗ RUN IT — trigger falls back to default token map' END
UNION ALL
SELECT 43, 'settings_share_message.sql + settings_snippet_share_message.sql', 'profiles share-message columns',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='share_message')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='snippet_share_message')
       THEN '✓' ELSE '✗ RUN THEM' END
UNION ALL
SELECT 44, 'bookmarks_add_snippet.sql + bookmarks_add_course.sql', 'bookmarks content_type covers snippet+course',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_schema='public'
                    AND check_clause LIKE '%snippet%' AND constraint_name LIKE '%bookmarks%')
        AND EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_schema='public'
                    AND check_clause LIKE '%course%' AND constraint_name LIKE '%bookmarks%')
       THEN '✓' ELSE '✗ RUN THEM' END

) checks
ORDER BY ord;
