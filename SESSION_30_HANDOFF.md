# IndiYatra · Session 30 Handoff

Picks up from Session 29. Theme: ForYouPage click-through behavior for
**snippets** — My Likes, Most Liked, and Surprise Mix now launch full
playlists with batch-of-10 checkpoint modals and origin-aware "return to the
tab you came from" navigation. **Two tasks are queued for next session** (see
§1 and §2) — start there. Read §4 (the reusable pattern) before touching
either one; both are direct extensions of it.

Files touched this session: `src/App.jsx` (extensively), `src/pages/ForYouPage.jsx`,
`src/pages/GatewayPage.jsx`, `src/pages/SnippetPlayer.jsx`,
`src/config/appStrings.js`, `supabase/created_at_columns.sql` (new),
`supabase/fix_top_items_overload.sql` (new).

---

## 1. NEXT TASK — Lessons / Quizzes / Questions / Modules click behavior

**Start by asking the user clarifying questions** — it's genuinely ambiguous
where "clicking Quizzes/Questions" even applies (see below), the same way
Session 29 flagged the desktop-redesign task as needing clarification first.

Current state, verified this session by reading the actual code (not assumed):

- **Modules** — every panel routes module clicks through
  `onNavigate?.({content_type:"module", content_id:item.id})` →
  `handleBookmarkNavigate`'s `case "module"` (`App.jsx` ~line 495) → fetches
  the module + goes to the "lessons" list view. **No return-to-ForYouPage
  tracking exists at all** — there's no equivalent of `forYouInitialSection`
  being set here, so there's currently no way to get back to the originating
  ForYouPage tab after browsing from a module click.

- **Lessons** — there are TWO different code paths, and they disagree:
  - Most Liked / My Likes / Most Bookmarked panels call `onOpenLesson` (=
    `handleOpenLessonById`, `App.jsx` ~line 682) for lesson-type rows, which
    sets `playerReturnPage = "for-you"` — gets back to ForYouPage, but
    **does not set `forYouInitialSection`**, so it lands on whatever tab
    `forYouInitialSection` last happened to hold (may not be the tab the
    user actually clicked from).
  - **My Bookmarks routes ALL types (including lesson) through `onNavigate`**
    uniformly (`ForYouPage.jsx` ~line 1393, no type-conditional branching
    unlike the other three panels) → `handleBookmarkNavigate`'s
    `case "lesson"` (`App.jsx` ~line 521) → hardcodes
    `setPlayerReturnPage("navigator")`. That's not even ForYouPage — clicking
    a bookmarked lesson currently returns to the Navigator page, a real gap.

- **Quizzes / Questions** — ForYouPage's panels **never render quiz/question
  rows at all**. `ITEM_TYPE_META` (Session 28/29) deliberately shows only
  module/lesson/story — quiz and question are treated as mirrors of their
  paired lesson/snippet and hidden to avoid duplicate-looking rows. So it's
  unclear what surface the user means:
  - (a) The **standalone** BookmarksPage/LikesPage (not ForYouPage) do
    presumably surface quiz/question bookmarks — `handleBookmarkNavigate`'s
    `case "quiz"/"question"` (`App.jsx` ~line 587) hardcodes
    `setQuizReturnPage("bookmarks")`, i.e. the exact same "always returns to
    one fixed page regardless of true origin" bug just fixed for likes/
    surprise. This may be what needs the origin-aware treatment.
  - (b) The user may want quiz/question rows surfaced as first-class items
    inside ForYouPage's own panels — a bigger, more deliberate scope change
    reversing the existing hide-as-mirror design.
  - (c) Or it could mean the "🎯 Take the Quiz" button on a lesson's
    completion screen, reached after opening a lesson from ForYouPage.
  **Don't guess — ask which of these (or something else) is meant.**

## 2. NEXT TASK — Snippet bookmarks (Most Bookmarked / My Bookmarks)

Likely the more mechanical of the two — mostly a direct rerun of this
session's Likes work, aimed at Bookmarks instead:

