# IndiYatra — Engineering Improvement Manual

**Date:** 18 July 2026 · **Scope:** security fixes, UI/UX improvements, dead-code removal, homepage redesign, design uniformity.
**Companion doc:** `MAINTENANCE_MANUAL.md` (architecture reference). This manual is the *work plan*; that one is the *map*.

Priorities: **P0** = fix before wider release · **P1** = next sprint · **P2** = when convenient.

---

## Part A — Security Fixes

The `.env` file is correctly gitignored and never appears in git history (verified). The Supabase anon key being in the browser is normal — **Row Level Security (RLS) is the only real security boundary in this app.** Every finding below follows from that.

### A1. (P0) Any signed-in user can edit quiz content

`supabase/quiz_schema.sql` lines 83–118 grant INSERT/UPDATE on `snippet_questions`, `standalone_questions`, and `quiz_questions` to anyone with `auth.role() = 'authenticated'`. Because `signInAnonymously()` is enabled (`src/lib/auth.js` line 31), **anyone can obtain an authenticated session with one API call and then vandalise or rewrite every quiz question** — no account or email needed.

**Fix:** replace the policy checks with the existing `is_admin()` / `is_supervisor_or_admin()` helpers, e.g.:

```sql
DROP POLICY "snippet_questions_auth_insert" ON snippet_questions;
CREATE POLICY "snippet_questions_admin_insert" ON snippet_questions
  FOR INSERT WITH CHECK (is_supervisor_or_admin());

DROP POLICY "snippet_questions_auth_update" ON snippet_questions;
CREATE POLICY "snippet_questions_admin_update" ON snippet_questions
  FOR UPDATE USING (is_supervisor_or_admin())
  WITH CHECK (is_supervisor_or_admin());
```

Repeat for all three tables. Note the original UPDATE policies also lack `WITH CHECK`, so an update could move a row into any state.

**Verify:** as an anonymous session, attempt `POST /rest/v1/snippet_questions` — expect 403.

### A2. (P0) Points, tokens, and badges are client-computed and client-trusted

Quiz scoring happens in the browser (`src/pages/QuizPlayer.jsx` ~line 767) and the result is inserted into `quiz_attempts`. Lesson points are written by `saveCompletion()` (`src/lib/auth.js`) with a client-supplied `points_earned`. Tokens and badges are awarded client-side (`src/lib/awards.js` — its own header says "Phase II: migrate to a Supabase DB trigger"). The RLS policies (`tokens_and_badges_refine.sql`, `badges_schema.sql`, `quiz_schema.sql`) only check `profile_id = auth.uid()` — they don't validate values.

**Consequence:** anyone can POST `{points_earned: 999999}` or insert arbitrary `user_tokens` rows and top the leaderboard (`leaderboard_rpc.sql` aggregates these tables directly).

**Fix (in order of effort):**
1. Add CHECK constraints as a stopgap: `points_earned BETWEEN 0 AND <max>`, `quantity = 1` per token insert, etc.
2. Move awarding to a DB trigger on `lesson_completions` INSERT (as `awards.js` already plans) and revoke direct INSERT on `user_tokens` / `user_badges` from clients.
3. Grade quizzes in a SECURITY DEFINER RPC: client sends chosen answers, server computes score and writes `quiz_attempts`.

**Verify:** direct REST insert of an inflated row is rejected; leaderboard totals unchanged after attempt.

### A3. (P1) Quiz answers are shipped to the browser before the user answers

`correct_option` and explanations are on publicly readable tables (`quiz_schema.sql` public-read policies; used at `QuizPlayer.jsx` line 506). Any student can open DevTools and read every answer.

**Fix:** move `correct_option`/`explanation` to a companion table without public read, and reveal via the grading RPC from A2 (return correct answer + explanation only after an answer is submitted). Acceptable to defer if quizzes are low-stakes, but combine with A2 anyway.

### A4. (P1) Audit every policy that says `auth.role() = 'authenticated'`

Anonymous sign-in makes "authenticated" nearly meaningless. Grep the `supabase/` folder:

```bash
grep -rn "auth.role() = 'authenticated'" supabase/
```

