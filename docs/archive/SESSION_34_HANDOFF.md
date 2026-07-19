# IndiYatra · Session 34 Handoff

Picks up from Session 33's ForYouPage work, but this entire session stayed on
the Course page (`src/pages/AllCoursesPage.jsx` + `src/hooks/useCourseTree.js`).
It started as four discrete fixes (layout, breadcrumbs, module card imagery,
sidebar colour) but most of the session was an iterative polish pass — the
user flagged the page as "too busy" partway through, and a lot of back-and-
forth (including two throwaway HTML colour mockups) went into figuring out
which colours should carry weight and which should get out of the way.
**Nothing was committed to git this session** — see the unresolved git item
near the end before touching git at all.

## Files touched this session

- `src/pages/AllCoursesPage.jsx` — the only page file touched; nearly every
  section changed at least once. See §1–§8 below.
- `src/hooks/useCourseTree.js` — new `goToCourse()` / `goToLevel()` helpers
  for clickable breadcrumbs.
- `src/components/ModuleGauge.jsx` — simplified: no longer accepts an
  `image`/`alt` prop, always renders as a plain ring with a transparent
  middle.
- `src/components/PageHeader.jsx` — bottom nav active-tab colour (shared by
  every page, since PageHeader is the one component behind all of them).
- Mockups created for sign-off, **not wired into the app**: `PillShades_
  Mockup.html`, `PillShades_Transparency_Mockup.html`, `LessonRow_
  ColorReduction_Mockup.html` — all in the repo root, safe to delete once no
  longer needed for reference.

## 1. Course page layout fixes (the session's opening ask)

- Removed the theme-title row above the module feed (deleted the
  `ac-pane-label` div) — modules now start flush with the sidebar top.
- Breadcrumb ("Course / Level / Theme") is now clickable. Course and level
  segments call the new `goToCourse()` / `goToLevel()` (in
  `useCourseTree.js`), which reopen that course/level in the sidebar and
  drop the main pane back to "pick a theme," mirroring first-open state.
  The current theme segment stays plain text (not clickable — it's already
  where you are).
- Module card background: the module's own cover photo (or a stable
  `picsum.photos/seed/module-<id>` placeholder if none), tiled across the
  full card height, under a white wash. Went through a couple of opacity
  passes (85% → 60%) — settled at 60% white (`moduleBgStyle()` in
  AllCoursesPage.jsx).
- Sidebar's active Level circle recoloured saffron → teal, to match the
  active-theme text colour (both now read as one "you are here" colour).

## 2. ModuleGauge simplified

- Dropped the `image`/`alt` props entirely (call site: `<ModuleGauge
  pct={pct} size={40} />`, no image passed) — it's just a progress ring now,
  transparent in the middle, since the module card itself carries the cover
  photo as of §1.
- The percentage label is always `#101828` (near-black) instead of
  progress-colour, so it stays legible against whatever's behind it.

## 3. Colour pass on Read/Quiz pills, ticks, bookmarks (long iteration)

Ended up close to where it started, after a few detours:

- Tried a light-wash pill style (brand colour at 15% opacity background,
  darker text) using exact Figma hex values the user eyedropped and
  supplied (`#D4B48326`, `#D9E5F1`). User judged it "too dull" — reverted
  Read/Quiz to solid saffron/heritage fill with white text (current state).
- Built two comparison mockups at the user's request, neither adopted:
  `PillShades_Mockup.html` (brand colour darkened toward black at
  15/25/40/50/60%) and `PillShades_Transparency_Mockup.html` (brand colour
  at 25/50/75% true CSS alpha over white — near-black text used throughout
  since white text fails contrast below ~75%). Pills stayed solid brand
  colour through all of this.
- The actual complaint turned out to be "too many colours competing," not
  the pills themselves. Fix: neutralize everything **except** Read/Quiz —
  the done-tick and the like/bookmark active states now use `#101828`
  instead of green/coral/saffron.
- Lesson-row status marker changed from a coloured circle badge to plain
  text: green `✓` (`GREEN` = `#00924A`) if done, plain black number
  otherwise — no circle, no background at all anymore.
