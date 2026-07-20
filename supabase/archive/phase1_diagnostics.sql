-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · PHASE 1 DIAGNOSTICS  (read-only — changes NOTHING)
-- Date: 19 July 2026
--
-- HOW TO RUN: paste each numbered query SEPARATELY into Supabase SQL Editor,
-- run it, and save the output (copy into a text file or screenshot).
-- Give the outputs to your next AI session — they complete roadmap items
-- 1.3 (RLS coverage), 1.4 (policy audit) and A6 (SECURITY DEFINER audit),
-- which cannot be finished from the repo alone because the live database
-- was built from many ad-hoc scripts.
-- ─────────────────────────────────────────────────────────────────────────────

-- §1  Tables in `public` with RLS COMPLETELY OFF (worst case: fully
--     readable/writable with the anon key). Any row returned = urgent.
SELECT c.relname AS table_without_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity
ORDER BY 1;

-- §2  Tables WITH RLS but ZERO policies (locked to everyone — features
--     touching these silently fail; distinguish from §1).
SELECT c.relname AS rls_on_but_no_policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  AND NOT EXISTS (SELECT 1 FROM pg_policies p
                  WHERE p.schemaname = 'public' AND p.tablename = c.relname)
ORDER BY 1;

-- §3  Every live policy, in full. Look for: qual/with_check containing
--     "auth.role() = 'authenticated'" (near-public due to anonymous sign-in),
--     and any INSERT/UPDATE policy on tables children write to.
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- §4  SECURITY DEFINER functions without a pinned search_path
--     (each is a potential RLS bypass — manual item A6).
SELECT p.proname AS function_name,
       CASE WHEN p.proconfig IS NULL THEN 'NO search_path pinned' ELSE array_to_string(p.proconfig, '; ') END AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
ORDER BY (p.proconfig IS NULL) DESC, p.proname;

-- §5  Verify the Phase 1 fixes landed (run AFTER phase1_security_fixes.sql):
--     expect admin-only policies on the three question tables, the
--     comments_insert_real_users policy, and 4 constraints.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('snippet_questions','standalone_questions',
                    'quiz_questions','snippet_comments')
ORDER BY tablename, policyname;

SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE conname IN ('lc_points_sane','lc_snippets_sane','qa_score_sane','ut_quantity_sane');
