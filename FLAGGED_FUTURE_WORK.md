# IndiYatra — Flagged Future Work: Consolidated Audit

**Date:** 19 July 2026 · **Purpose:** every "future / pending / next session" flag found across the legacy docs, with current status and where each lands in `OVERHAUL_ROADMAP.md`.
**Sources reviewed:** `HANDOFF.md` (§6, §7b, §11, §12) · `SESSION_24–34_HANDOFF.md` · `SESSION_23_PROMPT.md` · `progress.md` · `TASK_discover_page_fix.md` · `MAINTENANCE_MANUAL.md` (§15 checklist) · `FORYOU_TWO_VIEWS_PROPOSAL.md` (§7) · `Page_and_Block_List.md` · `QUIZ_FEATURE_DESIGN_updated.docx` (§5.2 Remaining Tasks table).
**Note:** Session 32 states that `HANDOFF.md` is stale and per-session handoffs are the real continuity record — items below were cross-checked against the newest mention.

---

## 1. URGENT — not future work, but unresolved damage

| Item | Source | Status |
|---|---|---|
| **Git repository index corruption.** At Session 34 start, every tracked file showed staged-as-deleted while present-and-untracked on disk; a prior repair left `.git/RESCUE_BACKUP_20260712/`. Branch `backup-before-undo` sits 2 commits ahead of `feature/quiz` — unreconciled. Needs a decision **before the next commit/push**. | S34 | ⚠ **Open, blocking.** Added to roadmap as Phase 0 pre-flight (0.4) |

## 2. SQL flagged "run against live DB" — state unknown

The docs flag several scripts as written-but-possibly-never-run. Current live state is unverifiable from the repo; reconcile all at once during the roadmap's migration-zero snapshot (C4 / new item 2.10):