- The old saffron "Continue" pill/tag (resume indicator) was replaced with
  a small saffron play-triangle icon button — same SVG glyph as
  PageHeader's `IcPlay` ("Resume Yatra"), placed right after the lesson
  title. Clicking it calls `onLessonSelect` directly (same as Read), not
  just a static label anymore.

## 4. Teal correction

Sidebar teal was `#4AADA8` / `#EAF6F5`. User eyedropped the live app in
Figma and supplied exact values `#48A9A6` / `#EDF6F6` (cross-checked via the
same "brand colour at N% opacity over white" math used in §3 — the numbers
matched cleanly). `TEAL` / `TEAL_BG` constants updated to match exactly.

Note: this teal is **not** one of the three official brand-book secondaries
(Mint Aqua `#B5FFE1` / Sunlit Yellow `#F8F991` / Vermilion Rose `#EB5160`,
per `SESSION_23_PROMPT.md`'s Brand Book Excerpt) — it's a pre-existing
in-app convention (see the `TEAL` constant's own comment: "reused from
HomePage's course cards"). Flagged this to the user; they chose to keep and
correct the teal rather than switch to a brand-book secondary. Treat as
settled unless raised again.

## 5. Margins / page gutter

Added `.ac-page-wrap` (`max-width: 1200px`, `padding: 0 1.25rem` → `0 1rem`
at ≤768px → `0 0.875rem` at ≤480px), wrapping the headline + body. This is
the **same** padding scale as the shared `.page-wrap` class in
`src/styles/global.js`, so Courses now lines up with every other page
instead of running its own numbers. `.ac-headline` and `.ac-body` had their
own `max-width` / `margin: 0 auto` stripped, since the new wrapper owns
that now.

## 6. Removed teal vertical accent line

`.ac-course-row.open` and `.ac-theme-row.active` no longer set
`border-left-color` — active state now shows via background tint + teal
text only. Also removed the `padding-left: 23px` compensation on
`.ac-theme-row.active` (was there to offset the 3px border) — active and
inactive theme rows now share the same 18px left padding.

## 7. Lesson row: title wrap + pill spill fix

Root cause: the sidebar's fixed 132px width eats a large share of a narrow
phone's viewport, leaving very little room for the lesson-actions row.
Fixes:
- `.ac-lesson-title` — was `-webkit-line-clamp: 2` (allowed 2-line wrap),
  now single-line `white-space: nowrap` + ellipsis.
- `.ac-lesson-actions` — `flex-wrap: wrap` → `nowrap`; `.bm-btn`/`.like-btn`
  padding `6px` → `4px`; `.ac-btn-read`/`.ac-btn-quiz` padding
  `6px 16px` → `6px 12px`.
- New `@media (max-width: 400px)` block: sidebar narrows further to 112px,
  pills drop to `5px 10px` padding / `0.6875rem` font, for the tightest
  phones.
- **Not verified in an actual browser at real phone widths** — sized by
  arithmetic (estimated button/icon widths vs. estimated available space),
  not measurement. Worth a real check (see Next Task).

## 8. Misc

- `.ac-feed-pane` scrollbar hidden (`scrollbar-width: none` +
  `::-webkit-scrollbar { display: none }`) — scrolling still works, just no
  visible track/thumb.
- Module pop-up's "Browse module" CTA (`EntityPreview.jsx`'s popup, opened
  via `openModulePreview` in AllCoursesPage.jsx) no longer jumps into the
  module's first lesson. `onPlay` is now a no-op (`() => {}`) — clicking it
  just closes the pop-up (`EntityPreviewPopup`'s `runPlay()` always calls
  `closePreview()` first) and returns you to the Course page as it was.
  The label still reads "Browse module" — wasn't asked to rename it, but it
  no longer really describes the action. Worth flagging to the user.
- Bottom nav (`PageHeader.jsx`, shared by every page): active tab no longer
  gets a saffron pill-fill background — icon + label just turn Heritage
  blue (`#00509E`). Caught a real bug while fixing this: the `Courses` and
  `For You` tabs render their icons as Tabler icon-font `<i className="ti
  ti-...">`, not `<svg>` — the first pass only styled `svg`, so those two
  tabs' icons stayed gray while their label text turned blue correctly.
  Selectors now cover both `svg` and `i`.

## NEXT TASK — nothing queued; open threads

1. **No visual QA in an actual browser this whole session.** Every change
   (colours, margins, the mobile pill-wrap fix, the scrollbar hide) was
   reasoned from CSS/JSX alone, verified only via re-reading the file or
   against user-supplied screenshots — never rendered by this session
   itself. Worth an actual `npm run dev` pass at phone/tablet/desktop
   widths, especially §7 (narrow-phone pill fit, sized by arithmetic) and
   §5 (margins matching other pages visually, not just numerically equal).
2. **Unresolved git repository state — see below. Needs a decision before
   the next `git commit`/`push`.**
3. "Browse module" pop-up CTA label (§8) no longer matches its behaviour
   (closes instead of navigating) — ask the user if it should say something
   else, or whether the CTA should just be removed now that it's not a
   navigation action.
4. Sidebar teal (§4) is confirmed correct as coded, but is off-brand-book
   by the letter of `SESSION_23_PROMPT.md` — purely FYI, the user already
   made the call to keep it.

## ⚠ Unresolved: git repository state (found at session start, not fixed)

At the start of this session, `git status` on `feature/quiz` showed **every
tracked file staged as deleted** (the index has ~no entries) while those
same files simultaneously show as **untracked** in the working tree — i.e.
the index is essentially empty relative to HEAD (`3dceec1`). This is not a
working-tree content problem — the files on disk are intact and current —
it's an index/staging problem. `.git/RESCUE_BACKUP_20260712/` (containing
`HEAD.corrupted` and `featu.stray-ref`, timestamped the morning of this
session) shows some kind of git repair already happened before this session
started, and most likely left the index in this state.