For each hit, decide: should this really include anonymous throwaway sessions? Pay special attention to `snippet_comments*` (comment spam from anonymous JWTs) and any INSERT policy. Where "real user" is intended, use `auth.jwt()->>'is_anonymous' = 'false'` or a role check.

### A5. (P1) Full RLS coverage check

Only 12 of 63 SQL files enable RLS, and the schema evolved across many ad-hoc scripts. Run in the Supabase SQL editor:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT tablename FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE c.relrowsecurity
);
```

Any public-schema table listed has **no RLS at all** and is fully readable/writable with the anon key. Fix each with `ALTER TABLE … ENABLE ROW LEVEL SECURITY` plus explicit policies.

### A6. (P1) Audit SECURITY DEFINER functions

There are ~20 SECURITY DEFINER functions. They bypass RLS entirely, so each must (a) gate permissions internally — `assign_content_role` does this correctly (`assign_content_role_rpc.sql` line 27) — and (b) pin the search path. Check every one:

```bash
grep -L "SET search_path" $(grep -rl "SECURITY DEFINER" supabase/*.sql)
```

Add `SET search_path = public` where missing, and confirm each function's first act is a permission check (`is_admin()` etc.) unless it is intentionally public.

### A7. (P2) Client-side admin gating is cosmetic — confirm it isn't the only gate

`App.jsx` line 172 sets `isAdmin` from the `is_admin` RPC and conditionally renders `AdminPage`. That's fine for UX, but anyone can call the same REST endpoints AdminPage calls. Once A1/A5/A6 are done this is covered; keep a note in code that the React check is **not** a security control.

### A8. (P2) Error swallowing in the REST helper

`src/lib/supabase.js` `supabase()` returns `[]` on any error, so RLS failures render as "no content" and security misconfigurations go unnoticed. Also note it always sends the **anon** key even when a user is logged in (parallel to the authed `supabaseClient` in `auth.js` — the "dual access pattern" in MAINTENANCE_MANUAL.md §3). Keep the pattern deliberate, but return/log errors distinctly so a 401/403 is visible in monitoring rather than silent.

### A9. (P2) Dependency hygiene

`xlsx@0.18.5` (SheetJS) npm builds have known prototype-pollution/ReDoS advisories and the npm package is no longer updated — switch to the official `cdn.sheetjs.com` distribution or a maintained alternative, and run `npm audit` in CI. Also confirm `xlsx` is only used in admin import tooling, not shipped to student-facing bundles (it currently rides in the main dependency list; AdminPage is lazy-loaded, so verify with `npx vite-bundle-visualizer`).

### A10. (P2) Repo content hygiene

The git repo tracks proprietary/course content and working files: `First Set of Quizzes - Tagged.xlsx`, `snippets_for_gemini.csv`, `gemini_batches/`, `results/`, four `To Do*.docx`. If the repo is ever shared or made public these leak the full question bank (including answers). Move content files out of the repo (see Part C) and rotate the Supabase anon key if the repo has ever been shared beyond the team.

---

## Part B — UI/UX Improvements

### B1. (P0) The design system exists but is not wired up

`src/index.css` defines the full token set (`--color-primary`, `--font-heading`, …) that matches `DESIGN_SYSTEM.MD` — and **zero components use them**: there are 0 occurrences of `var(--color-…)` in `src/` outside `index.css`, versus ~900 hardcoded hex values. This is the root cause of the inconsistency problems in Part E; fix it first and everything else gets easier.

### B2. (P1) No URL routing — the single biggest UX gap

Navigation is a `useState` page switch in `App.jsx` (~30 `case` branches). Consequences: browser Back/Forward don't work, no deep links ("send me the link to that lesson" is impossible), refresh loses your place, and no per-page analytics.

**Fix:** introduce `react-router-dom` (or minimal hash routing to start). Map existing cases to routes (`/course/:id`, `/lesson/:id`, `/quiz/:id`, `/for-you`, …), keep `App.jsx` state for cross-page data only. This is a mechanical but sizeable refactor — do it before further page work, since it touches every `onClick` navigation prop.

### B3. (P1) Error and empty states are indistinguishable

Because `supabase()` swallows errors (A8), a failed fetch renders the same as "no content". Add a shared `<ErrorState onRetry={…}/>` component and surface fetch failures; keep the existing `Skeletons.jsx` loaders (good) for the loading phase, and distinct empty-state copy ("No bookmarks yet") for genuinely empty data.

### B4. (P1) Accessibility pass

Current gaps to address app-wide: icon-only buttons without `aria-label` (bookmark/like buttons in card footers), `#9CA3AF` text on white fails WCAG AA for small text (25 uses — bump to `--color-text-body` #4A5565), no visible focus styles on custom buttons, and div-with-onClick cards (e.g. `hp-course-card`) that are not keyboard-reachable — make them `<button>`/`<a>` or add `tabIndex`+`onKeyDown`. Modals (`AuthModal`, `ProfileModal`) need focus trapping and Escape-to-close.

### B5. (P2) Responsiveness

`#root` is fixed at `width: 1440px; max-width: 100%` and media queries exist but use inconsistent breakpoints per page (each page defines its own `<style>` string). Standardize on two breakpoints (e.g. 768px, 1024px) as named constants and audit each page against a 375px viewport. `AdminPage`/`EditorPage` can stay desktop-only — say so with a friendly notice on small screens.

### B6. (P2) Copy bug on the guest hero

`HomePage.jsx` — the hero shown to **guests** (`isGuest && <section className="hp-hero">`) reads "Welcome back / Continue your Yatra". Guests haven't been here before. Change to a first-visit value proposition ("Begin your Yatra"), and show the "Welcome back" variant to returning signed-in users instead (see Part D).

---

## Part C — Dead Code and File Cleanup

All findings verified by import analysis (grep of every `from "…"` and dynamic `import(…)` across `src/`).

### C1. Unused source files — safe to delete

| File | Evidence |
|---|---|
| `src/components/CourseSidebar.jsx` (399 lines) | Imported by no file |
| `src/components/SettingsDrawer.jsx` | Imported by no file (PageHeader has its own drawer) |
| `src/components/Icons.jsx` | Imported by no file |
| `src/config/assets.js` | No `config/assets` import anywhere |
| `src/assets/hero.png`, `react.svg`, `vite.svg` | Referenced by no file (incl. `index.html`) |

Also delete the `.settings-overlay` / `.settings-drawer*` / `.lang-grid` / `.fs-option` CSS block in `src/styles/global.js` (lines ~46–96) — its only consumer is the dead `SettingsDrawer.jsx`. **Confirm first** that PageHeader's drawer doesn't reuse those class names (verified: it doesn't).

### C2. Unused exports in `src/lib/auth.js`

These 10 exported functions are referenced nowhere outside `auth.js`: `loadUserBookmarksRich`, `getTopLikedLessons`, `getTopSavedLessons`, `loadUserRole`, `adminUpsertTranslation`, `adminDeleteTranslation`, `addWorkflowEvent`, `grantEditorialRole`, `revokeEditorialRole`, `adminWireQuizzes`. Delete them (git history preserves them). `auth.js` is 2,188 lines — after deletion, consider splitting it into `auth.js`, `progress.js`, `content.js`, `editorial.js`.

### C3. Root-directory clutter tracked in git

Delete from the repo (git rm): `sync_test.txt`, `test_write.tmp`, `test_write_probe.txt`, `test_write_probe2.txt`, `~$ Do (updated) v2.docx`, `~$IZ_FEATURE_DESIGN.docx` (Word lock files), `screen1_foryou.png`, `screen2_courses.png`.

Move out of the repo (or into an untracked `docs/archive/`): the 10 mockup HTML files (`*_Mockup.html`, `Discover_Redesign_Options.html`), `To Do*.docx` (4 versions), `QUIZ_FEATURE_DESIGN*.docx`, `First Set of Quizzes - Tagged.xlsx`, `snippets_for_gemini.csv`, `gemini_batches/`, `results/`, `ays-quiz-cloner.zip`, `SESSION_23…34` handoffs, `SESSION_23_PROMPT.md`, `progress.md`, `TASK_discover_page_fix.md`, `Page_and_Block_List.md`. Keep: `README.md`, `DESIGN_SYSTEM.MD`, `HANDOFF.md`, `MAINTENANCE_MANUAL.md`, this file.

`check.mjs` (a syntax-check dev utility) → move to `scripts/` or delete; it also imports `@babel/parser`, which isn't in `package.json`.

### C4. `supabase/` folder: 63 ad-hoc scripts vs 2 real migrations

Only `supabase/migrations/` (2 files) follows migration convention; the other 61 files are one-off scripts, many of which are pure diagnostics or completed one-time fixes (`diagnose_null_completions.sql`, `cleanup_*.sql`, `verify_completions.sql`, `check_migrations.sql`, `fix_import_errors.sql`, `backfill_*.sql`, `editorial_roles_fix.sql`, …). Plan: (1) snapshot the current live schema with `supabase db dump` as migration zero; (2) move all 61 scripts into `supabase/archive/`; (3) all future changes go through timestamped files in `supabase/migrations/`. This also makes the A5 RLS audit tractable.

### C5. Keep it clean going forward

Add to CI / pre-commit: `npx knip` (dead files + exports), `eslint` with `no-unused-vars` as error, and a `.gitignore` extension for `~$*`, `*.tmp`, `test_write*`.

---

## Part D — Homepage Redesign Proposal

### Current state

`HomePage.jsx` (361 lines): guest hero with two CTAs + 3 benefit cards, then an "Explore Courses" card grid. Signed-in users see only the course grid (hero hidden). Issues: the guest hero says "Welcome back" (B6); signed-in users get no personalisation despite the data existing (`lesson_progress`, `useRecommendations`, dashboard stats); no discovery path to For You / Discover / Quizzes from the page body.

### Proposed structure (two variants, one page)

**Guest (logged out):**
1. **Hero** — value proposition headline ("Discover India's story, one snippet at a time"), subline naming the audience (Classes 3–12), primary CTA "Start exploring free" (→ Discover, no signup wall), secondary "Sign in". Right side: real content preview (a live snippet card or course collage), not abstract art.
2. **How it works** — 3 steps mirroring the actual hierarchy: pick a Course → learn in bite-size Snippets → earn tokens & badges. Reuses existing benefit-card styling.
3. **Featured courses** — current `hp-cards-grid`, capped at 6 + "View all courses".
4. **Social proof / stats strip** — lessons available, languages supported, quizzes; pull live counts (`refresh_course_counts` data) rather than hardcoding.
5. **Footer** (existing `AppFooter`).

**Signed-in:**
1. **"Continue your Yatra" strip** — resume card built from `lesson_progress` (deepest recent lesson + snippet index), plus dharma-points/token summary from the dashboard queries. This is where the "Welcome back" copy belongs.
2. **Recommendations rail** — `RecommendationsRail` already exists and is used on ForYou/Dashboard; reuse it here.
3. **Course grid** (current behaviour) with progress badges on started courses (`ModuleGauge` pattern).
4. **Quiz teaser** — one featured quiz (`featured_snippets`/quiz sets) to drive the tokens loop.

### Build notes

Implement sections as components in `src/components/home/`, styled exclusively with the Part E tokens — make this page the reference implementation of the design system. Reuse `EntityPreview` for course-card hover previews (already wired in HomePage). Estimated effort: 2–3 days once Part E tokens exist. The existing mockups (`ForYou_Redesign_Mockup.html`, `StandardEntityCards_Preview_Mockup.html`) contain card patterns worth lifting.

---

## Part E — Design Uniformity Plan (fonts, colours, text sizes, components)

### The problem, measured

- **~900 hardcoded hex values** in `src/`, 0 uses of the CSS variables defined in `index.css`.
- **Off-palette colours in heavy use:** `#6B6B6B` (79×), `#0A0A0A` (31×), `#1F1F1F` (27×), `#9CA3AF` (25×), `#BBBBB8` (17×), `#d1d5db` (15×), `#D85A30`, `#b86000`, `#E53935`, `#4AADA8` (TEAL, HomePage), plus lowercase/duplicate variants.
- **22+ distinct rem font sizes** plus px sizes (11–15px scattered) — vs the 5-role type scale in `DESIGN_SYSTEM.MD`.
- **Rogue font:** `'Alumni Sans'` used in `AppFooter.jsx:16`, `PageHeader.jsx:600,664`, `AdminPage.jsx:29,45` — it is **not in the Google Fonts import** in `styles/global.js`, so it silently falls back to sans-serif. Decide: add it to the import (if it's intentional brand flair) or replace with `var(--font-heading)`.
- **Two parallel styling systems:** `index.css` (tokens, unused) and `styles/global.js` (a JS template string injected per page — 17 importers — with its own hardcoded values and `${SAFFRON}`-style interpolation from `lib/supabase.js`).

### Step 1 — one source of truth (½ day)

Extend `src/index.css` into the complete token sheet:

```css
:root {
  /* existing colour + font tokens, plus: */
  --text-xs: 0.75rem;   /* meta, badges       */
  --text-sm: 0.875rem;  /* UI, buttons        */
  --text-base: 1rem;    /* body               */
  --text-lg: 1.25rem;   /* card titles (h3)   */
  --text-xl: 2rem;      /* section headings   */
  --text-hero: 3.125rem;
  --radius: 12px;  --radius-img: 10px;  --radius-pill: 999px;
  --space-1: 8px; --space-2: 12px; --space-3: 16px; --space-4: 24px;
  --shadow-btn: 0 1px 0.5px 0.05px rgba(29,41,61,0.02);
  --color-text-muted: #6B6B6B; /* legalise the de-facto muted grey, or map to #4A5565 */
  --color-danger: #c62828;
}
```

Move the static parts of `styles/global.js` into `index.css` (it's loaded once instead of being re-injected by every page) and delete the colour constants from `lib/supabase.js` once nothing imports them.

### Step 2 — colour mapping table (mechanical find/replace)

| Replace | With |
|---|---|
| `#00509E`, `HERITAGE` | `var(--color-primary)` |
| `#FF8E00`, `SAFFRON` | `var(--color-accent)` |
| `#00924A`, `GREEN` | `var(--color-secondary)` |
| `#101828`, `#0A0A0A`, `#1F1F1F` | `var(--color-text-main)` |
| `#4A5565`, `#6B7280` | `var(--color-text-body)` |
| `#6B6B6B`, `#9CA3AF`, `#BBBBB8` | `var(--color-text-muted)` — one grey, not three |
| `#E5E7EB`, `#d1d5db`, `#EBEBEA` | `var(--color-border)` |
| `#F3F4F6` | `var(--color-border-muted)` |
| `#c62828`, `#E53935`, `#D85A30`, `#b86000` | `var(--color-danger)` / `var(--color-accent)` — case-by-case |
| `#4AADA8` (TEAL) | drop, or promote to a named token if the ForYou identity needs it |

