# IndiYatra · Session 32 Handoff

Picks up from Session 31 §1 (the queued "desktop view of Courses/For You"
task). Two threads this session: (1) a desktop-layout pass on All Courses
and For You, and (2) a follow-on "make it less text-heavy" conversation
that turned into three incremental image features — a module progress
ring with a photo in it, full image-editing for Courses/Themes/Modules/
Lessons in Admin, and a photo+badge treatment for each lesson row's
circle. All of it shipped this session; nothing was left mid-edit.

## Files touched this session

- `src/pages/AllCoursesPage.jsx` — 2-col desktop grid, `ModuleGauge` image
  wiring, lesson-row photo+badge circle.
- `src/pages/ForYouPage.jsx` — 2-col desktop grid for every rail panel.
- `src/components/ModuleGauge.jsx` — rewritten (arc → full ring + photo).
- `src/lib/courseTree.js` — `buildAllTree()` now carries module image URLs.
- `src/hooks/useCourseTree.js` — new `lessonImages` fetch/state.
- `src/pages/AdminPage.jsx` — cover-image field + upload widget for
  Courses/Themes/Modules/Lessons in the Content tab's CRUD forms.
- `src/lib/auth.js` — new `uploadContentImage()` helper.
- `supabase/module_cover_image.sql` — **new file**, schema + storage +
  RPC changes backing all of the above (see §4 — still needs to be run).

## 1. Desktop layout — sidebar + 2-column (All Courses & For You)

Asked clarifying questions per Session 31's instruction before touching
code: user wanted a **sidebar + 2-column format, for compactness**,
applied to **both All Courses and For You**. CSS-only changes — no JSX/
markup changes, no new props/state.

- **AllCoursesPage** — `.ac-feed-pane` (the module→lesson feed in the main
  pane) becomes a 2-column CSS grid at `min-width: 1024px`. Each
  `.unified-module-block` is a grid cell; `.ac-pane-label`/`.ac-empty` are
  forced to `grid-column: 1 / -1` so the section label and empty-state
  still span full width above the two columns.
- **ForYouPage** — `.fy-item-list` (used by every rail panel: Most Liked,
  Most Bookmarked, My Likes, My Bookmarks, Based on Interest, Latest)
  becomes a 2-column CSS grid at the same `1024px` breakpoint. `.fy-layout`
  widens from `max-width: 1000px` to `1200px` and `.fy-panel` padding goes
  `8px → 14px` to give the two columns room. The icon rail's existing
  desktop widening (`.fy-sb` → 232px, horizontal icon+label rows) was
  already there from an earlier session — untouched.
