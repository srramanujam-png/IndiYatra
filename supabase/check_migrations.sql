-- ============================================================
-- check_migrations.sql
-- Paste this into the Supabase SQL Editor.
-- It reports which migrations have (✓) and haven't (✗) been run.
-- Read-only — nothing is changed.
-- ============================================================

SELECT 'TABLES' AS section, '' AS detail, '' AS status
UNION ALL

-- badges table
SELECT 'badges_schema.sql', 'badges table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='badges' AND table_schema='public')
       THEN '✓ exists' ELSE '✗ MISSING' END

UNION ALL

-- user_badges table
SELECT 'badges_schema.sql', 'user_badges table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_badges' AND table_schema='public')
       THEN '✓ exists' ELSE '✗ MISSING — run badges_schema.sql' END

UNION ALL

-- user_tokens table (tokens_and_badges_refine.sql)
SELECT 'tokens_and_badges_refine.sql', 'user_tokens table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_tokens' AND table_schema='public')
       THEN '✓ exists' ELSE '✗ MISSING — run tokens_and_badges_refine.sql' END

UNION ALL

-- bookmarks table
SELECT 'bookmarks_schema.sql', 'bookmarks table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='bookmarks' AND table_schema='public')
       THEN '✓ exists' ELSE '✗ MISSING — run bookmarks_schema.sql' END

UNION ALL

-- content_taxonomy_mapping (rename_taxonomy_table.sql)
SELECT 'rename_taxonomy_table.sql', 'content_taxonomy_mapping table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='content_taxonomy_mapping' AND table_schema='public')
       THEN '✓ exists' ELSE '✗ MISSING — run rename_taxonomy_table.sql' END

UNION ALL

-- taxonomy_term_translations (taxonomy_translations.sql)
SELECT 'taxonomy_translations.sql', 'taxonomy_term_translations table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='taxonomy_term_translations' AND table_schema='public')
       THEN '✓ exists' ELSE '✗ MISSING — run taxonomy_translations.sql' END

UNION ALL

SELECT '---COLUMNS---', '', ''
UNION ALL

-- profiles.share_message (settings_share_message.sql)
SELECT 'settings_share_message.sql', 'profiles.share_message column',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='share_message')
       THEN '✓ exists' ELSE '✗ MISSING — run settings_share_message.sql' END

UNION ALL

-- profiles.snippet_share_message (settings_snippet_share_message.sql)
SELECT 'settings_snippet_share_message.sql', 'profiles.snippet_share_message column',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='snippet_share_message')
       THEN '✓ exists' ELSE '✗ MISSING — run settings_snippet_share_message.sql' END

UNION ALL

SELECT '---CONSTRAINTS---', '', ''
UNION ALL

-- bookmarks allows 'snippet' (bookmarks_add_snippet.sql)
SELECT 'bookmarks_add_snippet.sql', 'bookmarks allows snippet content_type',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND check_clause LIKE '%snippet%'
      AND constraint_name LIKE '%bookmarks%'
  )
  THEN '✓ snippet allowed' ELSE '✗ MISSING — run bookmarks_add_snippet.sql' END

UNION ALL

-- bookmarks allows 'course' (bookmarks_add_course.sql)
SELECT 'bookmarks_add_course.sql', 'bookmarks allows course content_type',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND check_clause LIKE '%course%'
      AND constraint_name LIKE '%bookmarks%'
  )
  THEN '✓ course allowed' ELSE '✗ MISSING — run bookmarks_add_course.sql' END

UNION ALL

SELECT '---DATA---', '', ''
UNION ALL

-- badges seeded (badges_schema.sql)
SELECT 'badges_schema.sql', 'badges table row count',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='badges')
       THEN (SELECT CAST(COUNT(*) AS text) || ' rows' FROM badges)
       ELSE 'table missing' END

UNION ALL

-- active badges (tokens_and_badges_refine.sql)
SELECT 'tokens_and_badges_refine.sql', 'active badges count (expect 3)',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='badges')
       THEN (SELECT CAST(COUNT(*) AS text) || ' active (expect 3)' FROM badges WHERE is_active = true)
       ELSE 'table missing' END

UNION ALL

-- taxonomy seed rows (taxonomy_fix_constraint.sql)
SELECT 'taxonomy_fix_constraint.sql', 'content_taxonomy_mapping row count',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='content_taxonomy_mapping')
       THEN (SELECT CAST(COUNT(*) AS text) || ' rows (expect ≥ 17)' FROM content_taxonomy_mapping)
       ELSE 'table missing' END

ORDER BY 1, 2;