- **Most Bookmarked** (`activeSection === "bookmarked"`, `ForYouPage.jsx`
  ~line 1195): story clicks still do `onPlaySnippet?.([item.id], 0)` —
  single-snippet only, exactly like Most Liked was *before* this session.
  Needs the same fix: filter `savedItems` to `type === "story"`, pass the
  full ordered id list + clicked index + a new source tag (e.g.
  `"mostbookmarked"`).

- **My Bookmarks** (`activeSection === "mybookmarks"`, `ForYouPage.jsx`
  ~line 1393): unlike My Likes, this panel sends **every** type (including
  story) through `onNavigate?.(item.raw)` uniformly — there's no
  type-conditional branch here at all. That lands snippet clicks in
  `handleBookmarkNavigate`'s `case "snippet"` (`App.jsx` ~line 545), which
  plays the snippet's **parent lesson** as a lesson-playlist starting at
  that snippet's position — a fundamentally different model than "all my
  bookmarked snippets as one descending playlist," which is presumably the
  target (to match My Likes). Also note: **there's no
  `allBookmarkedSnippetIds`-equivalent state yet** (the parallel to
  `allLikedSnippetIds`) — will need to either derive it inline from
  `myBookmarkItems` filtered to `type === "story"` (simplest, mirrors how
  Most Liked's story sublist was derived this session) or fetch it
  separately.
- Will need a new `playlistSource` value (e.g. `"bookmarks"`) plus its own
  return-page tracking and `forYouInitialSection` values (`"bookmarked"` /
  `"mybookmarks"`) — see §4 for the exact mechanism to replicate.
- **Naming refactor worth considering**: this session added
  `likesPlaylistReturnPage` + `surpriseReturnPage` as two parallel,
  source-specific state variables. Adding a third (bookmarks) family is a
  good moment to consider collapsing all three into one generalized
  `playlistReturnOrigin` (keyed by `playlistSource`) instead of one bespoke
  state variable per source — not mandatory, just flagged so the pattern
  doesn't sprawl into four/five near-identical state variables later.

## 3. What shipped this session

- **My Likes / Most Liked story clicks** now launch the full playlist
  (all liked snippets, or the story-type entries from the Most Liked
  ranking — both already ordered descending) starting at the clicked
  snippet, instead of a single-snippet play.
- **Surprise Mix** (both GatewayPage's card + hero-card "show another" swipe,
  and ForYouPage's Surprise tab) got its own distinct `playlistSource`
  (`"surprise"`, previously conflated with Gateway's Most Liked/Most Saved
  under a shared `"gateway"` source) plus the same batching treatment.
- **Batch-of-10 checkpoint modal**: `SnippetPlayer.jsx` pauses every 10
  snippets *viewed this session* (relative to wherever the playlist
  started, not absolute array position — see `LIKES_BATCH_SIZE` /
  `batchViewedCount` / `batchMode` in `goNext()`) with "Back to Likes/
  Surprise" + "Continue Reading {label}" (resumes forward, does not
  restart), repeating until the playlist actually runs out, at which point
  it falls back to the original "reviewed all N" screen (Back to X /
  Review Again — restarts from 0 / Go to Dashboard).
- **Origin-aware return navigation**: `App.jsx` now tracks
  `likesPlaylistReturnPage` ("likes" standalone page vs "for-you") and
  `surpriseReturnPage` ("home" vs "for-you"), plus `forYouInitialSection`
  (which ForYouPage rail tab to reopen on — seeded via a plain `initialSection`
  prop read once at mount, since `<div key={page}>` at the App.jsx root fully
  remounts pages on navigation, so no effect/sync is needed). Every entry
  point that navigates to `"for-you"` for a *different* reason (top-nav link,
  login redirect) explicitly resets `forYouInitialSection` to `"resume"`
  defensively.
- **Generalized the completion modal** away from a Discover-vs-everything-else
  boolean (`isDiscoverPlaylist`, now removed) to an explicit `playlistKind`
  prop (`"discover" | "likes" | "surprise" | "gateway"`) passed straight from
  `playlistSource`. This is what let Surprise get its own emoji (🎲)/title/
  back-label without touching Discover or Gateway's Most Liked/Most Saved
  cards, which still behave exactly as before.
- **`created_at` added to `modules` and `lessons`** (`quiz_sets` already had
  it) via `supabase/created_at_columns.sql`, run and confirmed live. Powers
  ForYouPage's "Latest" section (latest modules/lessons, lazy-loaded on first
  open of that tab, enriched with theme titles via the module→theme join).
