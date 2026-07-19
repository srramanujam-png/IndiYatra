# Phase 1 Security Work — Session Record & Your To-Do List

**Date:** 19 July 2026 · **Done by:** Claude (Fable) session · **Roadmap items:** 0.4, 1.1, 1.2 (stopgap), **1.3 ✓, 1.4 ✓**, 1.5, 1.6, 1.7, **A6 ✓**

> **UPDATE (same session, later):** the live-DB audit was COMPLETED interactively.
> Gopal ran the diagnostics and all fix scripts against the live database:
> - `phase1_security_fixes.sql` — ✓ run and verified (§5 confirmed constraints + policies)
> - `phase1_followup_fixes.sql` — ✓ run (policies for roles / user_roles_mapping;
>   lesson_editors deliberately left locked — unused table, revisit in roadmap 2.9)
> - `phase1_followup2_attempts.sql` — ✓ run (removed students' ability to
>   delete/edit their own quiz_attempts, which bypassed max_attempts)
> - `phase1_followup3_searchpath.sql` — run status: check diagnostics §4 shows no
>   "NO search_path pinned" rows
> - Diagnostics §1: ZERO tables without RLS (roadmap 1.3 answered: full coverage)
> - Diagnostics §3: full policy list reviewed — no remaining
>   `auth.role() = 'authenticated'` policies (1.4 done); personal-data tables are
>   own-rows-only; content tables public-read/admin-write; remaining known gap is
>   client-side awarding within caps, superseded by roadmap 2.4
> - Diagnostics §4: SECURITY DEFINER gating audited OK (admin_get_* check
>   is_admin(); get_user_likes/bookmarks filter by auth.uid()); residual minor
>   item: get_quiz_ranks accepts arbitrary profile_id (ranks only — tighten in 2.4)
> - Work was pushed to GitHub (feature/quiz) during the session ✓
>
> **Phase 1 remaining:** 1.5's profanity filter + report queue · 1.8 compliance memo.
>
> **UPDATE (19 Jul 2026, second session):** Both remaining items are now DONE in code:
> - **1.5 complete** (`0d41ae9`): `supabase/phase1_comment_moderation.sql` (blocked-words
>   table EN+Hinglish, `contains_profanity()` + trigger on snippet_comments,
>   `comment_reports` table + RLS) · `src/lib/profanity.js` (client mirror, unit-tested) ·
>   report button in SnippetPlayer (comment authors now shown first-name-only, per R1) ·
>   new **Comments** tab in AdminPage (open/resolved/dismissed report queue + recent-comments
>   view with delete). ⚠ **ACTION NEEDED: run `supabase/phase1_comment_moderation.sql` in the
>   Supabase SQL Editor** — until then the filter/reporting have no server-side effect and the
>   report button will error.
> - **1.8 complete:** see `COMPLIANCE_MEMO.md` (DPDP/COPPA analysis + action list; not legal advice).

This file tells you (Gopal) exactly what was changed, the **3 things only you can do**, and what to hand the next AI session.

---

## 1. What was changed in this session

**Git repair (roadmap 0.4).** Stale `.git/index.lock` deleted; all 109 pending files committed as `cd33920 "Checkpoint: sessions 27-34 + overhaul planning docs"` on `feature/quiz`. The `backup-before-undo` and `featu` branches were verified to contain nothing missing from HEAD and deleted. **Not yet pushed to GitHub — see your to-do #1.**

**`supabase/phase1_security_fixes.sql` (new).** One paste-ready script fixing: quiz questions editable by anyone (1.1) · missing sanity limits on points/tokens/quiz scores (1.2 stopgap) · anonymous guests able to post comments (1.5) · leaderboard showing children's full names, plus a new `leaderboard_visible` flag on profiles (1.6). **Has no effect until you run it — see your to-do #2.**

**`supabase/phase1_diagnostics.sql` (new).** Read-only queries that report the live database's actual security state (items 1.3/1.4/A6 can't be finished from the repo alone). See your to-do #3.

**`src/pages/SnippetPlayer.jsx` (edited).** Comment box now hidden for guest (anonymous) sessions with a "Sign in with an account to comment" prompt, matching the new server rule. Guard added in `postCommentHandler`. Syntax verified.

**Repo hygiene (1.7).** Question bank, Gemini CSVs, `results/`, `To Do*.docx` and test scratch files removed from git tracking and gitignored. Files are still on your disk — only git stops recording them. ⚠ They remain in *past* git history; fine while the repo is private. If you ever make it public: purge history first (any AI session can do this with `git filter-repo`) and rotate the Supabase anon key.

## 2. Your to-do list (only you can do these)

**#1 — Push to GitHub (5 min, do today).** Your work is committed locally but a disk failure still loses everything. Open the app you normally use for GitHub (e.g. GitHub Desktop) and push/sync the `feature/quiz` branch. If you don't have such an app, ask your next AI session to "set up a GitHub push from my IndiYatra folder" — it needs you to log in, which is why I couldn't do it.

**#2 — Run the security fix (5 min, do before sharing the app with anyone).** Supabase Dashboard → SQL Editor → New query → paste the whole of `supabase/phase1_security_fixes.sql` → Run. Safe to re-run; deletes nothing. Expected result: "Success. No rows returned".

**#3 — Run the diagnostics (10 min).** In the same SQL Editor, run each numbered query in `supabase/phase1_diagnostics.sql` separately and save each output (copy-paste into one text file, e.g. `diagnostics_output.txt` in the project folder). Query §5 also verifies to-do #2 worked.

## 3. What to tell your next AI session

Paste this: *"Read PHASE1_APPLIED.md and OVERHAUL_ROADMAP.md in my IndiYatra folder. I have run phase1_security_fixes.sql and saved the diagnostics output in diagnostics_output.txt. Finish roadmap items 1.3 and 1.4 using that output, then continue the roadmap in order."*

Remaining Phase 1 items after that: **1.8** (DPDP/COPPA compliance memo — consider real legal advice, since the audience is children) and the rest per `OVERHAUL_ROADMAP.md`. The full awarding rewrite (server-side scoring, roadmap 2.4) supersedes the stopgap constraints added today.

## 4. Notes for the next AI session (technical)

- Fix script is idempotent; constraints added `NOT VALID` (new rows only). Caps chosen: lesson points ≤ 1000, snippet_count ≤ 500, quiz max_score ≤ 1000, plant tokens quantity = 1, dharma ≤ 1000. Raise in the script if legitimate content exceeds them.
- `get_leaderboard` was replaced: first-name-only display, `leaderboard_visible` filter (default `true` = current behaviour; flipping default to `false`/opt-in awaits a Settings toggle — roadmap Phase 3, R1 recommends opt-in for minors), `SET search_path = public` added.
- `auth.role() = 'authenticated'` appeared only in `supabase/quiz_schema.sql` within the repo; live DB may have more — diagnostics §3 catches them.
- The old policy names (`*_auth_insert/update`) are dropped by the fix script; repo file `quiz_schema.sql` left as historical record.
- Comments profanity filter and report queue (rest of 1.5) not yet built.
