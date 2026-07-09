# IndiYatra · Session 31 Handoff

Picks up from Session 30. Theme: finished the ForYouPage cross-panel
consistency work Session 30 queued — **Lessons, Quizzes, Stories/Snippets,
and Modules** now all behave uniformly across the four panels (Most Liked,
Most Bookmarked, My Likes, My Bookmarks), plus Based on Interest and Latest
picked up bookmark buttons. **One task is queued for next session** (see
§1) — it needs clarifying questions before any code, the same way Session
29/30 paused on ambiguous asks rather than guessing.

Files touched this session: `src/App.jsx` (extensively — `handleBookmarkNavigate`,
`handleOpenLessonById`, the `"player"`/`"all-courses"` render cases),
`src/pages/ForYouPage.jsx` (extensively), `src/pages/SnippetPlayer.jsx`,
`src/pages/AllCoursesPage.jsx`, `src/hooks/useCourseTree.js`.

Note: `HANDOFF.md` (the old master doc) is stale/superseded — it hasn't
been updated since well before Session 23 and still describes a "Edit/Write
tool truncation bug" workaround (Python patch scripts via bash heredoc) that
later sessions established was actually bash-mount staleness, not a real
tool bug (see §5 below). The per-session `SESSION_N_HANDOFF.md` files are
the actual continuity mechanism now — keep using this pattern, don't try to
reconcile it with `HANDOFF.md`.

---

## 1. NEXT TASK — Desktop view of Courses (All Courses) and For You

**Start by asking the user clarifying questions before writing any code.**
Nothing about *what* should change was specified — "Desktop view ... to be
changed" could mean any of:

- Responsive breakpoints/layout (e.g. the All Courses two-pane layout —
  132px sidebar + feed — was clearly designed mobile-first; desktop may
  need a wider sidebar, multi-column module feed, different proportions).
- Information density — desktop has more room; current mobile-derived
  layouts may look sparse or oversized on a big screen.
- A specific pain point the user has actually seen (ask for a screenshot
  or description of what looks wrong).
- Something else entirely (new desktop-only features, hover states, etc).

Ask which of these (or something else) is meant, and get concrete
before/after expectations — same practice as Session 29's desktop-redesign
flag and Session 30 §1's Lessons/Quizzes ambiguity. Don't start editing
`ForYouPage.jsx` or `AllCoursesPage.jsx` CSS until scope is confirmed.

## 2. What shipped this session

- **Lessons** — My Bookmarks' lesson clicks now route through `onOpenLesson`
  (same path as the other three panels) instead of `onNavigate`, which
  previously sent them to the Navigator page. All four panels now set
  `forYouInitialSection` via a `fromSection` argument threaded through
  `onOpenLesson(lessonId, fromSection)` → `handleOpenLessonById` in
  `App.jsx`, so the Lesson-complete screen's primary button reads **"Back
  to Likes" / "Back to Most Liked" / "Back to My Bookmarks" / "Back to Most
  Bookmarked"** (via a new `forYouTabBackLabel()` helper keyed off
  `forYouInitialSection`) and returns to the exact originating tab. Latest
  and Based on Interest got the same treatment (`"latest"` / `"interest"`
  tags), landing back on `"resume"` by default elsewhere.
- **Quizzes** — never get their own row in any panel (by design — mirrors
  of their paired Lesson, per `ITEM_TYPE_META`/SQL). Reached only via
  "🎯 Take the Quiz" on an opened lesson; that always steps back to the
  lesson first, so they inherit whichever panel's fix applies to that
  lesson — no separate wiring needed.
- **Stories/Snippets** — My Bookmarks and Most Bookmarked are now unified:
  both open the snippet's **parent lesson** at that snippet's position
  (`case "snippet"` in `handleBookmarkNavigate`, `App.jsx` ~line 552),
  instead of Most Bookmarked's old single-snippet playlist. That case now
  derives module/theme from the **freshly-fetched lesson** rather than the
  caller's item (Most Bookmarked's community rows don't carry
  `module_id`/`theme_id` the way My Bookmarks' rows do). Both report a
  `fromSection` ("mybookmarks" / "bookmarked") for the same
  tab-specific-label-and-return treatment as Lessons.