- **Fixed a real bug surfaced by the browser console**: `get_top_liked_items`/
  `get_top_saved_items` had two conflicting overloads in the live database
  (an old single-`p_limit` version alongside the Session 29 quota-logic
  3-param version) causing `PGRST203` ambiguous-function errors — Most
  Liked/Most Bookmarked were silently broken. Fixed via
  `supabase/fix_top_items_overload.sql` (drops the stale overloads), run and
  verified live via direct RPC calls.

## 4. The reusable pattern (read before starting §1/§2)

Three pieces work together; replicate all three for any new "clickable list
→ full playlist, batched, origin-aware return" feature:

1. **`App.jsx` state per playlist family**: a `playlistSource` value (drives
   which `onBackToX` handler is wired to `backToPlaylist`), a
   `<family>ReturnPage` state ("standalone page" vs `"for-you"`), and
   `forYouInitialSection` set to the exact rail-tab id when the origin is
   ForYouPage. The click handler that launches the playlist takes an
   `origin` argument (e.g. `"for-you"` vs the standalone page/home) and sets
   all of this before `goForward("player")`.
2. **`ForYouPage.jsx`**: the clickable row's `onClick` builds the full ordered
   id list for its *own* type (filter the panel's already-ordered items down
   to `type === "story"`, or use a dedicated `allXSnippetIds` state), finds
   the clicked item's index, and calls `onPlaySnippet(ids, idx, sourceTag)`
   — `sourceTag` tells `App.jsx` which family/tab this came from.
3. **`SnippetPlayer.jsx`**: `playlistKind` (display/back-label switch) +
   `batchMode` (boolean, whether checkpoints fire) are the only two props
   that matter — everything else (emoji, title, button text) is derived from
   them. `LIKES_BATCH_SIZE = 10`; checkpoint fires in `goNext()` when
   `(current - initialSnippetIndex + 1) % 10 === 0`, i.e. counted relative to
   the session start, not the playlist's absolute position.

## 5. Carry-forward gotcha — Windows mount truncation (still true)

Reconfirmed again this session (via `npx eslint` inside the bash sandbox
returning phantom "Unexpected token" parse errors on files that `Read`
tool confirmed were syntactically fine — `GatewayPage.jsx` showed as
NUL-padded, `ForYouPage.jsx` capped at a stale byte count, both with mtimes
predating this session's edits). This is the same bash-mount-staleness bug
documented in Session 29 §4, not a real code problem.

- **Never use `sed -i` or any bash in-place edit** on files under
  `C:\Users\srram\IndiYatra`. Use the `Edit`/`Write` tools (host-side)
  exclusively.
- **Bash reads of files in this mount are not reliable for verification.**
  Always verify via the host `Read` tool, never bash `cat`/`wc`/`tail`/`grep`/
  `eslint`/etc. If bash and `Read` disagree, trust `Read`.
- Direct REST calls to the live Supabase project (via `curl` using the
  `.env` anon key) ARE reliable — that's real network I/O, not a cached file
  read, and was used successfully this session to confirm schema changes and
  RPC fixes live.

## 6. Brand / paths (unchanged)

SAFFRON `#FF8E00` · HERITAGE `#00509E` · GREEN `#00924A` · PARCHMENT `#FAFAF7`
Windows: `C:\Users\srram\IndiYatra` · Bash: `/sessions/<id>/mnt/IndiYatra`
