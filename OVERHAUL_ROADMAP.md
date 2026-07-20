# IndiYatra — Combined Overhaul Roadmap

**Date:** 19 July 2026 · **Supersedes the sequencing sections of both source docs.**
**Sources merged:** `ENGINEERING_IMPROVEMENT_MANUAL.md` (items cited as **A1–A10, B1–B6, C1–C5, D, E1–E4**) · `DESIGN_INPUT.md` (cited as **DI-1…DI-10** from its §7 table, plus section refs) · four additional review tracks introduced in this roadmap (cited as **R1–R4**) · `EDITORIAL_REVIEW.md` (editor role model + workbench, cited as **ED-A/B/C**).

The detailed *how* for every A/B/C/D/E item stays in the engineering manual; the *how* for every DI item stays in the design input. This file is only the *when and why in this order*. Work through phases top to bottom; within a phase, items are parallelisable unless a dependency is noted.

---

## The four added review tracks

- **R1 — Child safety, privacy & compliance.** Audience is Classes 3–12. Covers: DPDP Act (India) / COPPA-style obligations for children's data; comments as an unmoderated UGC channel reachable from anonymous sessions; leaderboard exposing display names; WhatsApp share flows for minors; a privacy policy and consent story. Highest-risk gap in the project — neither source doc touches it.
- **R2 — Content & editorial.** The product is the stories. Covers: reading-level fit per class band, tag taxonomy consistency (`tags_masterlist.md` vs actual tagging), translation coverage per language, quiz question quality, and an editorial style guide so new snippets stay consistent.
- **R3 — Analytics & retention instrumentation.** All three product objectives are engagement objectives; none is currently measurable. Covers: one events table + a tiny `track()` helper, event schema (view, like, bookmark, share, complete, quiz, streak), D1/D7 retention and likes-per-session baselines, per-route analytics (needs B2 routing).
- **R4 — Performance & testing.** Covers: bundle audit (`xlsx` in main deps — A9 overlap), per-page style re-injection, 1,700-line components, image loading; plus a minimal test harness — unit tests for `awards.js` logic, SQL tests for RLS policies, one smoke test per page route.

## The editorial workbench track (ED)

Documented in `EDITORIAL_REVIEW.md`. Three work packages: **ED-A** role-model consolidation (one source of truth for workspace access; a Team tab so granting editor roles no longer requires hand-written SQL; view switcher for multi-role staff) · **ED-B** editor ergonomics (titles-not-IDs in task lists, autosave + dirty guard, submit validation, queue flow) · **ED-C** workbench v2 (full-page editor route, three-pane source/target/live-preview translation layout, verifier diff view). Internal tooling, but it gates content production velocity — which every content-facing phase depends on — so it is *not* scheduled last.

---

## Decisions to make before any code (Phase 0)

Three conflicts between the source docs — decide once, in writing, in this file:

1. **Front door.** Manual Part D builds a personalised signed-in HomePage; DI-6 makes For You the logged-in home. **Recommendation: DI-6 wins.** For You *is* the signed-in home; Part D's signed-in sections (resume strip, recommendations rail, progress-badged course grid) are folded into For You's Compact view rather than built as a separate page. Part D's *guest* variant proceeds as specced.
2. **Teal `#4AADA8`.** E2 says drop-or-promote; DI-§1a says legalise. **Recommendation: legalise** as `--color-browse`, role-limited to course-browsing chrome.
3. **Dashboard.** DI-§5.5 splits it into My Yatra (rewards) + Stats (analytics). **Recommendation: accept.** This changes the target of manual items that say "Dashboard" — read them as "Stats page" after the split.
4. **Pre-flight: commit and push — DO THIS FIRST, before anything else in this roadmap.**
   *State verified 19 Jul 2026:* the Session-34 index corruption **is fixed** (zero staged-as-deleted files). But **no commit has been made since 9 July** (`3dceec1 "Save progress on quiz features"`) — 109 changed/new files, including all the planning docs, exist only in the working tree and are not on GitHub. Steps, in order:
   1. Delete `.git/index.lock` if present (leftover lock; will block the commit).
   2. `git add -A` · `git commit -m "Checkpoint: sessions 27–34 + overhaul planning docs"` · `git push origin feature/quiz`.
   3. `git diff backup-before-undo HEAD --stat` — if the branch's two extra commits (`42945c4`, `17c5f21`) contain nothing missing from HEAD, delete the branch; if they do, reconcile first.
   4. From here on: one commit per finished roadmap item, pushed every time (see `Vibe_coders_Instructions.md` rule 1).
   *Until this is done, ten days of work has no backup — a disk failure loses it all. Nothing else in this roadmap starts first.*
5. **Legacy product questions** (from `FLAGGED_FUTURE_WORK.md` §4): like-vs-bookmark playback asymmetry; the three For You Two-Views open questions (Relaxed-only on mobile · Surprise weighted vs random · merge likes+bookmarks). Answer them here — 3.x and 4.1 depend on them.