- **Rewards on snippet-opened lessons** — new `suppressLessonRewards` state
  (`App.jsx`), true only when the lesson session started from **Most
  Bookmarked's** snippet click (community-wide browsing — reaching a
  lesson's last snippet via someone else's bookmark shouldn't earn the
  viewer full-lesson credit they didn't read), false everywhere else
  (reset defensively at every other lesson-entry point: Resume, Navigator,
  Lessons page, All Courses, My Bookmarks, all ForYouPage lesson-opens).
  When true: `onComplete` is skipped entirely (no `saveCompletion`, no
  badge computation, no token award) and the points pill on the completion
  screen is hidden (`showRewards` prop, `SnippetPlayer.jsx`) — badges
  already self-suppress since `earnedBadges` never populates.
  **Lesson-row clicks in Most Bookmarked still award normally** — this is
  scoped narrowly to the snippet-entry path only, confirmed correct by the
  user. Known accepted edge case (user's own call, not a bug to fix): bookmark
  a snippet via Most Bookmarked, it now shows up in My Bookmarks too, and
  completing via My Bookmarks awards full points — left alone on purpose.
  Dedup already handled by `awardForLessonComplete` in `lib/awards.js`
  (checks `user_tokens`/`user_badges` before awarding) — no new guard
  needed, just made sure the reward path isn't bypassed.
- **Modules** — clicking a Module in any of the four panels now opens
  **All Courses** landed directly on that module (course/level/theme
  pre-selected, module scrolled into view + highlighted with an "Opened"
  tag, mirroring the existing lesson "Continue" treatment) instead of the
  old direct-to-Lessons-list behaviour. From there it's pure All Courses
  navigation — lesson/quiz clicks set `playerReturnPage`/`quizReturnPage`
  to `"all-courses"` (unchanged, pre-existing), back bottoms out at Home —
  **never returns to ForYouPage**, as requested. Implementation:
  - `useCourseTree(profile, seed)` (`src/hooks/useCourseTree.js`) — new
    optional `seed = {course_id, level_id, theme_id, module_id}` param
    that overrides the resume-route default on `load()`, plus a
    `resumeModuleId`/`registerModuleRef` scroll-to-module mechanism
    mirroring the existing `resumeLessonId` one.
  - `AllCoursesPage.jsx` accepts `courseTreeSeed` prop, passes it through,
    renders the highlight (`.module-target` CSS, `ac-continue-tag`).
  - `App.jsx`: new `allCoursesSeed` state; `case "module"` in
    `handleBookmarkNavigate` branches on `fromSection` — truthy (any
    ForYouPage panel) → fetch the module, build the seed, `goForward
    ("all-courses")`; falsy (BookmarksPage/DiscoverPage, unchanged) → old
    behaviour straight to the Lessons list.
  - The seed is one-time: cleared the moment a real lesson/quiz is picked
    from within All Courses (ordinary `saveLastVisited` resume-tracking
    takes over from there), and cleared on the top-nav "Courses" link too,
    so a stale module target can't silently override later manual
    browsing.
- **Bookmark buttons — Based on Interest & Latest**: both panels had no
  bookmark affordance at all. Added the same `bm-btn`/`BookmarkSVG` toggle
  used everywhere else (`bookmarks` Set + `onToggleBookmark`), positioned
  in the **right-side inline column** (`fy-item-right`) — matching how
  My Bookmarks/Most Bookmarked show it, not stacked under the thumb. This
  needed a small `ItemRow` change: a new `rightIndicator` boolean prop
  that forces `crowded` treatment (indicator → `fy-item-right`) regardless
  of `showBadge`, since these panels don't use the type-badge/`showBadge`
  mechanism the other panels rely on to trigger that layout. Based on
  Interest's "N matches" chip moved into the `sub` line so it doesn't
  compete with the bookmark button's slot.

## 3. The reusable pattern (still the core mechanism — read before extending any panel)

Same three-part pattern from Session 30 §4, now also covering Modules:

1. **`App.jsx` state per family**: `playerReturnPage`/`quizReturnPage` set
   to `"for-you"` only when returning to ForYouPage; `forYouInitialSection`
   set via an explicit `fromSection` argument threaded through
   `onOpenLesson`/`onNavigate` from whichever ForYouPage panel triggered
   the navigation. `forYouTabBackLabel(section)` maps that back to the
   right button label.
2. **`ForYouPage.jsx`**: every click handler passes its own panel tag
   (`"mylikes"` / `"liked"` / `"mybookmarks"` / `"bookmarked"` / `"latest"`
   / `"interest"`) as the last argument to `onOpenLesson`/`onNavigate`/
   `onPlaySnippet`.
3. For anything that leaves ForYouPage's own page-state model entirely
   (Modules → All Courses), the same idea extends to a **one-time seed**
   pattern instead of a return-page: pass enough context to land the
   *next* page directly on the right spot, then clear that seed the
   moment the user makes a real selection there — don't try to also wire
   a "return to ForYouPage" path, because the destination page has its
   own independent navigation model from that point on.

## 4. Carry-forward gotcha — Windows mount truncation (still true, reconfirmed)

Same as Session 29/30 — reconfirmed again this session via `npx eslint`
inside the bash sandbox reporting phantom "Unterminated string"/"Unexpected
token" parse errors on lines that `Read` confirmed were syntactically fine
in both `App.jsx` and `ForYouPage.jsx` (including lines I had just edited).
This is bash-mount staleness, not a real code problem.

- **Never use `sed -i` or any bash in-place edit** on files under
  `C:\Users\srram\IndiYatra`. Use the `Edit`/`Write` tools (host-side)
  exclusively — this session did, throughout, with no issues.
- **Bash reads of files in this mount are not reliable for verification.**
  Always verify via the host `Read` tool, never bash `cat`/`wc`/`tail`/
  `grep`/`eslint`/etc. If bash and `Read` disagree, trust `Read`.
- Ignore `HANDOFF.md`'s old "Python patch script via heredoc" workaround —
  that predates this finding and is unnecessary; direct `Edit`/`Write`
  tool calls work fine.

## 5. Brand / paths (unchanged)

SAFFRON `#FF8E00` · HERITAGE `#00509E` · GREEN `#00924A` · PARCHMENT `#FAFAF7`
Windows: `C:\Users\srram\IndiYatra` · Bash: `/sessions/<id>/mnt/IndiYatra`