Font sizes: round every stray value to the nearest `--text-*` step (`0.78rem`, `0.8rem`, `0.8125rem` → `--text-xs` or `--text-sm`; all px values → rem tokens).

### Step 3 — shared components (1–2 days)

Create `src/components/ui/`: `Button.jsx` (variants: primary-saffron, primary-heritage, ghost, danger — replaces ~180 ad-hoc `<button>` stylings, heaviest in AdminPage 47×, SnippetPlayer 41×, QuizPlayer 29×), `Card.jsx` (border `var(--color-border)`, `var(--radius)`, `--space-4` padding per DESIGN_SYSTEM.MD), `Pill.jsx`, `SectionHeading.jsx`. Then migrate page by page: **PageHeader → HomePage (Part D) → ForYou → SnippetPlayer/QuizPlayer → Dashboard → remaining pages → AdminPage/EditorPage last** (internal tools, lowest polish priority).

### Step 4 — enforcement

Add a lint gate so drift can't return: ESLint `no-restricted-syntax` rule (or a 5-line CI grep) failing on `#[0-9A-Fa-f]{6}` literals in `src/` outside `index.css`, and on `fontFamily:` inline declarations. Add a "use tokens, not hex" line to `DESIGN_SYSTEM.MD` §6.

---

## Suggested execution order

| Sprint | Items |
|---|---|
| 1 (security) | A1, A2 stopgap constraints, A5, A4 |
| 2 (foundation) | C1–C3 cleanup, E step 1–2, A6, A2 triggers |
| 3 (UX) | B2 routing, E step 3, B3, B6 |
| 4 (polish) | Part D homepage, B4 accessibility, B5, A3, C4, E step 4, remaining P2s |

Every deletion in Part C is recoverable from git history; do them in a single reviewed PR titled "chore: dead code sweep" so the diff is easy to audit.