- `supabase/module_cover_image.sql` (S32 — cover-image columns, `content-images` bucket, updated `get_course_tree()`; §2/§3 features silently no-op without it)
- `taxonomy_seed.sql` → later superseded by `taxonomy_seed_consolidated.sql` + `snippet_taxonomy_mapping.sql` (S23/S28 — Discover shows nothing without them)
- `ALTER TABLE user_tokens DROP CONSTRAINT user_tokens_token_type_check` (S23/progress.md — blocks custom token types; interacts with roadmap 2.4's server-side awarding)
- `drafts_with_subrole.sql` (S21 — sub_role column in editorial RPCs)
- General: `check_migrations.sql` exists as a read-only diagnostic — run it first.

## 3. Quiz feature — the "Remaining Tasks (Session 27+)" table

From `QUIZ_FEATURE_DESIGN_updated.docx` §5.2. Confirmed done in S27: attempt limits, question pools, pass/fail, Type-2 questions, CSV import, Dashboard quiz section. **Still marked Future:**

| Item | Disposition |
|---|---|
| Module / Theme / Level / Course quiz entry points (schema supports it; no UI) | Roadmap 5.9 |
| Standalone quiz browse/entry page | Roadmap 5.9 |
| Question hints (half-point penalty) | Roadmap 5.9 |
| Per-quiz leaderboard | Roadmap 5.9 — respect R1 (child privacy) + DI-§4 (leaderboard placement) rules |
| Resume incomplete quiz (localStorage) | Roadmap 5.9 |
| **EditorPage: MCQ authoring UI (Type 1)** | Folded into **ED-C / roadmap 4.8** — the workbench already edits quiz fields on snippet drafts; authoring completes it |
| **Standalone question authoring UI (Type 2)** | Same — ED-C / roadmap 4.8 |

Also: quiz Like/Comment buttons were **removed** pending wiring (S28) — decide during 4.8 whether quizzes get social actions at all.

## 4. UX / product threads left open in session handoffs

| Item | Source | Disposition |
|---|---|---|
| **Like vs bookmark asymmetry**: liking a snippet plays playlist-mode (no XP/completion); bookmarking plays lesson-mode (full XP). Explained to user, never resolved | S29 (and earlier) | Decide in Phase 3 alongside DI-§2.5 (save-semantics clarity) |
| **Cover images are editable but displayed almost nowhere**: course/theme/lesson covers upload via Admin, but only module ring + snippet-borrowed lesson thumbs render; Admin tables show no thumbnail column | S32 | Resolves naturally in roadmap 4.1 (imagery-forward cards) — make `cover_image_url` the primary thumb source, picsum/pattern-tile the fallback |
| Lesson thumbnails still mostly picsum in practice (content hasn't caught up) | S33 | Covered by DI-3 pattern tiles (roadmap 3.1) + content uploads |
| Curated tab-specific photos for the For You rail (currently arbitrary `asset_library` rows) | S33 | Fold into roadmap 4.1 |
| "Browse module" popup CTA label doesn't match behaviour (closes instead of navigating) | S34 | Micro-fix; batch into 3.6 component migration |
| Editor tab overlaps Profile avatar at ~1025–1200px when Admin+Editor both present | progress.md #11 | Batch into B5 responsiveness (roadmap 4.6) |
| Visual polish package: grey body text → near-black, 2-accent-per-block colour reduction, emoji → SVG | S21 list, progress.md | Superseded by E2 + DI-§1 (roadmap 2.1, 3.1) — do not do twice |
| Pre-launch: centralise UI copy + assets ("PL-1/PL-2") | S21/S23 | Partially done (`appStrings.js`, `assets.js` — note `config/assets.js` is dead per C1); finish during 2.1 |
| Two-Views open product questions: Relaxed-only on mobile? Surprise weighted vs random? Merge likes+bookmarks? | FY proposal §7 | Answer in Phase 0 alongside the other decisions — 4.1 needs them |
| Dashboard mobile: pills in one scrollable row; hero subtitle | S21 (HANDOFF §11) | Subtitle exists now; pill-wrap check goes into 4.6's 375px audit |

## 5. Process / environment flags (for `Vibe_coders_Instructions.md` awareness)

- **Never `sed -i`/bash-edit files on the Windows mount; bash reads can serve stale truncated content** — verify via host Read tool (S29–34, repeatedly). Already consistent with the instructions doc; noted here for continuity.
- **Locked files** (S23): SnippetPlayer, CoursePage, ModulesPage, LessonsPage were declared change-only-with-approval. The overhaul roadmap deliberately touches all four — treat the lock as superseded, but it explains their fragility; the R4 file-splitting reduces it.
- **No in-browser visual QA happened in S33–S34** — changes verified only by re-reading code. Reinforces the screenshot habit in `Vibe_coders_Instructions.md` §3.
- MAINTENANCE_MANUAL §15 pre-task checklist (9 boxes) remains good practice; fold its items into the standing-context block when relevant.

## 6. Phase-II architectural flags (HANDOFF §7b, §12) — parked backlog

Already-known big rocks, deliberately not scheduled in the current roadmap phases; revisit after Phase 5:

- **Module sharing across courses** (junction table `course_modules` or copy-on-create) — blocked on a real content need arising.
- **Text→UUID primary-key migration** (breaking, maintenance window) — bundle with a future schema epoch, never casually.
- **Content reuse for lessons/themes** (same junction pattern).
- **Twitter/X OAuth** (needs Supabase support ticket) — park until sharing strategy (DI-9) proves demand.
- Server-side badge/token trigger — **not parked**: this is roadmap 2.4 (A2), already scheduled.
- Deep-link URLs via React Router — **not parked**: this is roadmap 2.3 (B2), already scheduled.

## 7. Flagged items verified as already done (no action)

- `TASK_discover_page_fix.md` (waterfall fetch, race, error handling) — current `DiscoverPage.jsx` has no `rawMappings`, uses `Promise.all`, logs errors. Superseded; archive the file.
- S27 quiz tasks 1–4 + CSV import + Dashboard quiz section (confirmed in docx status column).
- S21 EditorView/VerifierView sub_role column.
- Taxonomy tagging of 931 snippets (S26's "next session" goal — `snippet_taxonomy_mapping.sql` exists; only the *live-DB run* remains, §2 above).
- Dashboard hero subtitle (exists in current code).

---

## Summary of roadmap changes made from this audit

**Added:** 0.4 (git repair, pre-flight) · 2.10 (live-DB SQL reconciliation) · 4.8 scope note (quiz authoring UIs) · 5.9 (quiz depth pack) · Phase 0 decision list extended with the For You product questions and like/bookmark semantics. **Everything else** either maps onto an existing roadmap item (shown above) or is parked in §6.
