# Phase 1 completion + Phase 2 progress — Session Record

**Date:** 19 July 2026 (second session) · **Done by:** Claude (Fable)
**Commits this session:** `0d41ae9` (1.5) · `f3fa00b` (1.8) · `5f74450` (2.1) · `3dfbc92` (2.2) · `3c4984c` (2.3) · `be0c4a4` (2.6)

## Roadmap status

**Phase 1 — COMPLETE** (code-side). 1.3/1.4 verified closed from `diagnostics_output.txt` + the
first session's live-DB audit. 1.5 finished: profanity filter (EN + Hindi/Hinglish; client mirror
`src/lib/profanity.js`, unit-tested; DB trigger is the enforcement), comment report flag,
Admin → Comments moderation tab, first-name-only comment authors. 1.8: `COMPLIANCE_MEMO.md`
(DPDP/COPPA analysis, action plan, draft privacy policy — **not legal advice**).

**Phase 2 — 2.1, 2.2, 2.3, 2.6 done.**
- **2.1** Design tokens: full token sheet in `src/index.css` (type scale, radii, spacing,
  `--color-browse` teal legalised per Phase 0 decision 2, `--color-text-muted`, `--color-danger`);
  ~860 hex literals swept to `var(--color-*)`; `styles/global.js` fully tokenised;
  SVG presentation attributes converted to `style` where tokens flow into them.
  *Deliberate deviations:* `lib/supabase.js` keeps raw-hex SAFFRON/HERITAGE/GREEN as a documented
  JS mirror (alpha-suffix `${SAFFRON}22` concatenations need raw hex — migrate with 3.6);
  font-size rounding to `--text-*` steps deferred to 3.6 component migration (avoids an
  unreviewed app-wide visual change).
- **2.2** Cleanup: dead components/exports deleted (**note: `adminWireQuizzes` is NOT dead** —
  the manual's C2 list was wrong; it's called by `adminImportSnippetsFull`); root docs →
  `docs/archive/` + `docs/mockups/` (kept tracked — git is the only backup); one-off SQL →
  `supabase/archive/`; schema-record SQL stays top-level until 2.10's migration-zero snapshot.
- **2.3** Minimal hash routing (`src/lib/router.js` + App.jsx wiring): Back/Forward, deep links
  (`#/lesson/:id`, `#/quiz/:id`, `#/course/:id`), refresh restore via existing reconstruction
  helpers. Upgrade to react-router when 4.8 needs `/editor/draft/:id`.
- **2.6** Events: `supabase/phase2_events.sql` (append-only, own-insert, admin-read, retention
  note) + batched `src/lib/track.js`; wired view/like/unlike/bookmark/unbookmark/share/complete/
  quiz_complete. Pseudonymous, no third-party trackers (R1).

## Your to-dos (only you can do these)

1. **Run two SQL scripts** in Supabase SQL Editor (paste whole file → Run, both idempotent):
   `supabase/phase1_comment_moderation.sql` then `supabase/phase2_events.sql`.
   Until then: profanity filter/report button error server-side, and events silently drop.
2. **Push to GitHub** (feature/quiz) — 6 new commits are local-only.
3. **Smoke-test in the browser** (this session verified builds, not runtime): post a comment
   containing a blocked word (should be refused politely) · report someone's comment → check
   Admin → Comments · click Back/Forward across pages · refresh mid-lesson (should restore) ·
   copy a `#/lesson/…` URL into a new tab.
4. **Compliance memo action A:** book a real lawyer review of the final DPDP Rules
   (children's consent mechanics). The memo is written to be handed over as-is.

## Next AI session — paste this

*"Read PHASE2_PROGRESS.md and OVERHAUL_ROADMAP.md in my IndiYatra folder. Do roadmap item 2.4
(server-side awarding: DB trigger on completions, revoke client INSERT on tokens/badges, quiz
grading RPC — also move quiz correct answers server-side per A3, and tighten get_quiz_ranks).
Then continue Phase 2 in order: 2.7 test harness, 2.8 error states, 2.9 editorial roles, 2.10
live-DB reconciliation."*

Notes for that session: 2.5 (SECURITY DEFINER audit) was already completed in the Phase 1
live-DB audit — only `get_quiz_ranks` (accepts arbitrary profile_id) remains, folded into 2.4.
The 1.2 stopgap constraints stay until 2.4 lands, then loosen/replace them in the same script.
`awards.js` header documents the planned trigger design; `quiz_schema.sql` has the current
attempt-write path.
