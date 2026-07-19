# Vibe Coder's Instructions — Working the IndiYatra Overhaul with an AI Assistant

**Date:** 19 July 2026 · **Purpose:** one place for how to execute the overhaul safely with Sonnet 5 (or any coding assistant).
**The what/when lives in `OVERHAUL_ROADMAP.md`; the detail lives in the docs it cites. This file is the *how to run the sessions*.**

---

## 1. The golden rules

1. **One roadmap item = one conversation = one commit.** The failure mode of vibe-coded projects is not model capability — it's twelve half-finished changes tangled in one session. Finish, verify, commit, start fresh.
2. **Paste the directive, not the document.** Every item in the roadmap cites a source (A1, DI-4, ED-B…). Open that source doc, copy just the relevant block into the prompt. Small, scoped prompts get precise work.
3. **Never accept "this should now be secure."** Security claims get verified, every time (Section 3).
4. **Plan first for big items.** For anything marked M or L effort: ask for a written plan, read it, *then* ask for the implementation in a new session with the approved plan pasted in.
5. **`git checkout` is cheaper than arguing.** If a session goes sideways, revert and restart with a tighter prompt. Don't debug a confused session.
6. **Land the test harness early (roadmap 2.7).** It converts "I hope the assistant didn't break awarding" into a green checkmark. It is what makes the later, bigger delegations safe.

---

## 2. What to delegate freely vs. watch closely

### Delegate freely (assistant is strong here, spot-check only)
- Mechanical refactors with explicit specs: design-token mapping (E1–E2), dead-code sweep (C1–C3).
- Self-contained UI builds: completion modal v2, double-tap like, card rows, sprite swaps, editor ergonomics (ED-B).
- SQL where the fix is already written out (A1's policies are literal copy-adapt).
- Test writing, once you show it one example test in the codebase.

### Watch closely (your judgment is the control)
| Area | Risk | Your job |
|---|---|---|
| RLS / security (Phase 1–2) | Plausible-but-subtly-wrong policies, written confidently | Run the "Verify:" step from the manual after every fix — actually attempt the forbidden call, confirm the 403 |
| Routing refactor (B2) | Touches ~30 nav branches across 1,700-line files; threads get dropped in one big session | Do it page by page; commit per page; click through navigation after each |
| DB migrations | Irreversible in a way code isn't | Take the `supabase db dump` snapshot (C4) *first*; read every migration yourself before running it |
| Design taste (DI items, map, sprites) | Competent but generic output; "charming vs clip-arty" is not its call | Expect 2–3 visual iteration rounds — that's normal, not failure. You are the art director |
| Server-side grading / awarding design (A2) | Architecture decision, not just code | Plan-first workflow (rule 4), review the design before any code |

---

## 3. Verification habits (non-negotiable)

- **Security:** after each RLS/policy change, test as an anonymous session: attempt the write/read that should now be blocked; expect 403/empty. The manual's A-items each include a "Verify:" line — treat it as part of the task, not optional.
- **Awards/tokens:** after touching `awards.js` or its successor triggers — complete a lesson in a test account, confirm exactly one tulsi + correct dharma, re-complete, confirm no duplicates (the dedup guard). This becomes a unit test in 2.7.
- **Navigation (after B2):** Back button, refresh mid-lesson, and a deep link pasted into a fresh tab. All three must work.
- **Visual work:** screenshot before/after at 375px and 1280px. Check against `DESIGN_SYSTEM.MD` tokens — no new hex values (E4's lint gate automates this later).
- **Data migrations:** row counts before/after; leaderboard totals unchanged unless the change intended otherwise.

---

## 4. Prompt patterns that work for this repo

**Scoped implementation:**
> "Read `DESIGN_INPUT.md` §2 directive 2 and `src/pages/SnippetPlayer.jsx` lines 1635–1690 (completion modal). Implement directive 2 only. Use tokens from `src/index.css`, no new hex values. Do not modify awarding logic."

**Plan-first (for M/L items):**
> "Read `ENGINEERING_IMPROVEMENT_MANUAL.md` B2 and `src/App.jsx`. Propose a step-by-step migration plan to hash routing, split into commits of reviewable size. Plan only — no code yet."

**Verification as part of the task:**
> "…then tell me the exact curl/REST call I can run as an anonymous session to prove the policy blocks the write."

**Session hygiene:** start each session by naming the roadmap item ("We are doing roadmap 3.2, nothing else"); end each session by asking for a one-paragraph summary of what changed and what to verify — paste that into the commit message.

**Guard the big files:** for `ForYouPage.jsx` / `DashboardPage.jsx` / `SnippetPlayer.jsx` / `EditorPage.jsx` (1,700+ lines each), point the assistant at specific line ranges or component names rather than "edit this file." Splitting these files (R4, roadmap 5.5) will eventually remove this problem.

---

## 5. Phase-by-phase supervision level

| Phase | Mode | Notes |
|---|---|---|
| 1 — Safe | **Hands-on.** | Every item verified by you; compliance memo (1.8) is a human/legal task the assistant can only draft |
| 2 — Sound | **Plan-first for 2.3/2.4**, delegate the rest | Snapshot DB before 2.4; tests written alongside, not after |
| 3 — Feel-good | **Delegate, art-direct.** | Iterate visuals; keep each animation its own session |
| 4 — Product | **Plan-first for 4.1/4.3**, delegate components | Content review 4.7 is human work (R2); the assistant can prepare reports/checklists |
| 5 — Sticky | **Delegate.** | Foundation + tests now carry the risk |

---

## 6. When to stop and think (escalation triggers)

Stop delegating and reassess if: a security verify step fails twice on the same item · the assistant proposes schema changes you didn't ask for · a "small" change is touching more than ~5 files · you can't explain what the last commit did. Each of these means the prompt was too broad — shrink the scope and restart.

---

## 7. Standing context to paste into new sessions

Keep this block handy for the top of any working session:

> Project: IndiYatra — React 19 + Vite + Supabase LMS for short stories (Classes 3–12), gamified with dharma points and forest tokens. Design system: `DESIGN_SYSTEM.MD` (use CSS tokens, never raw hex). Current work plan: `OVERHAUL_ROADMAP.md` — we are on item ___. Source detail for this item: ___ . Rules: one item only; no schema changes unless the item says so; no new dependencies without asking; end with a summary + verification steps.