---

## Phase 1 — Make it safe (before any wider release) ✅ COMPLETE (19 Jul 2026)

*Nothing user-visible; everything here protects children, content, and the integrity of the gamification the whole overhaul is built on.*

| # | Item | Source | Why now |
|---|---|---|---|
| 1.1 | Quiz-content RLS fix (any signed-in user can edit questions) | A1 | Active vandalism vector via anonymous sign-in |
| 1.2 | Stopgap CHECK constraints on points/tokens/attempts | A2 | Leaderboard/forest are client-trusted until this lands |
| 1.3 | Full RLS coverage audit (tables with no RLS at all) | A5 | Unknown exposure surface |
| 1.4 | Audit every `auth.role() = 'authenticated'` policy | A4 | Anonymous sign-in makes these near-public |
| 1.5 | **Comments lockdown**: disable posting for anonymous sessions; add admin delete-and-report queue; profanity filter as stopgap | R1 | Unmoderated UGC reachable by children — do not ship wider without this |
| 1.6 | **Leaderboard privacy**: first-name-or-alias only, opt-in visibility | R1 | Children's names + activity data exposure |
| 1.7 | Repo content hygiene (question bank, content CSVs out of git) | A10 | Leaks full answer bank if repo is ever shared |
| 1.8 | **R1 compliance memo**: DPDP/COPPA applicability, consent flow, privacy policy draft | R1 | Determines what Phase 3+ features may collect; get external advice if unsure |

**Exit criteria:** anonymous REST session can neither write content, inflate points, post comments, nor read another user's data; compliance memo answered.

---

## Phase 2 — Make it sound (foundation everything else builds on) ✅ COMPLETE (20 Jul 2026, incl. live-DB run + migration-zero snapshot — see PHASE2_PROGRESS.md)

*Do this before restyling anything, or every later phase gets done twice.*

| # | Item | Source | Why now |
|---|---|---|---|
| 2.1 | Design tokens: one source of truth + colour/type mapping | E1, E2, B1 | Root cause of visual drift; prerequisite for all DI work |
| 2.2 | Dead code & file cleanup; supabase script archive | C1–C4 | Shrinks the surface every later change touches |
| 2.3 | URL routing | B2 | Prerequisite for deep links, analytics (R3), Two-Views, share links |
| 2.4 | Server-side awarding: DB trigger on completions; revoke client INSERT on tokens/badges; quiz grading RPC | A2 (full), A3 | The Yatra Map must be built on numbers that can't be faked |
| 2.5 | SECURITY DEFINER audit | A6 | Closes the bypass routes around 2.4 |
| 2.6 | **Events table + `track()` helper; wire core events** (view/like/bookmark/share/complete/quiz) | R3 | Baseline *before* the redesign, or you can never prove the redesign worked |
| 2.7 | **Test harness v1**: unit tests for `awards.js`, RLS policy tests, CI with `npm audit` + knip + eslint | R4, C5, A9 | Award logic is about to be rewritten (2.4) — test it as you go |
| 2.8 | Error states distinguished from empty states | A8, B3 | Silent 403s would otherwise mask Phase 1 regressions |
| 2.9 | Editorial role-model consolidation + Team tab | ED-A | Touches the same RLS/RPC surface as 2.4–2.5 — audit and consolidate roles in one pass; unblocks onboarding editors without SQL |
| 2.10 | Live-DB SQL reconciliation: run `check_migrations.sql`, apply the flagged-but-possibly-unrun scripts (cover images, taxonomy seeds, token-type constraint, sub_role RPCs), then take the migration-zero snapshot | FLAGGED §2, C4 | The dump (C4) is only trustworthy after the stragglers are applied; several shipped features silently no-op until then |

**Exit criteria:** routes exist; tokens/badges awarded only server-side; events flowing; CI green; an editor can be onboarded from the UI.

---

## Phase 3 — Make it feel good (small, high-emotion design wins)

*First user-visible phase. Deliberately small items with outsized emotional return, all dependent on 2.1's tokens.*

| # | Item | Source | Why now |
|---|---|---|---|
| 3.1 | Plant/dharma SVG sprite set + branded pattern tiles (replace picsum + UI emoji) | DI-3, DI-§1 | Every later feature (map, modal, cards) consumes these assets |
| 3.2 | Completion modal v2: sprout animation, ✦ not 🪙, "next on your Yatra" signpost | DI-1 | The emotional peak of every session; cheapest big win |
| 3.3 | Double-tap like + heart-burst | DI-2 | The core "fun" interaction of Objective A |
| 3.4 | Earn-previews on Course CTAs; locked levels name their blocker | DI-7 | Threads gamification into the existing course structure |
| 3.5 | Guest hero copy fix + Part D **guest** homepage | B6, D | Quick; makes the front door honest |
| 3.6 | Shared UI components (Button/Card/Pill) — migrate PageHeader + Home first | E3 | Locks the token system in as pages get touched |
| 3.7 | Editor ergonomics: titles-not-IDs, autosave + dirty guard, submit validation, queue flow | ED-B | Small items, big daily-pain relief; content team must be productive *before* Phase 4's content push |

