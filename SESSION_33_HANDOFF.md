# IndiYatra · Session 33 Handoff

Picks up from Session 32's open threads on ForYouPage (For You). Confirmed
with the user that `supabase/module_cover_image.sql` (queued at the end of
Session 32) has been run against the live DB. Three threads this session,
all on ForYouPage: (1) real photos + play overlay on every item row across
every tab, (2) the sidebar rail turned into photo tiles at every breakpoint,
(3) a vertical type label plus a merged, true-recency "Latest" list. All of
it shipped; nothing was left mid-edit.

No dev server was spun up this session (same limitation as Session 32) — all
verification was via the `Read` tool re-reading the edited file, not a
browser. Worth an actual visual QA pass at some point, especially the
sidebar photo tiles at each breakpoint and the vertical type-label rendering
(`writing-mode: vertical-rl` + `rotate(180deg)` — a common trick, but hasn't
been eyeballed in this app).

## Files touched this session

- `src/pages/ForYouPage.jsx` — the only page file touched. Item-row photo
  thumbs + play overlay, sidebar photo tiles, vertical type label, merged
  Latest list. See sections below.
- `src/lib/supabase.js` — new `fetchContentThumbs()` helper (batched
  module/lesson/story image lookup, used by ForYouPage only so far).

No SQL changes this session — everything reads columns/tables that already
existed as of Session 32 (`modules.cover_image_url`, `lessons.cover_image_url`,
`snippet_core.asset_id` → `asset_library.file_path`). Nothing new to run in
the Supabase SQL editor.

## 1. Real photos + play overlay on every item row (all tabs)

Ask: wherever there's a play-button orange circle, show a picture background
with a transparent overlay and the play icon on top, across every ForYouPage
tab. Confirmed with the user that real per-item images should be used where
they already exist (stories/questions already have images; modules/lessons
have the `cover_image_url` provision from Session 32), falling back to a
placeholder only when no real image exists yet.

- All six item-list tabs (Based on Interest, Most Liked, Most Bookmarked,
  Latest, My Likes, My Bookmarks) render through the one shared `ItemRow`
  component, so this was a single change point.
- `ItemThumb` (new): renders the circle as `<img>` (real cover, or a stable
  `picsum.photos/seed/<type>-<id>` placeholder if none) + a dark translucent
  scrim + `PlaySVG` on top. Local `src` state resets on `thumbSrc` prop
  change and swaps to the placeholder `onError` (mirrors ModuleGauge's
  `imgError` pattern from Session 32 §2).
- `fetchContentThumbs({ moduleIds, lessonIds, storyIds })` (new, in
  `lib/supabase.js`) — batched lookup: modules/lessons via their own
  `cover_image_url`; stories via `snippet_core.asset_id` →
  `asset_library.file_path` (same store `useCourseTree.js`'s `lessonImages`
  reads). Every requested id gets an entry in the returned map (`null` if no
  image), so callers can tell "checked, no photo" from "not fetched yet".
- ForYouPage's main component collects ids across `likedItems`, `savedItems`,
  `myLikesItems`, `myBookmarkItems`, `latestItems` in one `useEffect`
  (`itemImages` state, `getThumb(type, id)` helper), skipping ids already
  resolved. `BasedOnInterestPanel` (a separate sub-component) fetches its own
  — its recommendations are always lessons, sourced from a different hook.

## 2. Sidebar rail → photo tiles at every breakpoint

Ask: mock up the sidebar tabs as images with text overlay, on-brand colours
(no green), then — after reviewing the mockup — ship it using placeholder
photos from `asset_library` for now, specific to each tab, replacing the
icon rail at every width (including mobile, so the phone view reads more
colourful/heritage-like, not just desktop).