Also relevant: branch `backup-before-undo` exists, two commits ahead of
`feature/quiz`'s tip (`42945c4` "Save in-progress work", `17c5f21` "All
antigravity work is saved here") — unclear whether that work is superseded
by what's currently on disk, or should be reconciled/merged in.

**This session deliberately did not touch git** (no add/commit/push) to
avoid compounding the problem — all of this session's work exists only as
uncommitted edits to tracked files, plus the new untracked mockup `.html`
files listed above.

Recommended next step: before any commit, run `git status` and `git log
--all --oneline` fresh, check whether `backup-before-undo`'s two extra
commits contain anything not already reflected in the working tree, then
`git add -A` to resync the index with the current (correct) working tree
and commit from there. **Do not `git reset --hard` anything without
confirming first** — the working tree is the source of truth right now,
not any single branch ref.

## Carry-forward gotchas (still true)

- **Never use `sed -i` or bash in-place edits** on files under
  `C:\Users\srram\IndiYatra`. Use `Edit`/`Write` tools (host-side) only.
- **Bash reads of files in this mount are not reliable for verification**
  — reconfirmed at the start of this session: `wc -l`/`grep` via bash
  reported a stale, shorter version of `ForYouPage.jsx` (missing an entire
  session's worth of code) while the host `Read`/`Grep` tools showed the
  correct, current file. This also means git commands run via bash may be
  reading a stale mirror of `.git` — treat the git findings above as likely
  accurate but not 100% guaranteed for the same reason.
- `HANDOFF.md` (the old master doc) is stale — ignore it. Per-session
  `SESSION_N_HANDOFF.md` files are the real continuity mechanism.

## Brand / paths

SAFFRON `#FF8E00` · HERITAGE `#00509E` · GREEN `#00924A` · PARCHMENT `#FAFAF7`
Course-page teal (in-house, not brand-book): `#48A9A6` / bg `#EDF6F6` / border `#C2E4E2`
Brand-book secondaries (rarely used, ≤10% total): Mint Aqua `#B5FFE1` ·
Sunlit Yellow `#F8F991` · Vermilion Rose `#EB5160`
Windows: `C:\Users\srram\IndiYatra` · Bash: `/sessions/<id>/mnt/IndiYatra`