**Exit criteria:** completing a lesson visibly grows something; liking feels like something; R3 dashboards show whether likes/session and completions/session move; editors stop losing drafts.

---

## Phase 4 — Make it a product (feed + map: the two big objective-level builds)

| # | Item | Source | Why now |
|---|---|---|---|
| 4.1 | Two-Views For You (Compact/Relaxed) + billboard Resume + card rows | DI-5, FORYOU proposal | Objective B's core; needs routing (2.3) and components (3.6) |
| 4.2 | Nav consolidation: For You = home · Courses · My Yatra · Search; Dashboard → split per Phase 0 decision 3 | DI-6, DI-§5.5 | Do together with 4.1 — same navigation surgery |
| 4.3 | Yatra Map phase 1 (static map from token counts) on My Yatra | DI-4, UX_REVIEW §6 | Objective C's core; safe now because awards are server-side (2.4) |
| 4.4 | Discover → Search (real search input, pattern-tile results, trending tags) | DI-§5.4 | Completes the nav model |
| 4.5 | Accessibility pass | B4 | Audit once on the *new* surfaces, not twice |
| 4.6 | Responsiveness: standard breakpoints, 375px audit | B5 | Same reasoning |
| 4.7 | **R2 content review, round 1**: reading-level per class band, tag audit, translation coverage report + editorial style guide | R2 | The new feed makes content quality highly visible; fix in parallel with 4.1–4.4 |
| 4.8 | Editor workbench v2: full-page `/editor/draft/:id`, three-pane source/target/preview layout, verifier diff view — **plus the two missing quiz-authoring UIs** (snippet MCQs + standalone questions, flagged Future since S27) | ED-C, FLAGGED §3 | Needs routing (2.3) and shared components (3.6); pairs with 4.7 — the style guide's rules become the workbench's validation hints, and translation throughput rises exactly when the content push needs it |

**Exit criteria:** one front door; a feed that sells with imagery; a map that fills with forest; content audited against the audience; translators see source, target, and student-view side by side.

---

## Phase 5 — Make it sticky (depth, delight, and durability)

| # | Item | Source | Why now |
|---|---|---|---|
| 5.1 | Flow mode (vertical snippet feed) | DI-8 | Objective B completed; reuses SnippetPlayer + recommendations |
| 5.2 | Yatra Map phases 2–3: ceremony animations, mini-map in completion modal, milestone toasts, streak chip in header | DI-10 | Objective C completed |
| 5.3 | Share-as-image (map/snippet card via canvas + Web Share API) | DI-9 | Needs the map (4.3) and sprites (3.1); mind R1 rules for minors |
| 5.4 | Micro-dharma for first daily like/bookmark/share | DI-§2.4 | Needs server-side awarding rules (2.4 extension) |
| 5.5 | **R4 performance pass**: bundle visualizer, split 1,700-line pages, style-injection → static CSS, image lazy-loading, Lighthouse budget in CI | R4 | After the big builds, before scale-up |
| 5.6 | Motion polish + optional sound, `prefers-reduced-motion` | DI-§6 | Last-mile feel |
| 5.7 | Lint gates: no raw hex, no inline fontFamily | E4 | Locks in Phase 2–4 gains |
| 5.8 | Wire remaining badge catalogue; "closest badges" wall | DI-§4.4 | Content-dependent; benefits from R2 round 1 |
| 5.9 | Quiz depth pack: module/theme/level/course quiz entry points, standalone-quiz browse page, resume-incomplete-quiz, hints, per-quiz leaderboard (child-privacy rules from R1 apply) | FLAGGED §3 | Schema already supports all of it; ship after quizzes join the Jyotirlinga loop (5.2) so new entry points land in a rewarding system |

---

## Ongoing cadence (no phase — calendar-driven)

- **R2 content review** each time a new course/module batch lands (checklist from 4.7's style guide).
- **R3 metrics review** monthly: D1/D7 retention, likes+bookmarks+shares per session, completion rate, streak distribution. Every roadmap item above should move at least one of these; kill or rework features that don't.
- **R4/A9 dependency audit** (`npm audit`, knip) in CI on every PR.
- **R1 re-check** whenever a new data-collecting or social feature ships (Flow mode, share-image, leaderboard changes).

---

## One-line rationale for the ordering

Safety before foundation (children are using it now), foundation before beauty (or you restyle twice), emotional peaks before big builds (small wins fund motivation and validate the metrics pipeline), feed-and-map as the centrepiece (the objectives themselves), depth last (it compounds only on top of all of the above) — and measurement wired in at Phase 2 so every later phase can prove it worked.