- `.fy-sb-btn` rewritten: `position:relative; overflow:hidden`, holds an
  `<img className="fy-sb-photo">` (grayscale + contrast filter) behind a
  `.fy-sb-tint` (saffron→heritage gradient, `mix-blend-mode: multiply` —
  this is what keeps every placeholder photo on-brand and never green,
  regardless of the source photo's own colours) and a `.fy-sb-scrim`
  (bottom-up black gradient for legibility), with the existing emoji icon +
  label overlaid in white on top. Active tab drops the tint to a lighter
  saffron wash and gets a solid saffron inset ring instead.
- Applies uniformly at every rail width (108/124/140px mobile-through-tablet,
  232px desktop) — only tile height and font sizes scale up at the 1024px
  breakpoint, the photo-tile treatment itself doesn't change per width.
- `SIDEBAR_SECTIONS` (new, module-level array) — the 8 fixed tab keys in
  order. `sidebarThumbs` state (new) initializes to one seeded placeholder
  per key, then a mount-time effect fetches up to 8 rows from
  `asset_library` (`asset_type=eq.IMAGE`) and maps them 1:1 onto the 8 keys
  (repeating if fewer than 8 rows exist); if the table's empty or the query
  errors, the seeded placeholders from initial state just stay — no tab is
  ever left without an image.
- Not done: these are arbitrary `asset_library` rows, not curated per-tab
  photos — no guarantee "Most Liked" gets a thematically-fitting image.
  Swapping in real curated photos later is just a data change (update
  `asset_library`, or wire a dedicated per-tab column) — no code change
  needed on the ForYouPage side.

## 3. Vertical type label + merged "Latest" list

Two related asks: (a) make the Module/Lesson/Story text vertical
(bottom-to-top) to shrink each row's height, applied to Latest too; (b) on
Latest, stop showing "Latest modules" then "Latest lessons" as two separate
sections — interleave them in true recency order instead. A follow-up ask
moved the vertical label from between the thumb and title to the *left* of
the thumb.

- `ItemRow` layout is now, left to right: `.fy-item-type-label` (vertical,
  only when `showBadge`) → `.fy-item-thumb-col` (thumb + indicator, if not
  crowded) → `.fy-item-body` (title/sub) → optional `.fy-item-right`
  (crowded indicator). The type label used to be a horizontal pill stacked
  *under* the thumb inside the thumb column — moving it out is what shrinks
  row height, since it now stretches (`align-self: stretch`) to whatever
  height the title+sub already need instead of adding its own.
  `writing-mode: vertical-rl` + `transform: rotate(180deg)` gives the
  bottom-to-top reading direction. Existing `fy-badge-module/lesson/story`
  color classes (amber/green/blue) are reused unchanged — only the
  structural class changed (`fy-item-badge` → `fy-item-type-label`).
- The `crowded` calculation (`(showBadge && indicator) || rightIndicator`)
  was deliberately left as-is even though badge no longer lives in the thumb
  column — it still correctly captures "this row has both a type label and
  an interactive indicator, push the indicator to the right column",
  which matches the existing look on My Likes/My Bookmarks/Most
  Liked/Most Bookmarked's "All types" view (indicator already sits on the
  right edge there — see the screenshot the user shared this session).
- Latest: `latestModules`/`latestLessons` (two separate states) replaced by
  one `latestItems` state — `{type, id, name, sub, created_at, raw?}`.
  Fetch now selects `created_at` on both `modules` and `lessons` queries,
  builds both item lists, then `[...moduleItems, ...lessonItems].sort(...)`
  by `created_at` descending before setting state. Rendered as one
  `fy-item-list` with `showBadge` always on (so Module vs Lesson stays
  legible now that they're interleaved) and `rightIndicator` (unchanged from
  before — Latest always pushed its bookmark toggle to the right).
- The `itemImages`-collecting effect (§1) was updated to read from the new
  `latestItems` instead of the old two-list shape — check this if extending
  Latest further, since it's a `collect(items)` call now, not two separate
  `.forEach` blocks keyed by different id field names.

## NEXT TASK — nothing queued; here's where the open threads are

No specific next task was requested. That said:

1. **Visual QA in an actual browser hasn't happened** for anything this
   session — sidebar tiles at each breakpoint, the vertical type label
   (untested rendering), and the merged Latest list are all only verified
   structurally (via `Read`), not eyeballed. Worth spinning up `npm run dev`
   and checking all three at mobile/tablet/desktop widths.
2. Sidebar photo tiles are arbitrary `asset_library` rows — ask the user
   if/when they want curated, tab-specific photos instead (e.g. a themed
   image for "Most Liked" vs "Surprise").
3. Item-row photos (§1) depend on `cover_image_url` actually being populated
   on modules/lessons via Admin's editor (Session 32 §3) — until editors
   upload real covers, most module/lesson rows will still show picsum
   placeholders. Not a bug, just expected until content catches up.

## Carry-forward gotchas (still true, from Session 29–32)

- **Never use `sed -i` or bash in-place edits** on files under
  `C:\Users\srram\IndiYatra`. Use `Edit`/`Write` tools (host-side) only.
- **Bash reads of files in this mount are not reliable for verification**
  — confirmed again this session: `wc -l`/`eslint` via bash reported a
  stale, truncated version of `ForYouPage.jsx`/`supabase.js` (wrong line
  counts, mid-statement cutoffs) while the host `Read` tool showed the
  correct, complete file. Always verify via `Read`, never trust bash's view
  of a just-edited file.
- `HANDOFF.md` (the old master doc) is stale — ignore it. Per-session
  `SESSION_N_HANDOFF.md` files are the real continuity mechanism.
- Both ForYouPage's and AllCoursesPage's desktop `@media (min-width: 1024px)`
  overrides for `.fy-panel`/`.fy-item-list` (2-column grid) must stay at the
  very end of their `styles` string — see Session 32 §1's cascade-order
  note. This session's new `@media (min-width: 1024px)` block for
  `.fy-sb`/`.fy-sb-btn` touches different selectors, so it wasn't affected,
  but keep the rule in mind if adding more desktop overrides to either page.

## Brand / paths (unchanged)

SAFFRON `#FF8E00` · HERITAGE `#00509E` · GREEN `#00924A` · PARCHMENT `#FAFAF7`
(GREEN is intentionally excluded from the sidebar photo-tile tint — see §2)
Windows: `C:\Users\srram\IndiYatra` · Bash: `/sessions/<id>/mnt/IndiYatra`