- Not done: no visual QA in an actual browser (no dev server spun up) —
  changes are CSS-only and structurally verified via `Read`, but worth an
  eyeball at a real desktop width. Only *item-list* panels went 2-column;
  `fy-resume`, the sign-in CTA, `fy-likes-row` (My Likes' carousel), and
  Surprise's panel are intentionally still full-width (not list content).

### Cascade-order gotcha (worth remembering if extending either page)

Both pages render `<style>{globalStyles + styles}</style>` — one page
concatenates its own CSS after the shared `globalStyles` string, so a
same-specificity selector defined later in the page's own `styles` string
always wins, **regardless of whether it's wrapped in a `@media` query**.
`@media` only gates *whether* a rule applies at a given width — it does
**not** give the rule extra priority over a later unconditional rule for
the same selector.

Caught this mid-session: an early draft put the ForYouPage desktop
`.fy-panel`/`.fy-item-list` overrides inside the *existing* `@media
(min-width: 1024px)` block (the one that widens `.fy-sb`), which sits
*before* the base `.fy-panel`/`.fy-item-list` rules later in the same
string — so the later unconditional base rules would have always won and
silently no-op'd the grid at every width. Fixed by moving the new overrides
into their own `@media` block placed at the very end of each page's
`styles` string, after every base rule they need to beat. **Both pages'
desktop `@media` blocks now live at the end of their `styles` string for
this reason — keep new desktop overrides there too, don't add them to the
earlier `@media (min-width: 1024px)` block that only touches `.fy-sb`.**

## 2. Images, part 1 — ModuleGauge becomes a photo ring

Follow-up ask in the same session: All Courses felt text/block-heavy, no
room for pictures. Discussed options; user chose to add real images to
courses/modules/themes/lessons rather than the CSS-only colored-icon
fallback, starting with **the module progress icon**.

- `ModuleGauge.jsx` — rewritten from the old 280° "speedometer" arc to a
  full 360° progress ring (12 o'clock start, clockwise, same
  gray/saffron/heritage/green color-by-pct logic) wrapping a circular
  `<img>` in the center. New `image`/`alt` props. No `image` (or the URL
  404s — tracked via an `imgError` state, reset on `image` change) falls
  back to the old plain percentage-text badge, so partial photo coverage
  never looks broken. `describeArc`/`GAUGE_START`/`GAUGE_END`/
  `polarToCartesian` in `lib/courseTree.js` are now unused by this
  component but were left in place (harmless, still exported).
- Data plumbing to get a real URL into that `image` prop: `modules` table
  needed a column that didn't exist. Added `get_course_tree()` RPC →
  `buildAllTree()` (`lib/courseTree.js`, module objects now carry
  `image_url`) → `AllCoursesPage.jsx` passes `image={mod.image_url}` into
  `<ModuleGauge>`. See `supabase/module_cover_image.sql`.

## 3. Images, part 2 — Admin > Content editing for all four types

Follow-up ask: enable editing all content *including images* for Courses,
Modules, Themes, and Lessons from Admin > Content (the generic CRUD
edit/add forms in `AdminPage.jsx`).

- `supabase/module_cover_image.sql` (same file as above, extended) now
  adds `cover_image_url text` to **courses, themes, modules, lessons**
  (not just modules), and creates a public `content-images` Storage
  bucket (mirrors `snippet_image_feature.sql`'s `snippet-images` bucket —
  public read, editorial-staff insert/update policies).
- `lib/auth.js` — new `uploadContentImage(blob, entityType, entityId)`,
  parallel to the existing `uploadSnippetImage`, uploads to
  `content-images/<entityType>/<entityId>/<timestamp>.jpg` and returns a
  public URL. `entityType` is the plural table name.
- `AdminPage.jsx` — `getColumns()` gained `"cover_image_url"` for Courses/
  Themes/Modules/Lessons (Snippets untouched — those already have their
  own asset-library-backed image flow via EditorPage, deliberately not
  touched here). `renderEditForm`/`renderAddForm` special-case that one
  column *before* the generic boolean/textarea/input branches: a 56px
  thumbnail preview + Upload/Replace/Remove control
  (`renderCoverImageField` helper), backed by `resizeCoverImage` (client-
  side resize to 400px-tall JPEG, same treatment as EditorPage's snippet
  image resize) + `handleCoverImageSelect(file, isAdd)`. New state:
  `editImgUploading`/`addImgUploading` (single boolean each — only one
  edit row or one add form can be open at a time in this UI, so no need
  for per-row tracking). No changes to `handleSaveEdit`/`handleAdd` were
  needed — both already persist whatever's in `editData`/`addData`
  generically, so once the field is uploaded into that state object it
  saves like any other column.
- Add-form gotcha: the storage path needs an entity ID, but on Add the
  user may not have typed the ID field yet. `handleCoverImageSelect` falls
  back to `"unsaved"` as the path segment in that case — the image still
  uploads and previews fine, it just files under a generic folder instead
  of the real ID. Added an inline tip telling the user to fill in the ID
  field first. Not a data-integrity issue (the final `cover_image_url`
  saved to the row is a normal public URL regardless of which folder it
  landed in), just a minor storage-tidiness nit if ignored.
- Not done: `getDisplayCols` (the list/table view) wasn't changed — image
  editing works, but list rows still show text columns only, no
  thumbnail. Small, low-risk follow-up if wanted. Themes'/lessons'/
  courses' `cover_image_url` are admin-editable now but nothing in the
  live app *reads* them yet — only the module photo (§2) is wired
  end-to-end today.

## 4. Images, part 3 — lesson-row circle becomes a photo+badge

Follow-up ask, from a screenshot of the module block: make the small
circle to the left of each lesson name in `AllCoursesPage` a little
bigger, inset a photo as its background, and show the done-tick/lesson-
number as a translucent overlay on top of that photo (not instead of it).
Told to use placeholder images for now, sourced from the lesson's own
snippet where possible.

- `hooks/useCourseTree.js` — `load()` now also fetches which snippets have
  an image (`snippet_core.asset_id is not null` → `asset_library.file_path`,
  same store as §3/SnippetPlayer) and, via `lesson_snippet_mapping`
  (now selecting `snippet_id` too, not just `lesson_id`), builds
  `lessonImages: { [lesson_id]: url }` — first imaged snippet found per
  lesson, wrapped in try/catch so a failure here can't break the rest of
  `load()`. New state, returned from the hook alongside `storyCounts`.
- `AllCoursesPage.jsx` — new `lessonThumb(lessonId)` helper: real entry
  from `lessonImages` if the lesson has one, else a **stable placeholder**
  from `https://picsum.photos/seed/<lesson_id>/96/96` (seeded by lesson_id
  so the same lesson always gets the same placeholder photo, not a
  different random one on every render/reload). Since essentially no
  snippets have real uploaded images yet, expect almost every lesson to
  show its picsum placeholder right now — that's expected, not a bug.
- `.ac-lesson-num` (the circle) — 22px → 36px, `position: relative;
  overflow: hidden`, holds a new absolutely-positioned `.ac-lesson-num-img`
  (`object-fit: cover`, fills the circle) plus `.ac-lesson-num-badge`
  (also absolutely positioned, full-circle translucent scrim + the
  tick/number in white on top — `rgba(0,0,0,0.38)` by default, brand-color
  at ~55% opacity — `${GREEN}8C` / `${SAFFRON}8C` hex-alpha — for `.done`/
  `.resume`). Photo and status badge are both visible simultaneously by
  design, per the ask ("transparent overlay", not a replacement).
- Not done: no onError fallback on the `<img>` (picsum is reliable enough
  that it wasn't worth the complexity here, unlike ModuleGauge's
  editorially-uploaded photos which do get one). If picsum is ever
  unreachable the circle just shows its plain background color with no
  photo — text/badge still renders fine either way.

## NEXT TASK — nothing queued; here's where the open threads are

No specific next task was requested — the user hasn't said what to do
next. Don't assume; ask. That said, here's the state of things so the
next session doesn't have to re-derive it:

1. **`supabase/module_cover_image.sql` has not been run against the live
   DB from here** (no DB access from this environment) — confirm with the
   user whether they've run it yet in the Supabase SQL editor. Until it's
   run, `cover_image_url` columns/the `content-images` bucket/the updated
   `get_course_tree()` don't exist live, so §2/§3's features will error or
   silently no-op against production.
2. Course, theme, and lesson cover images are now admin-editable (§3) but
   **not displayed anywhere** in the live app yet — only the module photo
   ring (§2) and the lesson-row thumbnail (§4, sourced from snippets, not
   from the new `lessons.cover_image_url` column) are wired end-to-end.
   If the user uploads course/theme/lesson covers expecting to see them
   somewhere, that display work hasn't been done.
3. §4's lesson thumbnails are still mostly picsum placeholders in
   practice, since real snippet images are rare so far. Worth asking the
   user whether they now want lesson thumbnails to read from the new
   `lessons.cover_image_url` column instead (or in addition, as a
   preferred override over the snippet-borrowed image) once that data
   starts getting populated via §3's admin editor.
4. Admin's list/table view (`getDisplayCols`) still shows no image
   thumbnail column — only the edit/add forms do (§3 "Not done").

## Carry-forward gotchas (still true, from Session 29/30/31)

- **Never use `sed -i` or bash in-place edits** on files under
  `C:\Users\srram\IndiYatra`. Use `Edit`/`Write` tools (host-side) only.
- **Bash reads of files in this mount are not reliable for verification**
  (phantom stale content). Always verify via the host `Read` tool.
- `HANDOFF.md` (the old master doc) is stale — ignore it. Per-session
  `SESSION_N_HANDOFF.md` files are the real continuity mechanism.

## Brand / paths (unchanged)

SAFFRON `#FF8E00` · HERITAGE `#00509E` · GREEN `#00924A` · PARCHMENT `#FAFAF7`
Windows: `C:\Users\srram\IndiYatra` · Bash: `/sessions/<id>/mnt/IndiYatra`
