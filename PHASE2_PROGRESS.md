# Phase 2 progress — Session Record

**Date:** 20 July 2026 (third session) · **Done by:** Claude (Fable)
**Commits this session:** `93be0b0` (2.4) · `a84deea` (2.7) · `e29d9f6` (2.8) · `9f542e0` (2.9) · `8f9b2b3` (2.10 prep)

## Roadmap status

**Phase 2 — ALL CODE-SIDE ITEMS DONE** (2.1–2.4, 2.6–2.10; 2.5 was closed in the
Phase 1 live-DB audit). Remaining: your live-DB run below, then Phase 2's exit
criteria are fully met.

- **2.4 Server-side awarding + quiz grading** (`supabase/phase2_server_awarding.sql`):
  DB trigger on `lesson_completions` INSERT awards dharma/tulsi/ashoka/lotus/peepal/banyan
  (catalogue-driven via `tokens.earn_trigger`, deduped, same tier logic as the old
  `awards.js`) + BADGE_P02/P05/S02. Client INSERT revoked on `user_tokens`,
  `user_badges`, `quiz_attempts` (admin ALL policies added so the Admin token
  manager keeps working). **A3 done:** question tables are staff-read-only; players
  get questions answer-free via `get_quiz_questions_secure` (server-shuffled options),
  per-question feedback via `grade_quiz_answer`, attempts graded/scored/inserted
  server-side by `submit_quiz_attempt` (max_attempts enforced in-DB).
  `get_quiz_ranks` now ignores its parameter and uses `auth.uid()` (last 2.5 residual).
  1.2 stopgaps: `lesson_completions` ALL policy split into select/insert/update-own
  (DELETE gone); CHECK constraints retained as defense-in-depth — `points_earned`
  is still client-reported (capped 0–1000); full server-side points needs a
  lesson→points model, flagged for later. Client: `awards.js` is read-only loaders
  now; QuizPlayer asks the server on each answer (reveals after commit, same UX);
  staff edit panels fetch full rows on demand; pairing uses the answer-free
  `snippet_question_map` view.
- **2.7 Test harness v1:** vitest (`npm test`), 36 unit tests green (profanity
  mirror incl. leet/repeat-collapse evasions and Gandhi/"300 BC" false-positive
  guards; router round-trips). `supabase/tests/rls_policy_tests.sql` — read-only,
  rollback-wrapped structural + simulated-JWT behavioral checks (expect all PASS).
  GitHub Actions CI: eslint (scoped to the clean dirs: src/lib, src/hooks,
  src/config — pages/ legacy errors tracked for 3.6), tests, build, non-blocking
  `npm audit` (xlsx advisories known, removal is A9/5.5) + knip.
- **2.8 Error ≠ empty (A8/B3):** `lib/fetchStatus.js` error bus; the REST helper
  tags failed results (`rows.error`) and reports instead of silently returning `[]`;
  global dismissible banner in App (permission/offline/other wording — a 401/403
  banner = probable RLS regression); shared `ErrorState`/`EmptyState` components;
  AllCoursesPage adopted as the first surface (others migrate with 3.6).
- **2.9 Editorial roles (ED-A):** `supabase/phase2_editorial_roles.sql` —
  `get_workspace_access()` (one RPC: entry + default view + creator + admin;
  entry also derives from `content_role_assignments`), `admin_set_editorial_role()`
  and `get_team_members()` (permission-checked). Admin → **Team tab** (list staff,
  add by name, change/revoke roles — no more hand-written SQL). EditorPage view
  lock → **view switcher** (Supervise · Verify · My Tasks). App.jsx's three
  parallel role reads collapsed to one call; the drift-prone client-side table
  fallback is deleted. `lesson_editors` dropped (decision recorded in the script).
- **2.10 (prep):** `supabase/phase2_reconciliation_check.sql` — one read-only
  checker for everything (FLAGGED §2 stragglers + Phase 1/2 scripts), each ✗ row
  names the file to run. `supabase/migrations/README.md` — ordered run-list and
  the migration-zero snapshot procedure + from-then-on migration convention.

## Your to-dos (only you can do these)

1. **The live-DB session (~20 min)** — follow `supabase/migrations/README.md`
   step by step: run outstanding scripts (incl. `phase2_server_awarding.sql` and
   `phase2_editorial_roles.sql`) → checker until all ✓ → RLS tests until all PASS
   → take the migration-zero snapshot → commit it and archive the old scripts.
   ⚠️ `phase2_server_awarding.sql` and the new app build must go live together —
   an old client can't save quiz attempts after the script runs, and the new
   client can't save them before it runs.
2. **Push to GitHub** (feature/quiz) — 5 new commits are local-only. The new CI
   workflow will run on push; check the Actions tab.
3. **Smoke-test:** complete a lesson (tokens should appear on Dashboard — now
   awarded by the DB); play a quiz signed-in (answer feedback should still be
   instant; score saves; retake past max_attempts should fail); open a quiz page
   with devtools → Network and confirm no `correct_option` in any response before
   answering; Admin → Team: grant a test account "editor", open Editorial
   Workspace as them; as supervisor, try the new view switcher.
4. **Pending from last session:** lawyer review of the DPDP Rules (compliance
   memo action A).

## Next AI session — paste this

*"Read PHASE2_PROGRESS.md and OVERHAUL_ROADMAP.md in my IndiYatra folder. Phase 2
is complete (pending my live-DB run). Start Phase 3 in order: 3.1 plant/dharma
SVG sprite set + pattern tiles, 3.2 completion modal v2, 3.3 double-tap like +
heart-burst, 3.4 earn-previews on Course CTAs, 3.5 guest hero copy + Part D guest
homepage, 3.6 shared UI components (migrate PageHeader + Home first), 3.7 editor
ergonomics (ED-B)."*

Notes for that session: Phase 0 decision 5 (like-vs-bookmark asymmetry + For You
open questions) is still unanswered — ask Gopal before 3.3 if it affects like
semantics. 2.8's ErrorState/EmptyState components should be adopted page-by-page
during 3.6. CI's eslint scope should widen as pages are migrated in 3.6.
