# IndiYatra — Session Handoff Document
**Last updated:** July 6, 2026 (All Courses drawer — quick-commerce style category browser, item 3 from To Do.docx)
**Project:** IndiYatra — multilingual heritage learning platform
**Stack:** React + Vite + Supabase (no backend, REST only)
**Repo root:** `C:\Users\srram\IndiYatra`
**Project src:** `C:\Users\srram\IndiYatra\src\`

---

## 0. Auth — Current Status

### What works
- Email + password sign-in ✓
- Google OAuth sign-in ✓ (published, External/In Production in Google Cloud Console)
- Avatar chip in header — three states: signed-out, guest (grey "G"), signed-in (saffron initial) ✓
- Profile modal opens, saves display name, auto-closes ✓
- Sign Out works ✓
- Guest / anonymous mode: "Continue as Guest" ✓
- Sessions persist forever (localStorage, autoRefreshToken) ✓

### Auth providers
- ✅ Google OAuth — fully working
- ❌ Meta/Facebook — skipped: business entity verification required to publish
- ❌ Apple — skipped: no Apple Developer account
- ❌ Twitter/X — skipped: Supabase silently fails to register X credentials (dashboard shows Enabled, settings API returns false). Raise Supabase support ticket when ready to revisit.

### Auth modal buttons
- Continue with Google
- Email + password (sign in / sign up)
- Continue as Guest (anonymous)

### Root causes fixed (Session 2)
1. **onAuthStateChange async lock** — callback must be synchronous; `loadProfile` fire-and-forget.
2. **ProfileModal no auto-close** — `setTimeout(() => onClose(), 900)` after save.
3. **Snippet scroll jerk** — replaced `window.scrollTo({ behavior: "smooth" })` with `window.scrollTo(0, 0)` in SnippetPlayer.jsx (3 callsites).

---

## 1. Session Rules

1. **One thing at a time.** Visual changes only unless the user explicitly asks for logic.
2. **Read the relevant file(s) before proposing any edit.**
3. **Propose a concrete visual plan and wait for approval before writing code.**
4. **Always use the bash heredoc + Python pattern for ALL file edits.** The truncation bug affects `.js`, `.jsx`, and `.py` files written via the Write/Edit tools. Never use Edit/Write tool directly on source files.
5. **Always validate JSX with Babel after every patch.**

---

## 2. Design System

### Colours (from `src/lib/supabase.js`)
| Constant    | Hex       | Usage                        |
|-------------|-----------|------------------------------|
| SAFFRON     | `#FF8E00` | Primary / CTAs / accent      |
| HERITAGE    | `#00509E` | Secondary / headings / links |
| GREEN       | `#00924A` | Completion / success         |
| PARCHMENT   | `#FFFDF5` | Page background              |
| PURPLE      | `#7B2D8B` | Bookmarks (dashboard only)   |
| GOLD        | `#D4A017` | Badges / snippet bookmarks   |

### Typography
- **Headlines:** `'Alumni Sans', sans-serif` — font-weight 700/800
- **Body:** `'Source Sans 3', sans-serif`

### CSS Pattern
Every page injects its own styles via an inline `<style>` tag. `globalStyles` (from `src/styles/global.js`) contains shared rules: header, breadcrumb, page-hero, loading/empty states, keyframe animations.

### Key shared constants (`src/lib/supabase.js`)
- `LEVEL_LABELS`: LEVEL_001 Preparatory, LEVEL_003 Middle, LEVEL_005 Secondary
- `VISIBILITY_BADGE`: PUBLIC (Free/green), LOGGED_IN (Sign in/heritage), RESTRICTED (Premium/saffron)
- `DIFFICULTY_STARS`: array of 0–5 star strings

---

## 3. File Map

```
src/
├── App.jsx                  653 lines — router, page state, AuthContext.Provider, lessonProgress Map,
│                                        bookmarks Set, handleToggleBookmark, handleBookmarkNavigate,
│                                        handleSnippetAdvance, toast
├── contexts/
│   └── AuthContext.jsx       5 lines  — AuthContext + useAuthContext() hook
├── lib/
│   ├── supabase.js           39 lines — raw fetch helper (anon key only) + shared constants
│   ├── auth.js             1332 lines — Supabase SDK client + auth helpers + progress persistence
│   │                                    + loadUserLikes/insertLike/deleteLike
│   │                                    + loadUserBookmarks/insertBookmark/deleteBookmark
│   │                                    + loadUserBookmarksRich (RPC wrapper)
│   └── awards.js            ~203 lines — awardForLessonComplete() · loadForestTokens() · loadEarnedBadges()
│                                             TOKEN_TYPE map replaced with DB-driven _getTriggerMap()
├── styles/
│   └── global.js             — globalStyles string (shared CSS)
├── hooks/
│   ├── useSettings.js        — loadSettings / saveSettings (per-user key)
│   └── useAuth.js            — reactive auth hook (user, profile, authLoading, refreshProfile)
├── components/
│   ├── PageHeader.jsx        ~155 lines — auth-aware header
│   ├── SettingsDrawer.jsx    — RETIRED (replaced by SettingsPage)
│   ├── AuthModal.jsx         — sign-in modal (Google + email + guest)
│   └── ProfileModal.jsx      — display name editor
└── pages/
    ├── HomePage.jsx          234 lines — course cards grid (with bookmark button per card)
    ├── CoursePage.jsx        339 lines — level tabs + theme list (with bookmark per theme)
    ├── ModulesPage.jsx       276 lines — module list for a theme (with bookmark per module)
    ├── LessonsPage.jsx       176 lines — lesson list for a module (with bookmark per lesson)
    ├── SnippetPlayer.jsx     ~960 lines — main content player. Share button now live (edit cautiously)
    ├── DashboardPage.jsx    1174 lines — learner dashboard (real data wired; Forest + Badges live)
    ├── LikesPage.jsx         261 lines — liked snippets grid with filters + playlist launch
    ├── SettingsPage.jsx      ~400 lines — full settings page (Profile / Language / Text Size / Dashboard Share Message / Snippet Share Message)
    ├── BookmarksPage.jsx     331 lines — bookmarked content list with filters + deep-link navigation
    ├── EditorPage.jsx        1433 lines — editorial workspace. SupervisorView fully rewritten (3-tab). EditorView + VerifierView unchanged.
    └── AdminPage.jsx         1633 lines — admin panel. Token catalogue CRUD. Filters. Drag-reorder. Import.

supabase/
├── badges_schema.sql                  — badges + user_badges tables + 25-badge seed
├── tokens_and_badges_refine.sql       — user_tokens table, trims to 10 badges, activates 3
├── backfill_tokens.sql                — backfills tulsi + dharma tokens for pre-existing lesson_completions
├── bookmarks_schema.sql               — bookmarks table + RLS + get_user_bookmarks() RPC (lessons/modules/themes)
├── bookmarks_add_course.sql           — adds 'course' to CHECK constraint; recreates RPC (4-union)
├── bookmarks_add_snippet.sql          — adds 'snippet' to CHECK; recreates RPC (5-union, hook via correlated subquery)
├── settings_share_message.sql         — ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_message text;
├── settings_snippet_share_message.sql — ALTER TABLE profiles ADD COLUMN IF NOT EXISTS snippet_share_message text;
├── check_migrations.sql               — READ-ONLY diagnostic; paste into Supabase SQL Editor to verify all migrations
├── editorial_roles.sql                — Original RPCs (superseded — run editorial_roles_uniform.sql instead).
├── editorial_workflow.sql             — content_drafts + content_workflow_events tables + RLS + RPCs. Run after roles.
├── editorial_publish.sql              — publish_draft(uuid) RPC: writes draft_data to live tables + applies taxonomy tags. Run last.
├── editorial_roles_fix.sql            — Superseded by editorial_roles_uniform.sql. Kept for reference.
├── editorial_roles_uniform.sql        — ⚡ CANONICAL migration. Enforces ROLE_XX FK syntax. Run this (not editorial_roles.sql).
└── admin_fix_is_admin.sql             — ⚡ Fixes is_admin() to check ONLY for ROLE_01. Prevents editorial staff from seeing the Admin tab.
```

---

## 4. Navigation / Routing

App.jsx uses a `page` state string with `goForward()` / `goBack()` helpers (no React Router).

Page flow: `home → course → modules → lessons → player ↕ dashboard ↕ likes ↕ bookmarks`

`commonProps` spread onto every page:
`settings`, `onOpenSettings`, `onHome`, `onDashboard`, `onLikes`, `onBookmarks`, `bookmarks` (Set), `onToggleBookmark`

Header nav links (same on every page): **Home · Discover · Dashboard · Likes · Bookmarks**

`Discover` nav link is currently a no-op stub everywhere — building it is the **next session's task**.

---

## 5. What Has Been Completed

### Auth system — fully working
- `src/lib/auth.js` — SDK client + signInWithProvider, signInWithEmail, signUpWithEmail, signOut, signInAnonymously, getProfile, updateDisplayName
- `src/hooks/useAuth.js` — synchronous onAuthStateChange, single source of truth
- `src/contexts/AuthContext.jsx` — context + useAuthContext() hook
- `src/components/AuthModal.jsx` — Google + email/password + "Continue as Guest"
- `src/components/ProfileModal.jsx` — display name editor with auto-close on save
- `src/components/PageHeader.jsx` — three auth states

### Visual locks (pages complete)
- CoursePage, ModulesPage, LessonsPage, SnippetPlayer — fully locked and not to be touched
- SnippetPlayer: full-bleed image with CSS mask on `img` element, language pill + difficulty overlay, social strip (disabled), fixed nav bar

### Progress persistence
- `lesson_completions` table: `id, profile_id, lesson_id, course_id, points_earned, snippet_count, completed_at`
- `saveCompletion(userId, lessonId, courseId, pointsEarned, snippetCount)` in `auth.js`
- App.jsx loads completions on login, clears on sign-out, saves fire-and-forget on lesson complete
- Dharma Points per-snippet come from `snippet_core.dharma_points`; total = SUM(points_earned)

### Snippet-level resume + view tracking
- `lesson_progress` table: `(profile_id, lesson_id) PK, snippet_index smallint, updated_at`
- One row per in-progress lesson per user — deleted when lesson completes
- `loadLessonProgress` / `upsertLessonProgress` / `deleteLessonProgress` in `auth.js`
- App.jsx holds `lessonProgress` Map (lessonId → snippetIndex); loaded on login, cleared on sign-out
- `handleSnippetAdvance(lessonId, index)` — updates Map immediately, debounced DB write (400ms); skipped for anonymous users
- SnippetPlayer receives `initialSnippetIndex` prop (from Map) and `onSnippetAdvance` callback
- SnippetPlayer resets `current` and `done` state on lesson change (fixes stale state on Next Lesson)
- `onComplete` now passes `snippets.length` as third arg so App.jsx can save `snippet_count`
- Dashboard "Snippets Viewed" stat: `SUM(snippet_count)` from completions + `SUM(snippet_index+1)` from lesson_progress

### Resume Yatra
- `profiles.last_visited_route` stores JSON: `{ module_id, level_id, course_name, theme_title }`
- `updateLastVisited(userId, routeJson)` in `auth.js`
- On login, App.jsx auto-redirects returning users (those with a saved route) to Dashboard
- "Resume Yatra" button in Dashboard fetches the saved module and navigates to its lessons page

### DashboardPage — real data wired (Session 3)
- Display name from `profile.display_name` (fallback: email prefix → "Traveller")
- Dharma Points stat: SUM of `points_earned` from `lesson_completions`
- Lessons Completed stat: `completions.length / total lessons count` (live from Supabase)
- Streak heatmap: built from real `completed_at` dates (60-day window, activity levels 0–3)
- Recent Activity table: real per-day lessons and dharma (last 7 days)
- Share card preview: real Dharma Points and Lessons count

---

### Completed in Session 4

**Sequential course unlock — DONE**
- `courses.sequential_unlock` boolean column added (`ALTER TABLE courses ADD COLUMN sequential_unlock boolean NOT NULL DEFAULT false;`)
- When `true`, levels / themes / modules / lessons unlock only after the previous item is fully complete
- Lock logic is zero-query: derived from `completedLessons` Set and pre-fetched `lessonsByModule` data already on each page
- Lock styling: `opacity: 0.45; cursor: not-allowed` on locked rows; 🔒 badge on CTA
- CoursePage: level tabs locked (prev level must be 100% done); themes locked (prev theme in same level must be 100% done)
- ModulesPage: module locked if any lesson in previous module is not in `completedLessons`
- LessonsPage: lesson locked if previous lesson not in `completedLessons`
- To activate on a course: set `sequential_unlock = true` in Supabase Table Editor → courses table
- Default is `false` (open navigation) — existing courses unaffected

**Global font scaling via rem — DONE**
- All 151 hardcoded `font-size: Xpx` values converted to `rem` (X/16 rem) across 7 files
- JS in App.jsx sets `document.documentElement.style.fontSize` to `13px` / `16px` / `19px` based on `settings.fontSize`

**Snippet resume + Snippets Viewed stat — DONE**
- `lesson_progress (profile_id, lesson_id, snippet_index, updated_at)` table created with RLS
- `lesson_completions.snippet_count smallint` column added; backfilled from `lesson_snippet_mapping`
- Full implementation in auth.js, App.jsx, SnippetPlayer.jsx, DashboardPage.jsx

---

### Completed in Session 6

**Theme label fix, modules.course_id, Course Progress section — DONE**
- `course_id text` column added to `modules` table; all existing modules set to `Course_001`
- Course Progress section in Dashboard: per-theme + per-course progress bars, scope selector pill
- Forest tokens + badges system live (see Section F below)

### Completed in Session 7

**Activity table, global course selector, scope filtering, share buttons — DONE**
- Added Snippets Viewed and Plants Sown columns to Recent Activity table
- Binary scope toggle replaced with `📚 ▾` course pill dropdown — all data blocks react to scope
- All three share buttons live (WhatsApp, Twitter, Copy Link)
- Dashboard breadcrumb simplified to `Home › Dashboard`
- Snippets Liked stat card clickable → navigates to Likes page
- Badges Earned stat card live

### Completed in Session 8

**Critical data pipeline bugs — ALL FIXED**

1. `lesson_completions` never writing — root cause: `course_id: ""` violated FK. Fix: `|| null`.
2. `lesson_progress` upsert failing — `lesson_id` column was UUID type, IDs are text strings. Fixed via ALTER TABLE.
3. `user_tokens` duplicate awards — added deduplication guard checking existing tulsi token before inserting.
4. `commentsRaw.forEach` crash — `supabase()` returns error object (truthy) on 404. Fix: `Array.isArray()` guard.
5. Language preference shared across users — per-user localStorage key `indiyatra_settings_{userId}`.
6. Dashboard welcome name showing full email — strip at first non-alpha char, take 5 chars, capitalise.
7. Nav links inconsistent — standardised to `Home · Discover · Dashboard · Likes` on all pages.
8. Lesson completion modal vertically centered — `align-items: flex-start`, `padding: 5vh 1rem 2rem`.
9. SnippetPlayer had no nav links — added Home · Dashboard · Likes text nav buttons in top bar.
10. Bottom nav bar render lag — removed `backdrop-filter: blur(12px)`, using solid background.

### Completed in Session 9 — Bookmarks feature (complete)

**G2. Bookmarks — DONE**

Three-part implementation:

**Task 1 — Bookmark trigger buttons everywhere**
- SVG bookmark icon (20×20px) on every bookmarkable content row
- Behaviour: grey outline at rest → saffron outline on hover → saffron fill when saved
- Pages with bookmark buttons:
  - `HomePage.jsx` — course cards (circular pill, top-right corner of card image)
  - `CoursePage.jsx` — each theme row
  - `ModulesPage.jsx` — each module row
  - `LessonsPage.jsx` — each lesson row
  - `SnippetPlayer.jsx` — per-snippet in the social strip (snippet-level, not lesson-level)
- All bookmark SVGs are 20×20px with `fill={saved ? "currentColor" : "none"}`
- `bookmarks` is a flat `Set<string>` in App.jsx state, keys format: `"content_type:content_id"` (e.g. `"snippet:abc-uuid"`)
- `handleToggleBookmark(contentType, contentId, label)` — optimistic UI (Set updated immediately) + fire-and-forget DB write
- Shows toast: `"{label} bookmarked ✓"` or `"Bookmark removed"` (2s auto-dismiss, fixed bottom pill)
- Guest users: clicking bookmark shows AuthModal (not silently ignored)

**Task 2 — Bookmarks page**
- `BookmarksPage.jsx` (331 lines) — navigated from header "Bookmarks" nav link on all pages
- Loads data via `supabaseClient.rpc("get_user_bookmarks")`
- TYPE_META defines icon + colour per type: course 🎓 purple · theme 🗺 heritage · module 📦 saffron · lesson 📖 green · snippet ✦ gold
- Cascading filters: type dropdown → course dropdown → theme dropdown → module dropdown
- Cards: colour bar + icon + item name + breadcrumb + saved date + ✕ remove
- Remove: optimistic local state filter + calls `onToggleBookmark` (syncs App.jsx Set + DB)
- Sign-in gate with sign-in button for guest users
- Saffron SVG bookmark icon in hero and empty states (no emoji that renders differently per OS)

**Task 3 — Navigation from bookmark cards**
- Clicking a card calls `handleBookmarkNavigate(item)` in App.jsx
- `handleBookmarkNavigate` fetches necessary DB rows, sets all App.jsx state, navigates:
  - **course** → fetches course row → `setSelectedCourse` → goForward("course")
  - **theme** → fetches theme row + first module (for level_id) → set course/theme/levelId → goForward("modules")
  - **module** → fetches module row (has level_id) + theme row → set all → goForward("lessons")
  - **lesson** → fetches lesson/module/theme → set all context, clear lessonProgress for lesson → goForward("player") at snippet 0
  - **snippet** → finds lesson via `lesson_snippet_mapping`, gets `order_index` to find exact position → set all context, set lessonProgress to that index → goForward("player") at that snippet, continues through lesson normally
- ✕ remove button has `stopPropagation` so it doesn't trigger navigation

**SQL files (must be run in order in Supabase SQL editor):**
1. `supabase/bookmarks_schema.sql` — `bookmarks` table + RLS + `get_user_bookmarks()` RPC (lesson/module/theme unions)
2. `supabase/bookmarks_add_course.sql` — extends CHECK constraint to include `'course'`; recreates RPC with 4-union version
3. `supabase/bookmarks_add_snippet.sql` — extends CHECK to include `'snippet'`; recreates RPC with 5-union version. Snippet hook fetched via correlated subquery to `snippet_translations` (NOT `snippet_core` — that table has no text columns)

**Bookmarks table schema:**
```sql
bookmarks (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('lesson','module','theme','course','snippet')),
  content_id   text NOT NULL,
  saved_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, content_type, content_id)
)
```
RLS: `auth.uid() = profile_id` — SELECT, INSERT, DELETE own rows only.

**`get_user_bookmarks()` RPC:** 5-union SECURITY DEFINER function returning:
`id, content_type, content_id, saved_at, item_name, lesson_name, module_name, module_id, theme_title, theme_id, course_id, course_name` — ordered by `saved_at DESC`.

**`auth.js` additions:**
- `loadUserBookmarks(userId)` — SELECT content_type, content_id WHERE profile_id = userId
- `insertBookmark(userId, contentType, contentId)` — upsert with onConflict
- `deleteBookmark(userId, contentType, contentId)` — delete by (profile_id, content_type, content_id)
- `loadUserBookmarksRich()` — calls `get_user_bookmarks()` RPC

---

## 6. Pending Work

### Completed — All Courses drawer (quick-commerce style category browser)

Implements the "All Courses" bottom-nav tab: a Zepto/Blinkit-style two-pane browser over the full content tree, spanning every course (not just one, unlike `CourseNavigatorPage`).

**New file:** `src/pages/AllCoursesPage.jsx`
- Left sidebar: **Course → Level → Theme** accordion (one branch open at a time; text wraps, no truncation). Fetches all `courses`, then calls the existing `get_course_tree` RPC once per course (`Promise.all`) and tags each row with its `course_id`/`course_name` client-side (the RPC itself is unchanged — still single-course).
- Main pane, top half: selected theme's **Modules** as speedometer-arc gauge buttons (hand-rolled SVG arc, no library) — arc colour = grey <25%, saffron 25–50%, heritage blue 51–75%, green >75%, based on `completedLessons`. Caption shows `X lessons · Y stories` (`stories` = row-count from `lesson_snippet_mapping` summed per module, fetched unfiltered like `ModulesPage` already does).
- Main pane, bottom half: selected module's **Lessons** as pill cards (Read = saffron, Quiz = heritage blue via `getQuizzesForLessons`, disabled when no quiz).
- Modules pane and lessons pane scroll independently (`overflow-y:auto` + `min-height:0` on every flex ancestor + `overscroll-behavior:contain`), per spec — sidebar scrolls independently too.
- Sidebar active/open states and lesson-card backgrounds use the **teal** accent (`#4AADA8` / `#EAF6F5` / `#C2E4E2`) already established by `HomePage.jsx`'s course cards — kept local to this file rather than promoted to `lib/supabase.js` to minimise blast radius.
- Below the standard `PageHeader`, a two-line headline: **"All Courses"** + `Course / Level / Theme` breadcrumb (fills in as the user drills down), per the mockup screenshot embedded in `To Do.docx`.
- On load, auto-opens the first course/level/theme so the drawer isn't empty on first visit (same pattern as `CourseNavigatorPage`'s "auto-select first level").

**App.jsx changes:**
- `import AllCoursesPage from "./pages/AllCoursesPage"`
- `onAllCourses` in `commonProps` changed from the `goForward("home")` placeholder to `goForward("all-courses")` — this prop is already wired into every page's "Courses" nav link, so the whole app's bottom-nav "Courses" tab now opens the drawer.
- New `case "all-courses"` in `renderPage()`, modelled on the existing `"navigator"` case's `onLessonSelect`/`onQuizClick` handlers, with one addition: since this page spans multiple courses it also receives a `course` argument and calls `setSelectedCourse(course)` before navigating to the player/quiz (the `"navigator"` case doesn't need this because `selectedCourse` is already set by whoever opened that single-course page).
- `playerReturnPage` / `quizReturnPage` set to `"all-courses"` so the back button from the player/quiz returns here.
- No changes needed to `PageHeader.jsx` — it already had `"all-courses": "Courses"` in `PAGE_TO_TAB` and a `Courses` → books-icon mapping in `LABEL_IC` from an earlier session, i.e. the bottom-tab-bar highlighting "just worked" once the page existed.

**Known environment quirk hit while building this (not a code bug):** in this sandbox, editing an existing `.jsx` file via the file-edit tool updates the real file correctly, but the Linux shell's mount of the same folder can serve a stale/truncated cached copy of that file for some time afterwards (confirmed by writing a marker string and reading it back truncated via `cat`). `npx vite build` / `node --babel-parse` run from the shell against a freshly-edited file can therefore report false failures. Trust the file-edit tool's own file (or a fresh `Read`) over a shell `cat`/`node` check that immediately follows an edit to a pre-existing file.

### Completed in Session 10 — Discover page (complete)

**Discover page — DONE**

Taxonomy-browsing discovery page. "Discover" nav link is now live on all pages.

**Design:**
- Term pills grouped into **Categories** and **Tags** rows (from `taxonomy_terms` table)
- Clicking a pill loads all content tagged with that term from `content_taxonomy_mapping`
- **Type filter tabs** (All / Snippets / Lessons / Modules / Courses) appear once results load
- **Two navigation modes:**
  - Snippet card → plays all snippets for that term as a playlist (`onPlaySnippet`, same as LikesPage)
  - Lesson / Module / Course card → deep-links via `handleBookmarkNavigate` (same as BookmarksPage)
- Language-aware term names: loads `taxonomy_term_translations` for user's `settings.languageId`; falls back to English from `taxonomy_terms.name`

**New file:** `src/pages/DiscoverPage.jsx`

**App.jsx changes:** import + `onDiscover: () => goForward("discover")` in commonProps + `case "discover":` in renderPage

**All pages wired:** `onDiscover` prop added to prop destructuring and navLinks in all 8 pages (HomePage, CoursePage, ModulesPage, LessonsPage, SnippetPlayer, DashboardPage, LikesPage, BookmarksPage)

**SQL files (run in order in Supabase SQL Editor):**
1. `supabase/rename_taxonomy_table.sql` — renames `snippet_taxonomy_mapping` → `content_taxonomy_mapping`
2. `supabase/taxonomy_translations.sql` — creates `taxonomy_term_translations (id, term_id, language_id, name)` table with RLS
3. `supabase/taxonomy_seed.sql` — inserts ~20 sample mappings across snippets/lessons/modules/courses for testing

**Important — run SQL before testing:**
The `content_taxonomy_mapping` table (previously `snippet_taxonomy_mapping`) has 0 rows until the seed SQL is run. Discover page will show "Nothing tagged yet" for all pills until then.

**`content_taxonomy_mapping` table schema (after rename):**
```
id          uuid PK
term_id     text FK → taxonomy_terms(term_id)
entity_id   text  — the ID of the tagged content item
entity_type text  — "snippet" | "lesson" | "module" | "course" | "theme"
```

**`taxonomy_terms` table (10 rows, all English):**
- Categories: Architecture, Art, Book, Gurus, Painting
- Tags: Mountains, Rishis, Rivers, Temples, Tirthas

**`taxonomy_term_translations` table:** created but empty. Add rows to provide translated names.
Example insert:
```sql
INSERT INTO taxonomy_term_translations (term_id, language_id, name) VALUES
  ('TERM_001', 'LANG_02', 'ವಾಸ್ತುಶಿಲ್ಪ')
ON CONFLICT (term_id, language_id) DO UPDATE SET name = EXCLUDED.name;
```

**Completed in Session 10 (continued) — Skeleton loaders**

**J. Skeleton loaders — DONE**

All "Loading…" text replaced with shimmer skeleton components that match each page's real layout shape.

**New file:** `src/components/Skeletons.jsx` — 8 named exports:
- `SkeletonCourseGrid` — HomePage (course card grid, image + text lines)
- `SkeletonCourseThemes` — CoursePage (3 tab pills + 4 theme rows)
- `SkeletonModuleList` — ModulesPage (thumbnail + text + progress bar + CTA button)
- `SkeletonLessonList` — LessonsPage (circle number + text + CTA button)
- `SkeletonLikeGrid` — LikesPage (card grid with image + text)
- `SkeletonBookmarkList` — BookmarksPage (left color bar + text lines)
- `SkeletonDiscoverResults` — DiscoverPage (result rows + group label)
- `SkeletonBadges` — DashboardPage badges section (circles + text lines)

**`src/styles/global.js`** — added `@keyframes shimmer` and `.skel` class (shared by all pages via globalStyles). Colour palette: warm parchment tones (`#ede5d8` / `#f7f0e6`) at 1.5s ease-in-out.

All 8 pages import only the skeleton they need — no bundle bloat.

**NEXT SESSION: Continue mobile redesign (HomePage / CoursePage) or Comments feature**

**Bug fixes applied after Session 10 (same session):**
- SnippetPlayer playlist mode now source-aware: "likes" vs "discover"
- New props on SnippetPlayer: `onBackToDiscover`, `playlistLabel` (both optional; fall back to Likes behaviour if absent)
- Derived helpers inside SnippetPlayer: `backToPlaylist = onBackToDiscover || onBackToLikes`, `isDiscoverPlaylist = !!onBackToDiscover`
- Top-bar breadcrumb shows `playlistLabel` (e.g. "🧭 Temples") instead of hardcoded "♥ Likes Playlist"
- ← Back button, Escape key, and completion modal all use `backToPlaylist`
- Completion modal: emoji / title / subtitle / primary button all branch on `isDiscoverPlaylist`
- App.jsx: added `playlistSource` + `playlistLabel` state; `handlePlayFromLikes` sets source="likes"; new `handlePlayFromDiscover(ids, idx, termName)` sets source="discover" and label="🧭 {termName}"
- DiscoverPage: `handleSnippetClick` passes `selectedTermObj.displayName` as 3rd arg to `onPlaySnippet`
- DiscoverPage render in App.jsx uses `handlePlayFromDiscover`; LikesPage render still uses `handlePlayFromLikes`

### Completed in Session 12 — Editorial Workflow Phase A

**Editorial workflow — Phase A DONE**

Role-gated editorial workspace with task assignment dashboard, editor task list, and verifier review queue.

**New files:**
- `supabase/editorial_roles.sql` — Run first. Creates `get_editorial_role()` (returns calling user's highest role: supervisor/verifier/editor/null) and `get_editorial_staff()` (returns all users with editorial roles for assignment dropdown). Both are SECURITY DEFINER RPCs.
- `supabase/editorial_workflow.sql` — Run second. Creates `content_drafts` table (id, content_type, content_id, language_id, draft_data jsonb, status, assigned_to, assigned_by, due_date, notes, created_at, updated_at) and `content_workflow_events` table (id, draft_id, action, actor_id, comment, created_at). Full RLS: editors see their own drafts, verifiers see submitted drafts, supervisors see all. Four RPCs: `get_all_drafts()`, `get_my_drafts()`, `get_review_queue()`, `is_supervisor_or_admin()`, `is_editorial_staff()`.
- `src/pages/EditorPage.jsx` — 719 lines. Three role-based views:
  - **Supervisor view**: stats (Total/Assigned/In Draft/In Review/Published), assignment form (content type, content ID, language, assign-to editor, due date, notes), full task table with Publish/Reject/Log actions.
  - **Editor view**: my assigned tasks table with Start/Submit/Revise buttons based on status.
  - **Verifier view**: review queue with Approve/Send Back actions.
  - All views: 📋 Activity Log button opens a slide-in panel with the full `content_workflow_events` audit trail.

**Modified files:**
- `src/lib/auth.js` (~397 lines) — Added 8 new functions: `getEditorialRole()`, `getEditorialStaff()`, `loadAllDrafts()`, `loadMyDrafts()`, `loadReviewQueue()`, `assignDraft({...})`, `updateDraftStatus(draftId, status, comment)`, `addWorkflowEvent(draftId, action, comment)`, `loadDraftEvents(draftId)`.
- `src/App.jsx` (653 lines) — Added `userEditorialRole` state, loads via `getEditorialRole()` RPC on sign-in. Added `onEditor: () => goForward("editor")` and `userEditorialRole` to commonProps. Added `case "editor":` in renderPage. Resets `userEditorialRole` to null on sign-out.
- `src/components/PageHeader.jsx` (177 lines) — Added `userEditorialRole` and `onEditor` props. Shows purple "Editor" nav link when user has an editorial role.

**How to assign roles (Supabase Table Editor):**
- Go to `user_roles_mapping` table
- Insert a row: `profile_id` = user's UUID, `role_id` = ROLE_XX (see canonical IDs below)
- **Canonical editorial role IDs:**
  - `ROLE_02` = Editor
  - `ROLE_05` = Supervisor
  - `ROLE_06` = Verifier
- To find a user's UUID: check the `profiles` table filtered by `display_name`
- ⚠️ Never insert plain-text values like `'editor'` or `'supervisor'` — always use ROLE_XX

**Content draft statuses:**
`unassigned → assigned → in_draft → submitted → needs_revision ↔ submitted → approved → published`
Plus: `rejected` (terminal state from any step)

**Content types supported:**
- `snippet_translation` — editor translates/edits a snippet's text in a specific language
- `lesson` — editor edits lesson metadata (title, description, etc.)

**Phase B — DONE (same session):** See "Editorial Workflow Phase B" section below for full details.

---

### Editorial Workflow Phase B — Edit Form + Auto-Publish

**Run this new SQL migration in Supabase (after the Phase A files):**
`supabase/editorial_publish.sql` — creates `publish_draft(p_draft_id uuid)` SECURITY DEFINER RPC. This RPC:
- Validates caller is supervisor or admin
- Reads `content_drafts.draft_data` for the given draft
- For `snippet_translation`: upserts into `snippet_translations` (creates new language row if none exists, or updates existing one)
- For `lesson`: updates `lesson_name` and `lesson_description` in `lessons`
- Applies any `taxonomy_additions` array from draft_data to `content_taxonomy_mapping` (ON CONFLICT DO NOTHING)
- Sets draft status to `published` and logs a workflow event

**EditorPage.jsx (955 lines) — new DraftEditForm component:**

Slide-in panel (640px wide) triggered by editor clicking "▶ Start" or "✎ Edit":

- **On open**: loads live content for pre-fill (calls `loadDraftContent`) + existing taxonomy tags (`loadExistingTaxonomy`) + all taxonomy terms (`loadTaxonomyTerms`)
- **If draft_data already has content** (previously saved draft): pre-fills from saved data, not from live tables
- **If no draft_data yet**: pre-fills from current live content (existing translation text or lesson fields)

**Snippet Translation fields:** Hook, Explanation, Key Term, Key Term Meaning, Life Connection, Quiz Recap, Source Citation

**Lesson fields:** Lesson Name, Lesson Description

**Taxonomy picker** (both types):
- Green "Already Tagged" pills — read-only, show what's currently in content_taxonomy_mapping
- Orange pill = selected for addition; grey pill = available to add; click to toggle
- Selected tags stored in `draft_data.taxonomy_additions` array
- Applied to live tables only when supervisor publishes

**Footer buttons:**
- "Save Draft" → `saveDraftData()` — saves draft_data, status stays `in_draft`
- "Submit for Review ↑" → `submitDraft()` — saves draft_data + sets status to `submitted`

**Supervisor Publish button:** now calls `publishDraft(draftId)` which hits the `publish_draft` RPC. Only appears when draft status is `approved` (verifier has signed off).

**New auth.js functions (Phase B):**
- `loadDraftContent(contentType, contentId, languageId)` — fetches live content for pre-fill
- `loadExistingTaxonomy(entityId, entityType)` — fetches current content_taxonomy_mapping tags
- `loadTaxonomyTerms()` — fetches all taxonomy_terms for the picker
- `saveDraftData(draftId, draftData)` — updates draft_data without status change
- `submitDraft(draftId, draftData)` — saves draft_data + sets status = 'submitted'
- `publishDraft(draftId)` — calls publish_draft RPC

**draft_data JSON structure:**

Snippet translation:
```json
{ "hook": "...", "explanation": "...", "key_term": "...", "key_term_meaning": "...",
  "life_connection": "...", "quiz_recap": "...", "source_citation": "...",
  "taxonomy_additions": ["TERM_001", "TERM_004"] }
```

Lesson:
```json
{ "lesson_name": "...", "lesson_description": "...", "taxonomy_additions": ["TERM_002"] }
```

---

### Completed in Session 11 (continued) — Snippet share feature + SQL audit

**Snippet share feature — DONE**

Wire-up of the disabled share button in SnippetPlayer. Mirrors the Dashboard share pattern.

**Changes:**
- `src/lib/auth.js` — added `updateSnippetShareMessage(userId, message)` (writes `profiles.snippet_share_message`)
- `src/pages/SettingsPage.jsx` — new "Snippet Share Message" card below Dashboard share card. Same pattern: textarea, char count, Reset, Save. Default: *"I found this story. It is very exciting. You can read this and more at indiyatra.in. It has an amazing collection."*
- `src/pages/SnippetPlayer.jsx` — share button enabled (was fully `disabled`). Tapping opens a bottom-sheet popover with WhatsApp, Post on X, and Copy Link. Share text = snippet hook + customisable message + `https://indiyatra.in`. Popover uses `slideUp` animation, same as comments sheet.
- `src/App.jsx` — passes `snippetShareMsg` prop to SnippetPlayer (derives from `profile?.snippet_share_message` → localStorage → default).
- `supabase/settings_snippet_share_message.sql` — `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS snippet_share_message text;`

**Message storage:** `localStorage("indiyatra_snippet_share_message")` for guests; `profiles.snippet_share_message` for signed-in users.

**Share URL:** `https://indiyatra.in` (no deep linking — SPA has no URL routing).

**Migration audit — ALL MIGRATIONS VERIFIED RUN**

Created `supabase/check_migrations.sql` — read-only diagnostic that checks every table, column, and constraint. Result from Supabase: all 6 tables exist, all profile columns exist, bookmarks constraint includes `snippet` and `course`, badges = 10 rows / 3 active, taxonomy seed = 21 rows. Nothing missing.

---

### Completed in Session 11 — Dashboard mobile redesign + Bug fix

**Bug fix:**
- `LikesPage.jsx` line 88: `onResume` was missing from destructured props, causing blank page crash when navigating to Likes. Fixed by adding `onResume` to the function signature.

**DashboardPage — mobile-first visual redesign (CSS + minimal JSX)**

Inspired by Figma redesign mock (Figma file: `Indiyatra-Website-Redesign`). 95% of views are mobile.

Changes applied to `src/pages/DashboardPage.jsx`:
- **Welcome hero band** — title + action bar wrapped in `.dash-hero` teal gradient card (`#E8F5F2 → #D6EDE8`)
- **Max-width** `860px → 1100px` (better on tablet/desktop)
- **Resume button** — `border-radius: 999px → 10px`, `min-height: 44px` touch target, full-width on mobile (`≤600px`)
- **Course/language/font pills** — bigger touch target (`min-height: 38px`), updated border colour to match hero
- **Dropdown items** — `min-height: 44px` touch targets
- **Stat cards** — `border-radius: 14→16px`, `height: 3→4px` accent bar, `box-shadow` added, larger stat value (`1.625→1.75rem`)
- **Section cards** — `border-radius: 16→18px`, stronger shadow, `margin-bottom: 20→24px`
- **Section titles** — saffron `::before` left-bar accent (4×20px), `letter-spacing: 0.02em`, colour `HERITAGE → #1a1a2e`
- **Progress table** — wrapped in `.prog-table-wrap` (overflow-x), Snippets column hidden at `≤600px`, progress bar taller (`5→6px`), theme name larger
- **Activity table** — wrapped in `.act-table-wrap` (overflow-x), Plants column hidden at `≤600px`, Snippets column hidden at `≤480px`, row text larger
- **Forest grid** — switched from `flex-wrap` to `grid repeat(5,1fr)` → `3-col` at `≤768px`, tokens larger
- **Badge cards** — switched from `flex-wrap` to `auto-fill minmax(110px,1fr)` grid, `border-radius: 14→16px`
- **Share buttons** — `border-radius: 999px → 10px`, `min-height: 44px`, full-width stacked on `≤480px`
- **New `≤600px` breakpoint** — action bar stacks vertically, Resume button full-width
- **`≤480px`** — 2-col stat grid, smaller streak cells, 3-col forest grid, full-width share buttons

**Temp files to delete from IndiYatra root:**
`figma_*.png` and `frame_*.png` — Figma reference images created during analysis. Safe to delete.

**Other pending items (lower priority):**

**PRE-LAUNCH TASKS — deferred, do these together at the end**

---

**PL-1. Centralise all UI copy into a single config file (DEFERRED — pre-launch)**

Move all hardcoded UI strings out of JSX files into `src/config/appStrings.js`. One place to change any label, title, message, or placeholder across the entire app. Zero performance impact — Vite resolves imports at build time, identical to hardcoding. Items to include:
- Dashboard section titles, stat labels, welcome text variants
- Completion modal headlines and button labels (SnippetPlayer)
- Sign-in gate messages ("Sign in to like", "Sign in to bookmark")
- Empty state messages on all pages
- Level display labels (currently `LEVEL_LABELS` in supabase.js — move here)
- Visibility badge labels (currently `VISIBILITY_BADGE` in supabase.js — move here)
- Difficulty label strings
- Default share message templates
- Forest token display names (Tulsi, Ashoka, Lotus, Peepal, Banyan, Dharma)
- Badge names / descriptions are already in the `badges` DB table — leave there
Do NOT do this early — the copy will keep changing during development. Do it in one sweep once all features are complete.

---

**PL-2. Centralise all icons, logos, and asset URLs into a single config file (DEFERRED — pre-launch)**

Create `src/config/assets.js` as a single source of truth for every image URL, icon path, and logo reference used across the app. Items to include:
- App logo URL (currently `logoUrl` in `supabase.js` — move here and keep a re-export there for backwards compat)
- Course thumbnail placeholder image URL
- Any other CDN-hosted image URLs hardcoded in JSX
- SVG icon sets currently inlined in multiple pages — extract into `src/components/Icons.jsx` (named exports per icon), referenced from `assets.js` or directly
- Favicon path
- OG image URL (for social share previews)
Changing a logo or icon URL then becomes a single-line edit in one file. Same zero-cost pattern as PL-1.
Do this in the same final sweep as PL-1.

---

**P. Visual polish — typography, colour reduction, icon refresh (PENDING)**

Three linked changes to tackle together in one session:

1. **Text colour** — replace grey body text (#666, #777, #888, #aaa) with near-black (#1a1a2e or #333) throughout. Goal: higher contrast, easier to read on mobile in sunlight.

2. **Colour reduction** — pages currently use saffron + heritage + green + gold + purple + teal simultaneously in some blocks (e.g. Dashboard stat cards, Forest tokens). Reduce to a 2-colour-per-block rule: one accent + neutral. Strip decorative colour from body text; reserve colour for CTAs and status indicators only.

3. **Icon refresh** — replace all emoji icons (🔥 🏆 🌿 🌸 📖 ✦ etc.) used in headings, stat cards, badges, and forest tokens with flat SVG icons. Target style: clean, single-colour, outline or filled — similar to what Claude/ChatGPT/Gemini UIs use (Lucide, Heroicons, or Phosphor icon sets). Icons should be 20×20px or 24×24px, colour-matched to the section accent, not multicolour.

**Scope:** All pages, but start with DashboardPage (most icon/colour-dense). Then HomePage, then the rest.

**Why together:** Changing text colour + reducing palette + swapping icons are visually interdependent — doing them in isolation can make the page look half-finished.

**N. Profile / Settings page — DONE (Session 10)**

Full settings page replacing the SettingsDrawer:

- **`src/pages/SettingsPage.jsx`** — 4 sections: Your Profile, Language, Text Size, Share Message
- **`src/lib/auth.js`** — added `updateShareMessage(userId, message)` function
- **`supabase/settings_share_message.sql`** — run in Supabase SQL Editor to add `share_message text` column to `profiles`
- Language auto-saves on click; Display Name and Share Message have explicit Save buttons
- Share message saved to `profiles.share_message` for signed-in users; `localStorage` for guests
- Guest banner shown in Profile section; guest note in Share Message section
- `{dharma}` and `{lessons}` placeholders explained with inline code chips
- Character count + Reset to default button for Share Message
- App.jsx: SettingsDrawer removed, `showSettings` state removed, `onOpenSettings` now calls `goForward("settings")`, `case "settings"` added to renderPage

**I. Comments**
- `snippet_comments` table — does not exist yet
- Comment button in SnippetPlayer is a disabled stub
- Create table, RLS, and wire the UI when ready

---

### Completed in Session 13 — Uniform Role Syntax + Admin Tab Fix

**Two SQL migrations to run in Supabase SQL Editor (in order):**

---

#### `supabase/editorial_roles_uniform.sql` — Canonical role schema (run first)

Enforces the rule: every entry in `user_roles_mapping` must reference a ROLE_XX FK from the `roles` table. No plain-text values allowed.

**What it does:**
1. Inserts canonical ROLE_XX rows for all editorial roles:
   - `ROLE_02` = Editor (was pre-existing; confirms/normalises)
   - `ROLE_05` = Supervisor (new)
   - `ROLE_06` = Verifier (new)
2. Migrates any existing plain-text entries in `user_roles_mapping` (e.g. `'supervisor'`, `'editor'`) to the correct ROLE_XX equivalent
3. Deletes the plain-text role rows (`editor`, `verifier`, `supervisor`) from the `roles` table — inserted by the original `editorial_roles.sql`
4. Replaces all four editorial RPCs (`get_editorial_role`, `get_editorial_staff`, `is_supervisor_or_admin`, `is_editorial_staff`) to check **only by role_name join** — no plain-text role_id checks remain anywhere

**`App.jsx` also updated:** the client-side fallback role detection now checks only `row.roles.role_name` (not role_id text) to match the same logic as the RPCs.

**Canonical roles table after migration:**
```
ROLE_01  Admin
ROLE_02  Editor
ROLE_04  Learner
ROLE_05  Supervisor
ROLE_06  Verifier
```

**Rule going forward:** when assigning roles via Supabase Table Editor → `user_roles_mapping`, always insert a `ROLE_XX` value. Never insert plain text like `'editor'` or `'supervisor'`.

---

#### `supabase/admin_fix_is_admin.sql` — Fix Admin tab showing for editorial staff

**Root cause:** `is_admin()` was written as `role_id != 'ROLE_04'` — safe when only ROLE_01 (Admin) and ROLE_04 (Learner) existed. After adding ROLE_02/ROLE_05/ROLE_06, this returned `true` for all editorial staff, causing the Admin nav tab to appear for editors, verifiers, and supervisors.

**Fix:** Changed to check specifically for ROLE_01 (or any role whose `role_name` = 'Admin' via join):
```sql
AND (urm.role_id = 'ROLE_01' OR LOWER(r.role_name) = 'admin')
```

After this fix only ROLE_01 (Admin) users see the Admin nav tab. All editorial roles (ROLE_02/05/06) see only the Editor tab.

No frontend changes needed — Admin tab visibility is driven entirely by the `is_admin()` RPC result.

---

## 7. Critical Technical Gotchas

### The Edit/Write tool truncation bug
The Edit and Write tools silently truncate files at backtick template literal sequences (common in JSX/CSS strings). Affects `.js`, `.jsx`, and `.py` files.

**The only safe pattern — write patch scripts via bash `cat >`, then run them:**
```bash
cat > /sessions/SESSIONNAME/mnt/outputs/patch_something.py << 'PYEOF'
filepath = '/sessions/SESSIONNAME/mnt/IndiYatra/src/...'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = "exact old string"
new = "exact new string"
assert content.count(old) == 1
content = content.replace(old, new, 1)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
PYEOF
python3 /sessions/SESSIONNAME/mnt/outputs/patch_something.py
```

For long patches, split into multiple small scripts (one per logical change) and run them sequentially. Each script should assert exactly 1 match before replacing.

NEVER use the Write/Edit tool on `.jsx`, `.js`, or `.py` files directly — all truncate.
NEVER pipe Python inline via `python3 -c` — also truncates.
NEVER use heredoc `python3 << 'PYEOF'` to run Python directly — also truncates.
The bash `cat > file << 'PYEOF' ... PYEOF` pattern to WRITE the script file is safe; it's only running Python via heredoc that truncates.

### snippet_core has NO text columns
`snippet_core` only has: `snippet_id, asset_id, difficulty_level, like_count, snippet_value` (and similar non-text fields).
All display text (`hook`, `explanation`, `key_term`, etc.) is in `snippet_translations` — joined by `snippet_id`.
Any SQL or JS that tries `sc.hook` or `sc.explanation` will fail with "column does not exist".

### CRLF vs LF
All auth-related files are LF only.
`HomePage.jsx` is CRLF — use `\r\n` in search strings when patching it.

### Two Supabase clients — never mix them up
- `supabase(table, query)` in `src/lib/supabase.js` — raw fetch, always uses anon key. For public reads.
- `supabaseClient` in `src/lib/auth.js` — SDK, uses user JWT. For all auth and user-gated writes.

### onAuthStateChange MUST be synchronous
Do NOT await inside the callback. Supabase v2 holds a lock while it runs. Awaiting blocks all supabaseClient calls → modal freezes, sign-out failures. Always call async work fire-and-forget.

### HTML entities in JSX
HTML entities (`&#9825;`) work in JSX text nodes but NOT inside JS expressions `{}`. Use actual Unicode characters in JS strings: `"♡"` not `"&#9825;"`.

### CSS mask-image
Apply to the `img` element, never to a container with absolutely-positioned children. Masking the container also masks overlays.

### Restoring a corrupted file
```bash
cd /sessions/SESSIONNAME/mnt/IndiYatra
git show HEAD:src/pages/SnippetPlayer.jsx > src/pages/SnippetPlayer.jsx
```

### Validating JSX after any edit
```bash
cd /sessions/SESSIONNAME/mnt/IndiYatra && node -e "
const parser = require('@babel/parser');
const fs = require('fs');
['src/App.jsx','src/pages/BookmarksPage.jsx'].forEach(f => {
  try { parser.parse(fs.readFileSync(f,'utf8'),{sourceType:'module',plugins:['jsx']}); console.log('OK',f); }
  catch(e) { console.error('FAIL',f,e.message); }
});
"
```

### Bash mount paths — update each session!
Session name changes every session. Always check at start: `ls /sessions/`

**Session 5:** `zen-bold-fermat`
- IndiYatra: `/sessions/zen-bold-fermat/mnt/IndiYatra/`
- Outputs: `/sessions/zen-bold-fermat/mnt/outputs/`

**Session 6:** `dreamy-laughing-cerf`
- IndiYatra: `/sessions/dreamy-laughing-cerf/mnt/IndiYatra/`
- Outputs: `/sessions/dreamy-laughing-cerf/mnt/outputs/`

**Session 7:** `busy-lucid-turing`
- IndiYatra: `/sessions/busy-lucid-turing/mnt/IndiYatra/`
- Outputs: `/sessions/busy-lucid-turing/mnt/outputs/`

**Session 8:** `elegant-upbeat-euler`
- IndiYatra: `/sessions/elegant-upbeat-euler/mnt/IndiYatra/`
- Outputs: `/sessions/elegant-upbeat-euler/mnt/outputs/`

**Session 9:** `bold-serene-pascal`
- IndiYatra: `/sessions/bold-serene-pascal/mnt/IndiYatra/`
- Outputs: `/sessions/bold-serene-pascal/mnt/outputs/`

**Session 10:** `clever-eager-archimedes`
- IndiYatra: `/sessions/clever-eager-archimedes/mnt/IndiYatra/`
- Outputs: `/sessions/clever-eager-archimedes/mnt/outputs/`

**Session 11/12/13:** `upbeat-sleepy-franklin`
- IndiYatra: `/sessions/upbeat-sleepy-franklin/mnt/IndiYatra/`
- Outputs: `/sessions/upbeat-sleepy-franklin/mnt/outputs/`

### Dev server
```bash
cd /sessions/SESSIONNAME/mnt/IndiYatra && npm run dev
# Opens on http://localhost:5173
```

---

## 7b. Phase II — Future Development Considerations

These are not pending tasks. They are architectural decisions to revisit when the platform scales.

---

### ⚠️ MAJOR: Module sharing across courses
**Current state (as of Session 6):** `modules` table now has a `course_id text` column (FK → `courses.course_id`). All existing modules set to `Course_001`. This gives clean course-scoping for CoursePage and Dashboard.

**Why course_id is on modules (not levels or themes):**
- Levels are global complexity tiers (Preparatory, Middle, Secondary) — reuse across courses
- Themes are global topic categories (Sacred Geography, Dharma…) — reuse across courses
- Modules are the Course × Level × Theme intersection — course-specific by nature

**Future problem:** If a module needs to appear in two courses simultaneously, the current `course_id` column cannot support that. Options: junction table `course_modules(course_id, module_id)` or copy-on-create pattern.

---

### ⚠️ MAJOR: Replace text IDs with UUID across all tables
**Current state:** Primary keys across most tables use `text` format (e.g. `Course_001`, `MODULE_001`). Supabase Auth already uses UUID for `profiles.id` — text PKs on content tables create a type mismatch at every FK join.

**Migration path when ready:** Add new `uuid` column alongside existing text PK, update all FK references, drop old text PK columns. Breaking migration — maintenance window required.

---

### Badge / token awarding — server-side trigger (Phase II)
**Current:** Badge criteria and token writes happen client-side after `saveCompletion`. Risk: dropped connection after lesson save can miss an award.

**Phase II:** Replace with a Supabase Database Trigger on `lesson_completions` INSERT that handles all token + badge logic server-side.

---

**Content reuse across courses**
Currently lessons are locked to one module, modules to one theme. Only snippets are reusable via `lesson_snippet_mapping`. For Phase II: junction tables or copy-on-create for lessons/modules/themes.

---

## 8. Database Schema Summary

Content hierarchy: `levels → modules → lessons → lesson_snippet_mapping → snippet_core / snippet_translations`

`courses` table: includes `sequential_unlock boolean NOT NULL DEFAULT false`; `snippet_count int`, `language_count int` (trigger-maintained); `learner_count` via RPC `get_course_learner_counts()`

`modules` table: includes `course_id text FK → courses(course_id)`; `level_id text FK → levels`

User state: `profiles`, `bookmarks`, `lesson_completions` (+ `snippet_count` column), `lesson_progress`, `snippet_likes`, `snippet_views`, `quiz_attempts`

Bookmarks: `bookmarks (id uuid PK, profile_id uuid FK, content_type text CHECK IN ('lesson','module','theme','course','snippet'), content_id text, saved_at timestamptz, UNIQUE(profile_id, content_type, content_id))`. RLS own rows only.

Snippet likes: `snippet_likes (id uuid PK, profile_id uuid FK, snippet_id text, course_id, theme_id, module_id, lesson_id, liked_at)`. UNIQUE(profile_id, snippet_id). `snippet_core.like_count` maintained by trigger.

Forest / gamification:
- `user_tokens` — tulsi (lesson) · ashoka (module) · lotus (theme) · peepal (level) · banyan (course) · dharma (points). Columns: `id uuid PK, profile_id uuid FK, token_type text, quantity int, source_type text, source_id text, awarded_at timestamptz`. RLS: own rows only.
- `badges` — badge catalogue: `badge_id text PK, badge_name, badge_icon, badge_category, criteria_type, criteria_value int, description, sort_order, is_active bool`. Public read. 10 rows (3 active: Curiosity/Persistence/Endurance).
- `user_badges` — one-time earned badges: `id uuid PK, profile_id uuid FK, badge_id text FK, awarded_at timestamptz`. UNIQUE(profile_id, badge_id). RLS: own rows only.

`lesson_progress`: one row per in-progress lesson per user. `lesson_id` is type `text` (was mistakenly uuid — fixed Session 8).

Quiz: `quiz_sets` (linked to lessons/modules), `quiz_attempts`

Auth: `roles`, `user_roles_mapping`
- Canonical role IDs: ROLE_01=Admin, ROLE_02=Editor, ROLE_04=Learner, ROLE_05=Supervisor, ROLE_06=Verifier
- All entries in `user_roles_mapping` must use ROLE_XX FK only — never plain text
- `is_admin()` checks ROLE_01 (or role_name='Admin') only — not `role_id != 'ROLE_04'`

Assets/media: `asset_library`, `icons`

i18n: `languages`, `language_id` columns on most content tables, `snippet_translations` for per-language content

Auth trigger: `handle_new_user` — inserts into `profiles` and assigns role `ROLE_04`. Fires for all users including anonymous.

RLS: All content tables publicly readable (anon key). User-owned tables gated on `auth.uid() = profile_id`.

Full schema is in the three CSV files attached to the IndiYatra Claude project.


---

### Completed in Session 14 — Supervisor View Rework

**SupervisorView completely rewritten** as a three-tab layout inside EditorPage.jsx.

**Tab 1 — Assign Tasks**
- Filter bar: Type | Language | Content status (All / Full / Partial / None) | Show (Unassigned only / All) | Search
- Content browser: checkboxes, Content ID, English hook preview, Type badge, per-language content status (Full / Partial n/7 / None)
- `loadSnippetsForAssignment(languageId)` fetches snippet_core + LANG_01 hooks for preview + target-language translation rows for status
- Select All / Clear bar with count display
- Language auto-shown in assignment details header (mirrors filter — no duplicate picker)
- **Conflict warning**: `checkActiveDrafts()` runs before assigning; shows yellow warning with conflicting IDs + "Reassign anyway / Cancel"
- Assign button shows count + editor name dynamically

**Tab 2 — All Tasks**
- Status pills: All | Assigned | In Draft | In Review | Approved | Published | Overdue (live count, red when > 0)
- Editor dropdown + ID search; overdue rows highlighted; Publish only on Approved rows

**Tab 3 — Assign Roles** (global — to be replaced in Session 15)
- Checkbox role cards per user: Assigned / +Adding / -Removing state with permission lists

**New auth.js functions:** `loadSnippetsForAssignment`, `loadLessonsForAssignment`, `checkActiveDrafts`, `grantEditorialRole`, `revokeEditorialRole`

**New EditorPage.jsx globals:** `CsTag` component, `ROLE_CFG` constant

**Session 14 bash paths:** `fervent-youthful-shannon`
- IndiYatra: `/sessions/fervent-youthful-shannon/mnt/IndiYatra/`
- Outputs:   `/sessions/fervent-youthful-shannon/mnt/outputs/`

---

### Completed in Session 15 — Content-role architecture + All Tasks enhancements

**Session 15 bash paths:** `upbeat-affectionate-cerf`
- IndiYatra: `/sessions/upbeat-affectionate-cerf/mnt/IndiYatra/`
- Outputs:   `/sessions/upbeat-affectionate-cerf/mnt/outputs/`

#### New SQL file — `supabase/content_role_schema.sql` (run this — idempotent)

Must be run **once** in Supabase SQL Editor. Safe to re-run.

What it does:
1. Adds `ROLE_07 = Creator` to the `roles` table — the global editorial workspace role
2. Creates `content_role_assignments` table (per-content sub-roles)
3. RLS policies on `content_role_assignments`: own rows + Creators/Admins see all
4. Rewrites `get_editorial_role()` RPC — now checks ROLE_07 + sub_role in `content_role_assignments`
5. Rewrites `get_editorial_staff()` RPC — returns Creators with their sub_roles
6. Updates `content_drafts` RLS policies to use `content_role_assignments` instead of `user_roles_mapping`
7. Adds `drafts_delete` policy (was missing — blocked supervisor bulk delete)
8. Replaces `get_all_drafts()` with a version that **LEFT JOINs `content_role_assignments`** and returns `sub_role` per row (SECURITY DEFINER — bypasses RLS, always sees all rows)

**`content_role_assignments` schema:**
```sql
CREATE TABLE content_role_assignments (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type  text NOT NULL CHECK (content_type IN ('snippet_translation','lesson')),
  content_id    text NOT NULL,
  language_id   text,
  sub_role      text NOT NULL CHECK (sub_role IN ('editor','verifier','supervisor')),
  assigned_by   uuid REFERENCES profiles(id),
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, content_type, content_id, language_id, sub_role)
);
```

**New global role scheme (after this migration):**
```
ROLE_01  Admin       — full system access
ROLE_04  Learner     — default
ROLE_07  Creator     — access to editorial workspace
```
ROLE_02/05/06 (Editor/Supervisor/Verifier) are no longer used in `user_roles_mapping`.
Sub-roles (editor / verifier / supervisor) now live entirely in `content_role_assignments`.

**How to grant a user editorial workspace access:** In Supabase Table Editor → `user_roles_mapping`, insert `{ profile_id: <uuid>, role_id: 'ROLE_07' }`. Then assign per-content sub-roles via the Assign Tasks tab in the app.

#### auth.js additions (Session 15)
- `loadContentRoles(contentType, contentId, languageId)` — fetch sub_roles for a specific piece of content
- `assignContentRole(profileId, contentType, contentId, languageId, subRole)` — upsert into content_role_assignments
- `revokeContentRole(profileId, contentType, contentId, languageId, subRole)` — delete row
- `loadAllContentRoleAssignments()` — fetch all rows (used by supervisor dashboard)
- `deleteAssignment(draft)` — deletes the content_draft row AND the matching content_role_assignment row
- `checkActiveDrafts(contentIds, contentType, languageId)` — now accepts `languageId` to scope conflict check to one language (fixes false-positive conflict warning)

#### EditorPage.jsx changes (Session 15)
- **Assign Tasks tab**: merged user selector + role selector into a single card with one Assign button. Role dropdown (`assignSubRole` state) sits next to the user dropdown.
- **All Tasks tab**: added Type / Language / Role Assigned / Assigned To filter dropdowns + Content ID search. Added checkbox column + selection bar + bulk delete (calls `deleteAssignment` for each selected row). Added "Role Assigned" column.
- **Activity Log modal**: converted from slide-in panel to a centred `position: fixed` modal with `.ep-modal-backdrop` + Close button at bottom (fixes the modal appearing off-screen when ancestor has CSS `transform`).
- **Bug fix**: conflict warning false-positive — `checkActiveDrafts` now filters by `languageId` so assigning Bengali doesn't block Assamese for the same snippet.
- **Removed**: standalone "Assign Roles" tab. Role assignment is now inline with task assignment.

---

---

### Completed in Session 16 — Role column / Role filter fix

**Session 16 bash paths:** `affectionate-focused-hawking`
- IndiYatra: `/sessions/affectionate-focused-hawking/mnt/IndiYatra/`
- Outputs:   `/sessions/affectionate-focused-hawking/mnt/outputs/`

#### Root cause (confirmed and fixed)

`content_role_assignments` existed (0 rows) but ROLE_07 Creator was missing from the `roles` table — `content_role_schema.sql` section 1 had not landed. All existing drafts were assigned before the new assignment flow wrote to `content_role_assignments`, so `get_all_drafts()` returned `sub_role = NULL` for every row.

#### Fix applied

1. Re-ran `supabase/content_role_schema.sql` in Supabase SQL Editor (idempotent — added ROLE_07 Creator).
2. Granted the supervisor user ROLE_07 in `user_roles_mapping`.
3. Ran one-time backfill SQL to populate `content_role_assignments` for all 5 existing drafts with `sub_role = 'editor'`:
   ```sql
   INSERT INTO content_role_assignments
     (profile_id, content_type, content_id, language_id, sub_role, assigned_by)
   SELECT d.assigned_to, d.content_type, d.content_id, d.language_id, 'editor', d.assigned_by
   FROM content_drafts d
   WHERE d.assigned_to IS NOT NULL
   ON CONFLICT (profile_id, content_type, content_id, language_id, sub_role) DO NOTHING;
   ```
4. Verified: `COUNT(*) FROM content_role_assignments` = 8; `get_all_drafts()` returns `sub_role = 'editor'` for all rows.

#### Architecture confirmed — Creator + sub_role model

- **Creator (ROLE_07)** = global "access to editorial workspace" role assigned in `user_roles_mapping`
- **Sub-roles (editor / verifier / supervisor)** = per-content, assigned through the Assign Tasks tab → stored in `content_role_assignments`
- These two levels are intentionally separate: Creator = workspace access, sub_role = what the Creator can do on each specific piece of content
- Going forward, all new task assignments automatically write to both `content_drafts` AND `content_role_assignments`

#### Roles table state after Session 16

```
ROLE_01  Admin
ROLE_02  Editor       (legacy — no longer used in user_roles_mapping)
ROLE_03  Teacher
ROLE_04  Student
ROLE_05  Supervisor   (legacy — no longer used in user_roles_mapping)
ROLE_07  Creator      ← use this for all editorial workspace users
```

Note: ROLE_02/05 remain in the `roles` table but should not be assigned in `user_roles_mapping`. Use ROLE_07 Creator for all editorial staff going forward.

#### Previously noted bugs — status

- **Bug 1 (activeDraftIds not scoped to language):** The fix was already written into `EditorPage.jsx` during Session 15. Confirmed present in code — no action needed.
- **Bug 2 (role assignment must be per-content):** Fully resolved by the `content_role_schema.sql` + `content_role_assignments` architecture implemented in Session 15 and activated this session.

---

## 10. Completed in Session 20 — Mobile Icon Navigation Header

**Session 20 bash paths:** `epic-pensive-planck`
- IndiYatra: `/sessions/epic-pensive-planck/mnt/IndiYatra/`
- Outputs:   `/sessions/epic-pensive-planck/mnt/outputs/`

**Mobile header completely redesigned** — `src/components/PageHeader.jsx` rewritten twice this session.

#### Phase 1 — Hamburger menu (replaced)
Initial rewrite replaced the broken mobile nav tabs with a slide-in hamburger drawer containing all nav links + profile + settings + sign out. Body scroll lock, outside-tap-to-close, saffron border top bar in drawer. This was superseded in Phase 2.

#### Phase 2 — Icon navigation bar (final, in place)

The hamburger was replaced with a compact inline icon bar in the header. No drawer, no overlay — all navigation visible at a glance.

**Mobile header layout (≤768px):**
```
[Logo]  [▶]  [🏠]  [🔍]  [📊]  [♥]  [🔖]  [⚙]  [🔑?]  [✏?]  [avatar]
```

**Icon mapping (all inline SVG, no external library):**

| Icon | Nav target | Style |
|------|-----------|-------|
| Filled play triangle | Resume Yatra | Always saffron `#FF8E00` — only shown when `profile.last_visited_route` exists |
| House outline | Home | Grey → saffron on hover |
| Circle + magnifier line | Discover | Grey → saffron on hover |
| 3 filled bar-chart rects | Dashboard | Grey → saffron on hover |
| Heart outline | Likes | Grey → saffron on hover |
| Bookmark ribbon | Bookmarks | Grey → saffron on hover |
| Cog (circle + 8 spokes) | Settings | Grey → saffron on hover |
| Circle + shaft (key) | Admin | Heritage blue `#00509E` — conditional on `isAdmin` |
| Pencil stroke | Editor | Purple `#7B2D8B` — conditional on `userEditorialRole` |
| Avatar circle chip | Profile / sign-out | Saffron initial or photo; opens mini-dropdown |

**Desktop (>768px):** unchanged — text nav links + ⚙ gear + avatar dropdown.

**Key implementation details:**
- Icons are individual named components (`IcPlay`, `IcHome`, `IcSearch`, `IcChart`, `IcHeart`, `IcBookmark`, `IcSettings`, `IcKey`, `IcPencil`) using inline SVGs with a shared base props object `S` (20×20, stroke, strokeWidth:2, round caps/joins)
- Chart icon uses filled `<rect>` elements (3 bars at heights 9/14/18 units) — no stroke
- Play icon uses filled `<polygon>` — no stroke
- All other icons are stroke-based
- `LABEL_IC` map: `{ Home: IcHome, Discover: IcSearch, Dashboard: IcChart, Likes: IcHeart, Bookmarks: IcBookmark }` — navLinks iterated and mapped to icons automatically
- `IcBtn` wrapper component: 30×30px touch target, 7px border-radius, hover saffron tint
- `@media (max-width: 340px)`: icons compress to 26×26px and logo to 22px height for very narrow screens
- Mobile avatar chip (`.mob-av`, 28px circle) has its own mini-dropdown (`.mob-dd`) for Profile / Sign Out / Guest actions — uses shared `AvatarDropdown` inner component
- `hdr-desktop` / `hdr-mobile` utility classes control visibility at 768px breakpoint
- JSX validated with Babel parser ✓ — build passes (83 modules) ✓

**No changes needed to any page files** — PageHeader reads `navLinks`, `isAdmin`, `userEditorialRole`, `onResume` etc. from existing props; all pages continue to work unchanged.

**No SQL changes needed.**

---

### Completed in Session 16 (continued) — assignContentRole fix + Snippet Image Upload

#### assignContentRole 403 fix

**Root cause:** Supabase PostgREST evaluates RLS UPDATE policies even for upserts that result in a plain INSERT (no actual conflict). The `content_role_assignments` table had no UPDATE policy, so every `assignContentRole` call was rejected with 403.

**Fix:**
- Created `supabase/assign_content_role_rpc.sql` — a SECURITY DEFINER RPC `assign_content_role(p_profile_id, p_content_type, p_content_id, p_language_id, p_sub_role)` that does the INSERT internally, bypassing RLS. Checks `is_supervisor_or_admin()` internally.
- Updated `auth.js` `assignContentRole()` to call `supabaseClient.rpc("assign_content_role", {...})` instead of direct table insert.
- Updated `EditorPage.jsx` `handleAssign` to check and surface role-assignment errors (toast says "Assigned with N error(s) — check console").
- Gap-fill SQL (run as needed): backfills `content_role_assignments` for any `content_drafts` row that has no matching role row.

**SQL to run (once):** `supabase/assign_content_role_rpc.sql`

---

#### Snippet Image Upload — English only

**New feature:** English (LANG_01) snippet editors can upload a cover image directly in the DraftEditForm. The image is resized client-side to 400 px height (proportionate width), uploaded to Supabase Storage, and written to `asset_library` + `snippet_core.asset_id` when the supervisor publishes.

**Files changed:**
- `supabase/snippet_image_feature.sql` — **run this in Supabase SQL Editor:**
  1. Creates `snippet-images` storage bucket (public, 5 MB limit, jpeg/png/webp)
  2. Adds storage RLS policies (public read, editorial upload/update)
  3. Replaces `publish_draft()` RPC — extended to handle `image_file_path` in `draft_data`: if LANG_01 and `image_file_path` present, upserts `asset_library` row and sets `snippet_core.asset_id`
- `src/lib/auth.js` — two new exports:
  - `uploadSnippetImage(blob, snippetId)` — uploads resized JPEG Blob to `snippet-images` bucket, returns `{ url, error }`
  - `loadSnippetAsset(snippetId)` — returns current `{ asset_id, file_path, alt_text, attribution }` for a snippet (for preview on form open)
- `src/pages/EditorPage.jsx` DraftEditForm:
  - `isEnglish = draft.language_id === "LANG_01"` flag
  - Image state: `imageUrl`, `imageAlt`, `imageAttrib`, `imageUploading`, `existingImage`
  - `resizeImageTo400Height(file)` — Canvas API resize, outputs JPEG Blob at quality 0.88
  - `handleImageSelect(e)` — resize → upload → `setImageUrl` (auto on file pick)
  - Image section JSX rendered only when `isSnippet && isEnglish`
  - `buildDraftData()` includes `image_file_path`, `image_alt_text`, `image_attribution` when `imageUrl` is set
  - On mount, loads existing snippet asset for preview (`loadSnippetAsset`)

**draft_data JSON (English snippet, with image):**
```json
{
  "hook": "...", "explanation": "...",
  "image_file_path": "https://...supabase.../snippet-images/SNIP_00001/1234567890.jpg",
  "image_alt_text": "Stone Chariot at Hampi",
  "image_attribution": "Archaeological Survey of India"
}
```

**Flow:**
1. Editor (LANG_01 assignment) opens DraftEditForm → sees current image if one exists
2. Clicks "Choose Image" → picks file → client-side resize to 400 px height → auto-uploads to Supabase Storage → preview appears
3. Editor fills alt text + attribution → saves/submits draft
4. Supervisor approves → clicks Publish → `publish_draft` RPC:
   - If snippet already has `asset_id` → updates that `asset_library` row in place
   - If no `asset_id` → generates next `ASSET_XXXXX`, inserts into `asset_library`, sets `snippet_core.asset_id`

**SQL to run (once):** `supabase/snippet_image_feature.sql`

---

### Completed in Session 17 — Admin Full Editing + Excel Import

**Session 17 bash paths:** `affectionate-focused-hawking`
- IndiYatra: `/sessions/affectionate-focused-hawking/mnt/IndiYatra/`
- Outputs:   `/sessions/affectionate-focused-hawking/mnt/outputs/`

#### Task 6 — Admin page: full badge/token editing

**Problem:** The Badges tab only exposed an `is_active` toggle. Tokens tab was read-only.

**Changes to `src/lib/auth.js` (764 → 841 lines):**
- `adminUpdateBadge(badgeId, fields)` — updates any badge fields
- `adminAddBadge(fields)` — inserts a new badge row
- `adminDeleteBadge(badgeId)` — deletes a badge
- `adminAwardToken(profileId, tokenType, quantity)` — inserts into `user_tokens` with `source_type='manual_admin'`

**Changes to `src/pages/AdminPage.jsx` (788 → 1152 lines):**
- **Badges tab** — replaced card grid with a full edit table. All fields editable inline:
  `icon, badge_id, name, category (dropdown), criteria_type, criteria_value (number), description, sort_order, is_active, earned count`. Edit (✏) and Delete (🗑) actions per row. "+ Add Badge" button shows an inline add row at top of table.
- **Tokens tab** — added "Manually Grant Token" panel: user dropdown (all users), token type dropdown (tulsi/ashoka/lotus/peepal/banyan/dharma), quantity input, Award button. Table remains read-only (aggregated by type). Token table now shows all users who have any tokens.
- **New admin tab: Import** — see Task 7 below.

No SQL changes needed for badge/token editing (existing admin RLS policies cover inserts/updates/deletes).

---

#### Task 7 — Excel import for snippets, lessons, snippet-lesson mapping

**New dependency:** `xlsx` (SheetJS) — installed via `npm install xlsx`. Added to `package.json`.

**Changes to `src/lib/auth.js` (841 lines):**
- `adminImportSnippets(rows)` — bulk upsert to `snippet_core` (snippet_id, difficulty_level, snippet_value) and `snippet_translations` (LANG_01, all 7 text fields). Skips translation upsert if no translation columns present.
- `adminImportLessons(rows)` — bulk upsert to `lessons` (lesson_id, lesson_name, lesson_number, module_id, lesson_description).
- `adminImportMapping(rows)` — bulk upsert to `lesson_snippet_mapping` (lesson_id, snippet_id, order_index).

**Changes to `src/pages/AdminPage.jsx` (1152 lines):**
- Added `"Import"` to the `TABS` array (7th tab).
- Import tab UI:
  1. **"⬇ Download Template" button** — generates and downloads `indiyatra_import_template.xlsx` with 3 pre-populated sheets showing correct column names and example rows.
  2. **File picker** — accepts `.xlsx`/`.xls`. On file select, reads and parses with SheetJS. Only sheets named `Snippets`, `Lessons`, or `Mapping` are processed (others ignored).
  3. **Preview section** — one preview table per detected sheet, showing row count + first 5 rows.
  4. **"⬆ Import All Sheets" button** — upserts each sheet to its table, shows per-sheet results (count or error message).
- All imports are upserts (ON CONFLICT DO UPDATE) — safe to re-run; existing rows are updated, new rows inserted.

**Excel sheet column reference:**

| Sheet    | Required columns       | Optional columns                                                                     |
|----------|------------------------|--------------------------------------------------------------------------------------|
| Snippets | `snippet_id`           | `difficulty_level`, `snippet_value`, `hook`, `explanation`, `key_term`, `key_term_meaning`, `life_connection`, `quiz_recap`, `source_citation` |
| Lessons  | `lesson_id`            | `lesson_name`, `lesson_number`, `module_id`, `lesson_description`                   |
| Mapping  | `lesson_id`, `snippet_id` | `order_index`                                                                     |

**No SQL changes needed** — existing `admin_content_schema.sql` policies already cover INSERT/UPDATE on all three tables for `is_admin()` users.

**Unique constraints used for upsert:**
- `snippet_core`: `ON CONFLICT (snippet_id)`
- `snippet_translations`: `ON CONFLICT (snippet_id, language)`
- `lessons`: `ON CONFLICT (lesson_id)`
- `lesson_snippet_mapping`: `ON CONFLICT (lesson_id, snippet_id)`

---

### Completed in Session 18 — Token Catalogue, Admin Filters, Drag-reorder, Import Validation

**Session 18 bash paths:** `jolly-hopeful-allen`
- IndiYatra: `/sessions/jolly-hopeful-allen/mnt/IndiYatra/`
- Outputs:   `/sessions/jolly-hopeful-allen/mnt/outputs/`

---

#### A. Excel Import — Fuzzy matching + Dry-run validation + Reference sheet

**`src/lib/auth.js`** — new helpers added before `adminImportSnippetsFull`:

- `_lev(a, b)` — Levenshtein distance
- `_sim(a, b)` — similarity ratio (0–1)
- `_fuzzyLookup(needle, normMap, threshold=0.8)` — returns `{ id, matchedNorm, score, type:"exact"|"fuzzy" }` or null. Caches fuzzy hits back into normMap so repeated typos are O(1).

`adminImportSnippetsFull` updated: all 6 text lookups (language, course, level, theme, module, lesson) use `_fuzzyLookup`. New `fuzzyMatches` counter in stats.

New export `adminDryRunImport(rows)` — loads all lookup tables, resolves every unique value per field, returns:
```js
{
  resolutions: { language, course, level, theme, module, lesson },
  // each: { [originalValue]: { type, id, resolvedTo, score } }
  rowIssues: [ { rowNum, englishHook, status:"ok"|"warn"|"error", issues[] } ],
  counts: { total, ok, warn, error }
}
```
CAN_CREATE logic: language=false (error if not found), course/level/theme/module/lesson=true (will create).

**`src/pages/AdminPage.jsx`** — Import tab UI updated:
- **Validate** button runs `adminDryRunImport`, shows resolution table per field + per-row status
- **Import** button only appears after a clean validation pass
- Template download adds a **Reference** sheet with live DB data (languages, levels, courses)

---

#### B. Admin Content Tab — Filters

New state: `refData` (levels, themes, modules, lessons — loaded once on Content tab open), `moduleFilter`, `lessonFilter`, `snippetFilter`.

- **Modules** tab: Course / Level / Theme dropdowns
- **Lessons** tab: Module dropdown  
- **Snippets** tab: Lesson dropdown

`loadContent(sub, fMod, fLes, fSnip)` now takes explicit filter args to avoid React stale-closure issue. All onChange handlers pass new filter value immediately: `const f = {...moduleFilter, course: v}; setModuleFilter(f); loadContent("Modules", f, lessonFilter, snippetFilter)`.

---

#### C. Admin Tokens Tab — Individual row editing

`adminGetTokensRaw()`, `adminUpdateTokenRow(id, fields)`, `adminDeleteTokenRow(id)` added to `auth.js`.

Tokens tab Award Records section showed individual `user_tokens` rows with inline edit (token_type, quantity, source_type, source_id) and delete — matching the Badges tab pattern.

**NOTE:** Award Records section subsequently **removed** at user request. Tokens tab now shows only the Token Catalogue section (see D below) and the Grant New Token panel.

---

#### D. Admin Content Tab — Drag-and-Drop Reorder

`adminSaveOrder(type, items, auxId)` added to `auth.js`:
- `type "modules"` → updates `modules.module_number`
- `type "lessons"` → updates `lessons.lesson_number`
- `type "snippets"` → updates `lesson_snippet_mapping.order_index` scoped to `auxId` (lesson_id)

`canReorder` logic: `["Modules","Lessons"].includes(contentSub) || (contentSub === "Snippets" && !!snippetFilter.lesson)`

HTML5 drag-and-drop: `⠿` handle in each row. Drag updates optimistic local state immediately, then persists to DB via `adminSaveOrder`. `dragSaving` state shows "Order saved ✓" or error.

`renderEditForm` / `renderAddForm` take `extraCols` param to fix colSpan when drag column is present.

---

#### E. Token Catalogue — New DB table + Admin CRUD

**New SQL file: `supabase/tokens_catalogue.sql`** — run in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS tokens (
  token_type    TEXT PRIMARY KEY,
  token_name    TEXT NOT NULL,
  token_icon    TEXT NOT NULL DEFAULT '🪙',
  description   TEXT,
  earn_trigger  TEXT,   -- "lesson","module","theme","level","course","points"
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tokens_public_read" ON tokens FOR SELECT USING (true);
```

Seeds 6 rows: tulsi / ashoka / lotus / peepal / banyan / dharma.

Optional FK from `user_tokens.token_type → tokens.token_type` is commented out — uncomment when ready for referential integrity.

**`src/lib/auth.js`** — 4 new exports:
- `adminGetTokenCatalogue()` — SELECT all from tokens ordered by sort_order
- `adminAddTokenType(fields)` — INSERT new row
- `adminUpdateTokenType(tokenType, fields)` — UPDATE by PK
- `adminDeleteTokenType(tokenType)` — DELETE by PK

**`src/pages/AdminPage.jsx`** Tokens tab — two sections:
1. **Token Catalogue** — full CRUD table: icon, token_type (PK, read-only in edit), name, earn_trigger, description, sort_order, is_active toggle. Inline edit, delete (with confirm), + Add Type row.
2. **Grant New Token** panel — user dropdown, token type dropdown (from DB catalogue, falls back to hardcoded if catalogue empty), quantity, Award button.

Hardcoded `TOKEN_TYPES` constant and three `["tulsi","ashoka","lotus","peepal","banyan","dharma"]` arrays replaced with `tokenCatalogue.map(...)`.

**`src/lib/awards.js`** — hardcoded `TOKEN_TYPE` map removed. Replaced with:
```js
async function _getTriggerMap() {
  // fetches tokens table, builds { earn_trigger → token_type } map
  // cached 5 min; falls back to hardcoded defaults if DB unavailable
}
```
`awardForLessonComplete` now calls `await _getTriggerMap()` and uses the result instead of the static object.

---

#### F. New SQL files summary (Session 18)

| File | Status | Action |
|------|--------|--------|
| `supabase/tokens_catalogue.sql` | ✅ Written | Run in Supabase SQL Editor |
| `supabase/asset_library_rls.sql` | ⚠️ Written + run | Did NOT fix image loading — see pending bug |

---

#### G. user_tokens FK constraint note

`tokens_and_badges_refine.sql` has a CHECK constraint on `user_tokens.token_type` that only allows the original 6 values: `CHECK (token_type IN ('tulsi','ashoka','lotus','peepal','banyan','dharma'))`. If new token types are added via the Token Catalogue admin UI, this constraint will block inserts until it is dropped or extended:

```sql
ALTER TABLE user_tokens DROP CONSTRAINT user_tokens_token_type_check;
-- Or replace with a FK reference to tokens(token_type)
```

Run this in Supabase SQL Editor before using custom token types in production.


---

### Completed in Session 19 — Image bug confirmed, Comments feature, Gateway page

**Session 19 bash paths:** `nice-gifted-wozniak`
- IndiYatra: `/sessions/nice-gifted-wozniak/mnt/IndiYatra/`
- Outputs:   `/sessions/nice-gifted-wozniak/mnt/outputs/`

---

#### Image bug — RESOLVED

The `asset_library_rls.sql` from Session 18 **did** fix the problem. Confirmed via direct Supabase API calls at session start:
- `asset_library` has 24 rows, readable via anon key ✓
- `courses`, `themes`, `modules`, `snippet_core` all have populated `asset_id` values ✓
- Image URLs (`https://indiyatra.in/wp-content/uploads/...`) return HTTP 200 ✓
- All other queries (`site_settings`, `snippet_translations`, `get_course_learner_counts`) return valid data ✓

The HANDOFF from Session 18 was written before the fix propagated. No code changes were needed.

---

#### Comments feature (Feature I) — COMPLETE

Per-snippet comments with bottom-sheet UI. Both signed-in and anonymous (guest) users can post.

**SQL files (run in this order if not already run):**
1. `supabase/snippet_comments.sql` — creates table + 3 base policies. Run first.
2. `supabase/snippet_comments_policies_v2.sql` — adds admin delete + user edit policies. Run this if you already ran the first file (avoids duplicate-policy error).

**`snippet_comments` table schema:**
```sql
snippet_comments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snippet_id  text NOT NULL,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name   text,
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at  timestamptz NOT NULL DEFAULT now()
)
```
Index: `(snippet_id, created_at DESC)`. RLS: public SELECT, auth INSERT (own row), own DELETE, own UPDATE (edit), admin DELETE (ROLE_01).

**`src/lib/auth.js` — 4 new exports:**
- `postComment(userId, snippetId, body, userName)` — inserts a row, returns the new row via `.select().single()`
- `deleteComment(commentId)` — own-row delete (RLS enforced)
- `adminDeleteComment(commentId)` — same call, relies on `comments_delete_admin` RLS policy (ROLE_01 only)
- `editComment(commentId, newBody)` — UPDATE body, returns updated row

**`src/pages/SnippetPlayer.jsx` — changes:**
- Comment button (💬) enabled — was `disabled` with `cursor: not-allowed`. Now calls `openComments(snip.snippet_id)` on click.
- New state: `commentDraft`, `commentPosting`, `editingCommentId`, `editDraft`
- New imports: `postComment`, `deleteComment`, `adminDeleteComment`, `editComment` from auth.js
- `useAuthContext()` now also destructures `profile` and `onSignIn` (was just `user`)
- Comments load **oldest-first** (`created_at.asc`) for natural conversation flow
- Comments sheet footer:
  - **Authenticated user (signed-in or guest)**: textarea with 500-char limit + Post button. Enter (without Shift) submits. Char counter shown.
  - **Unauthenticated visitor**: "Sign in or continue as Guest" prompt with Sign in button (calls `onSignIn`)
- Per-comment actions (in `comment-author-row`):
  - **Own comment**: ✏ edit button → inline textarea pre-filled with current text + Save/Cancel. Save disabled until text changes.
  - **Own comment OR admin (ROLE_01)**: ✕ delete button. Admin uses `adminDeleteComment`, owner uses `deleteComment`.
- All mutations are optimistic (local state updates immediately, DB write is fire-and-forget result-checked)
- `isAdmin = false` added to SnippetPlayer prop destructuring (receives it via `commonProps`)
- Comment count on the 💬 button updates optimistically after post/delete

---

#### GatewayPage — COMPLETE

First-visit landing experience. Shows most-liked snippet in full with 5 learning path choice cards.

**New file:** `src/pages/GatewayPage.jsx`

**When it shows:**
- Only on first-ever visit. Tracked via `localStorage.getItem("indiyatra_visited")`.
- Flag is set immediately in a `useEffect` that fires once `authLoading` becomes `false`.
- Check: `if (!user && !localStorage.getItem("indiyatra_visited"))` → show gateway.
- Signed-in users and returning visitors never see it (auth redirect to Dashboard still fires).
- **To re-test:** run `localStorage.removeItem("indiyatra_visited"); location.reload();` in the browser console.

**Snippet preview:**
- Loads most-liked snippet: `snippet_core ORDER BY like_count DESC LIMIT 1`
- **Always English** (`language=eq.eng`) regardless of user's language setting — gateway is a first-impression feature
- Shows all 7 fields: hook, explanation, key term + meaning, life connection, refresher questions, source citation
- Full image at natural proportions (no fixed height crop)
- "Swipe through more snippets →" button launches the pre-loaded pool (60 snippets, shuffled) as a SnippetPlayer playlist

**5 learning path choice cards:**
| Card | Action |
|------|--------|
| 📚 Follow a Course | `setPage("home")` — lands on course grid |
| 🧭 Explore Your Interests | `goForward("discover")` — DiscoverPage |
| ❤️ Most Liked | `snippet_core ORDER BY like_count DESC LIMIT 20` → playlist |
| 🔖 Most Saved | Aggregates `bookmarks WHERE content_type='snippet'` client-side → top-20 playlist |
| 🎲 Surprise Me | Fetches 60 snippet IDs, shuffles, takes 20 → playlist |

**Gateway playlists:** `playlistSource = "gateway"` → Back button returns to `setPage("home")` (not Discover).

**`src/App.jsx` changes:**
- `import GatewayPage from "./pages/GatewayPage"` added
- `page` initial state stays `"home"` — no synchronous localStorage check (avoids flash for signed-in users)
- New `useEffect([authLoading])`: fires once auth resolves, shows gateway for unauthenticated first-timers
- Existing returning-user redirect (`profile?.last_visited_route`) also checks `page === "gateway"` so logged-in users skip it
- `handlePlayFromGateway(snippetIds, label)` — sets `playlistSource="gateway"`, navigates to player
- `onBackToDiscover` prop in SnippetPlayer render now handles `playlistSource === "gateway"` → `setPage("home")`
- `case "gateway"` added to `renderPage` switch, just before `default`


---

## 11. Pending Work — Session 21

**Start prompt for Session 21:**
> Read the HANDOFF.md. Session 20 is done. Resume with the pending work below.

---

**Priority order:**

1. **Dashboard mobile cleanup** — two remaining items (Resume button correctly stays in hero after refactor):
   - **Pills in one scrollable row** — "All Courses", "Gujarati", "T Large" pills currently wrap to 2 rows on mobile. Wrap `.dash-action-bar` in `overflow-x: auto; flex-wrap: nowrap` at ≤768px.
   - **Add subtitle** under the welcome title — one muted line ("Continue your learning journey" or a live stat like "🔥 N-day streak") to fill the visual gap between `.dash-title` and the action bar.

2. **P — Visual polish** (deferred from Session 19):
   - Replace grey body text (#666, #777, #888, #aaa) with near-black (#1a1a2e or #333) across all pages
   - Colour reduction — 2-accent-per-block rule; strip decorative colour from body text
   - Emoji → SVG icon refresh in headings, stat cards, forest tokens, badges
   - Start with DashboardPage (most icon/colour-dense), then HomePage

3. **EditorView / VerifierView enhancements**: ✅ DONE (Session 21) — see Section 11 below.

4. **Pre-launch tasks (PL-1, PL-2)**: centralise UI copy + icons/assets. Do last.

### Completed in Session 21 — EditorView / VerifierView sub_role column

**SQL file:** `supabase/drafts_with_subrole.sql` — run in Supabase SQL Editor.

Replaces `get_my_drafts()` and `get_review_queue()` RPCs to LEFT JOIN `content_role_assignments` on `(profile_id = auth.uid(), content_type, content_id, language_id)` and return an additional `sub_role text` column. Uses `IS NOT DISTINCT FROM` for null-safe language_id comparison.

**EditorPage.jsx changes:**
- New `SubRoleBadge({ role })` component — reuses `SUB_ROLE_CFG` colour map; renders a pill with background/colour matching the role (Editor: blue, Verifier: purple, Supervisor: green); shows "—" when null.
- **EditorView** ("My Tasks" table): added **Role** column between Language and Status.
- **VerifierView** ("Review Queue" table): added **Role** column between Editor and Status.

**Session 21 bash paths:** `wizardly-eager-feynman`
- IndiYatra: `/sessions/wizardly-eager-feynman/mnt/IndiYatra/`
- Outputs: `/sessions/wizardly-eager-feynman/mnt/outputs/`

---

### Completed in Session 22 — Bottom tab bar navigation + active-tab fix

**Session 22 bash paths:** `busy-sharp-curie`
- IndiYatra: `/sessions/busy-sharp-curie/mnt/IndiYatra/`
- Outputs: `/sessions/busy-sharp-curie/mnt/outputs/`

#### Bottom tab bar — mobile navigation refactor (DONE)

`src/components/PageHeader.jsx` completely redesigned for mobile:

**Mobile layout (≤768px):**
- **Header:** Logo + Avatar chip only (no nav icons)
- **Fixed bottom bar:** 5 primary tabs — Home · Discover · Dashboard · Likes · Bookmarks — each with inline SVG icon + label
- **Avatar dropdown (mobile):** Profile · Resume Yatra (if applicable) · Settings · Admin (if admin) · Editor (if editorial role) · Sign Out / Guest actions

**Desktop (>768px):** unchanged — text nav links + ⚙ gear + avatar dropdown.

**Active tab highlighting:**
- Active tab: saffron fill pill (background #FF8E00, white icon + label)
- Hover (inactive): saffron outline border (border-color #FF8E00, saffron icon + label)
- Default: grey (#888) icon + label

**`activePage` prop wiring (DONE):**
- `activePage` set in `commonProps` in App.jsx (= current `page` state string)
- `PAGE_TO_TAB` map in PageHeader: `{ home/course/modules/lessons/player → "Home", discover → "Discover", dashboard → "Dashboard", likes → "Likes", bookmarks → "Bookmarks" }`
- All 10 pages now destructure `activePage` and pass `activePage={activePage}` to `<PageHeader>` — previously missing, causing active tab to never highlight

**Pages updated:** HomePage, DashboardPage, LikesPage, BookmarksPage, DiscoverPage, CoursePage, ModulesPage, LessonsPage, AdminPage, EditorPage, SettingsPage

**Resume Yatra:** Play icon removed from mobile header. Resume button remains in DashboardPage hero (`dash-resume-btn`). Resume Yatra also accessible via avatar dropdown on mobile.

**No SQL changes needed.**

#### Profile dropdown standardisation (DONE)

`src/components/PageHeader.jsx` — AvatarDropdown replaced by `ProfileDropdown` component. Identical on desktop and mobile.

**Profile dropdown contents (in order):**
1. **Display name** — label showing signed-in name or "Browsing as Guest"
2. **Edit Profile** — button → `auth.onProfile()` (opens ProfileModal). Hidden for guests.
3. **Text Size** — 3 inline buttons: Small / Medium / Large. Active = saffron fill. Calls `onSaveSettings({...settings, fontSize: key})`.
4. **Language** — scrollable list of languages from DB. Active = saffron + checkmark. Calls `onSaveSettings({...settings, languageId, languageCode, languageName})`.
5. **Settings** — button → `onOpenSettings()` (navigates to SettingsPage for custom messages etc.)
6. **Sign Out** / **Leave Guest Session** / **Create Account** for guests.

**Removed from dropdown:** Resume Yatra, Admin, Editor. Admin and Editor remain as text links in the desktop header nav only.

**Removed from desktop header:** ⚙ gear button (Settings is now in the profile dropdown).

**Dashboard hero action bar simplified:** removed language pill and font size pill. Now contains only: Resume Yatra button + Course scope pill (flat flex row, no left/right groups).

**Props threaded through all pages:** `onSaveSettings`, `languages` added to `commonProps` in App.jsx. All 11 pages now destructure and forward `settings`, `onSaveSettings`, `languages` to `<PageHeader>`.

**No SQL changes needed.**

#### Dashboard hero subtitle (DONE)

`DashboardPage.jsx` — subtitle line added between `.dash-title` and `.dash-action-bar`.

**Logic (`subtitleText`):**
- `currentStreak >= 2` → `🔥 N-day streak — keep it going!`
- `currentStreak === 1` → `🔥 Streak started — come back tomorrow!`
- `currentStreak === 0` + `activeDays > 0` → `You've been active N day(s) this month`
- `currentStreak === 0` + `activeDays === 0` → `Continue your learning journey`

`currentStreak` computed from `streakData` (index 59 = today): count backwards from today (or yesterday if today is empty) while days are non-zero.

CSS: `.dash-subtitle` — `font-size: 0.9375rem; color: #888;` — Source Sans 3, weight 400.

#### PageHeader rewrite — Option B desktop nav + mobile icons + 1024px breakpoint (DONE)

`src/components/PageHeader.jsx` rewritten. Babel-validated (no syntax errors).

**Desktop (>1024px) nav — icon + text on all links:**
- 5 primary nav links (Home/IcHome, Dashboard/IcChart, Discover/IcSearch, Likes/IcHeart, Bookmarks/IcBookmark) — each renders `<Ic /> Label` via `LABEL_IC` map
- Active link: saffron text + saffron icon (`.hdr-nav-link.active`)
- Thin vertical divider `hdr-nav-sep` after Bookmarks, shown only when any of Resume/Admin/Editor appear
- **Resume Yatra** (`hdr-nav-resume`, saffron) — conditional on `hasResume = onResume && !isGuest && profile?.last_visited_route`
- **Admin** (`hdr-nav-admin`, heritage blue) — conditional on `isAdmin && onAdmin`
- **Editor** (`hdr-nav-editor`, purple) — conditional on `userEditorialRole && onEditor`
- Nav flex container: `flex:1; overflow-x:hidden` to prevent logo/avatar overlap

**Mobile/Tablet (≤1024px) header — logo + conditional icons + avatar:**
- **Logo** — always shown (left)
- **▶ Play** (`mob-icon-btn saffron`) — only when `hasResume`
- **🔑 Key** (`mob-icon-btn blue`) — only when `isAdmin && onAdmin`
- **✏ Pencil** (`mob-icon-btn purple`) — only when `userEditorialRole && onEditor`
- Standard user with no route: Logo + Avatar only (no icon buttons)
- Icon buttons wrapped in `.mob-header-icons`, shown only when at least one applies
- **Avatar chip** — opens profile dropdown (unchanged)

**Breakpoint change:** 768px → 1024px
- `@media (max-width: 1024px)` hides `.hdr-desktop`
- `@media (min-width: 1025px)` hides `.hdr-mobile`
- Bottom tab bar (`btm-nav`) also uses `.hdr-mobile` so it hides on desktop ≥1025px

**Logo constraints added:**
- `.header-logo img { max-height: 36px; max-width: 140px; width: auto; height: auto; }`

**IcPlay SVG added:**
- Solid filled triangle polygon — `fill="currentColor" stroke="none"`

**No changes to:** bottom tab bar logic, profile dropdown, App.jsx, page files, SQL.

---

**Lower priority (deferred):**
- `user_tokens` FK constraint: drop `CHECK (token_type IN (...))` on `user_tokens` before using custom token types in production (see Session 18 note G)
- Discover page taxonomy seed: run `supabase/taxonomy_seed.sql` to populate `content_taxonomy_mapping`

- 5 primary nav links (Home/IcHome, Dashboard/IcChart, Discover/IcSearch, Likes/IcHeart, Bookmarks/IcBookmark) — each renders `<Ic /> Label` via `LABEL_IC` map
- Active link: saffron text + saffron icon (`.hdr-nav-link.active`)
- Thin vertical divider `hdr-nav-sep` after Bookmarks, shown only when any of Resume/Admin/Editor appear
- **Resume Yatra** — conditional on `hasResume = onResume && !isGuest && profile?.last_visited_route`
- **Admin** (`hdr-nav-admin`, heritage blue) — conditional on `isAdmin && onAdmin`
- **Editor** (`hdr-nav-editor`, purple) — conditional on `userEditorialRole && onEditor`

**Mobile/Tablet (≤1024px) header:** Logo + conditional quick-action icons (Resume ▶, Admin 🔑, Editor ✏) + avatar only. Bottom tab bar has the 5 primary nav tabs.

**Breakpoint:** 768px → 1024px across all components.

**Lower priority (deferred):**
- `user_tokens` FK constraint: drop `CHECK (token_type IN (...))` on `user_tokens` before using custom token types in production (see Session 18 note G)
- Discover page taxonomy seed: run `supabase/taxonomy_seed.sql` to populate `content_taxonomy_mapping`

---

### Completed in Session 23 — Brand Book Audit, Mobile Fixes, Pre-Launch Prep

**Session 23 bash paths:** `sweet-hopeful-johnson`
- IndiYatra: `/sessions/sweet-hopeful-johnson/mnt/IndiYatra/`
- Outputs:   `/sessions/sweet-hopeful-johnson/mnt/outputs/`

---

#### Brand Book — Colour Rule Fixes

The app had drifted from the approved palette. The full audit and fix sweep enforces:
- **Approved colours:** SAFFRON `#FF8E00`, GREEN `#00924A`, HERITAGE `#00509E`
- **Off-brand colours eliminated:** Gold `#D4A017`, Purple `#7B2D8B`, parchment tones (`#FFFDF5`, `#FFF8F0`, `#e8ddd0`), grey body text (`#888`, `#777`, `#666`, `#555`, `#aaa`)
- **One brand colour per block rule:** each card/section uses off-white background (`white` or `#F8F8F6`) + exactly one accent colour

**`src/pages/DashboardPage.jsx`:**
- `.forest-dharma` token colour fixed: `background: rgba(255,142,0,0.10); border: 1px solid rgba(255,142,0,0.30); color: ${SAFFRON};`
- `.badge-card` fixed: `background: white; border: 1px solid rgba(0,0,0,0.08);`
- Added `.stat-ghost` class for the phantom 6th stat card (transparent, no shadow, pointer-events none)
- Ghost 6th stat card added to JSX: `<div className="stat-card stat-ghost" aria-hidden="true" />`

**`src/pages/HomePage.jsx` — course card one-colour fix:**
- `.card-stat` pills: changed from Green to Saffron accent
- `.card-lang-badge.available`: changed from Green to Saffron
- "Explore →" button: added `btn-saffron` class override (was Green)

**`src/components/PageHeader.jsx` — purple purge:**
- `const PURPLE` changed from `"#7B2D8B"` to `"#00509E"` (Heritage Blue)
- `.hdr-nav-editor`, `.mob-icon-btn.purple`: all updated to use `#00509E`

**`src/pages/EditorPage.jsx` — parchment / grey purge (41 changes):**
- `#e8ddd0` borders → `rgba(0,0,0,0.10)` (8 instances)
- `#fafaf8` / `#fafafa` / `#f5f5f5` → `white` or `#F8F8F6`
- `#888` → `#6B7280`, `#666` → `#374151`, `#555` → `#374151`

**`src/pages/GatewayPage.jsx` — crash fix:**
- `PARCHMENT` constant was removed from `supabase.js` but GatewayPage still imported it, causing a runtime crash
- Fix: removed `PARCHMENT` from import, replaced `${PARCHMENT}` with `#F8F8F6`

---

#### DashboardPage — Tabler Icons (emoji → vector icon refresh)

Tabler Icons webfont added to `index.html`:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
```

STATS array icons: `"✦"` → `ti-diamond`, `"📖"` → `ti-book-2`, `"🏆"` → `ti-trophy`, `"📚"` → `ti-book-2`, `"♥"` → `ti-heart`.

Section title icons: 🔥 → `ti-flame`, 🌿 → `ti-trees`, 🏅 → `ti-trophy`, 🔗 → `ti-share`, scope pill 📚 → `ti-books`.

---

#### DashboardPage — Mobile Responsive Fixes

Two new mobile-only JSX blocks replace overflow-x tables on `≤600px` screens.

**Activity stack** (`.act-stack`): colour-coded pill rows per day (green = lessons, saffron = dharma).

**Progress stack** (`.prog-stack`): full-width progress bars per course/theme with percentage labels.

`@media (max-width: 600px)`: hides table wrappers, shows stack components, hides `.forest-token-sub`.

**DashboardPage imports from appStrings:**
- `DEFAULT_SHARE_MSG` and `FOREST_TOKEN_DEFS` (filters out dharma token for tree display)

---

#### PageHeader — Narrow Desktop Nav Crowding Fix (1025–1280px)

Nav link text wrapped in `<span className="hdr-nav-text">` and hidden at 1025–1280px (icon-only mode).
Padding reduced on nav links at that range to prevent logo/avatar overlap.

---

#### SnippetPlayer + App.jsx — Fixed Position Bottom Nav Bug

**Root cause:** `animation-fill-mode: both` on the page transition wrapper kept `transform: translateX(0)` applied after animation end — creating a new CSS containing block that broke `position: fixed` for the bottom nav on Likes/Bookmarks pages.

**Fix in `src/App.jsx`:**
- Removed `transform: translateX(0)` from `to` keyframe of `pageSlideInRight` and `pageSlideInLeft`
- Changed `animation-fill-mode` from `both` to `backwards`

**Exception fix in `src/pages/SnippetPlayer.jsx`** (file re-locked after this):
- `@media (max-width: 480px) { .player-nav { padding: 10px 1rem; bottom: 0; } }` (was `bottom: 58px`)

---

#### New Files (Pre-Launch Prep)

**`src/config/appStrings.js`** — centralised UI copy:
- Re-exports `LEVEL_LABELS`, `VISIBILITY_BADGE`, `DIFFICULTY_STARS` from `../lib/supabase`
- `APP_NAME`, `APP_TAGLINE`, `APP_SHARE_LOGO`, `DEFAULT_SHARE_MSG`, `DEFAULT_SNIPPET_SHARE_MSG`
- `SIGNIN` object: sign-in gate messages (likes, bookmarks, share, guest, settingsSync)
- `EMPTY` object: empty-state messages for all pages
- `FOREST_TOKENS`: 6 token definitions (type, name, icon, colour, description)
- `FOREST_TOKEN_TYPES`: same without sub-labels (for AdminPage dropdowns)

**`src/config/assets.js`** — centralised asset URLs:
- Re-exports `logoUrl` from `../lib/supabase`
- `SITE_URL = "https://indiyatra.in"`, `SITE_DOMAIN = "indiyatra.in"`, `OG_IMAGE_URL`

**`src/components/Icons.jsx`** — shared inline SVG icon components:
- Named exports: `IconBookmark`, `IconBookmarkFilled`, `IconHeart`, `IconHeartFilled`, `IconShare`, `IconPlay`, `IconExternalLink`
- Each accepts `size` (default 20), `color` (default "currentColor")

**Wired into pages:**
- `SettingsPage.jsx`: imports `DEFAULT_SHARE_MSG`, `DEFAULT_SNIPPET_SHARE_MSG` from appStrings
- `AdminPage.jsx`: imports `FOREST_TOKEN_TYPES` from appStrings; replaces hardcoded `TOKEN_TYPES`

---

#### Updated Design System

| Constant | Hex | Status |
|----------|-----|--------|
| SAFFRON | `#FF8E00` | ✅ Active |
| GREEN | `#00924A` | ✅ Active |
| HERITAGE | `#00509E` | ✅ Active (also replaces Purple) |
| PURPLE `#7B2D8B` | — | ❌ Retired |
| GOLD `#D4A017` | — | ❌ Retired |
| PARCHMENT `#FFFDF5` | — | ❌ Retired — use `#F8F8F6` or `white` |

**One-colour-per-block rule:** every card/section uses off-white background + exactly one accent. Never two brand colours in the same card.

---

## 12. Pending Work — After Session 23

### Infrastructure (run before launch)

1. **Run `supabase/taxonomy_seed.sql`** in Supabase SQL Editor — seeds `content_taxonomy_mapping` so Discover page shows tagged content
2. **Drop `user_tokens` type check constraint:**
   ```sql
   ALTER TABLE user_tokens DROP CONSTRAINT user_tokens_token_type_check;
   ```
3. **Confirm all SQL migrations applied** — use `supabase/check_migrations.sql` to verify

### Locked files
The following files must NOT be modified without explicit user approval:
- `src/pages/SnippetPlayer.jsx` — **LOCKED** (exception used and closed in Session 23)
- `src/pages/CoursePage.jsx` — locked
- `src/pages/ModulesPage.jsx` — locked
- `src/pages/LessonsPage.jsx` — locked

### Phase II (post-launch)
- Twitter/X OAuth: raise Supabase support ticket
- Module sharing across courses: junction table
- UUID migration: replace text PKs
- Server-side badge/token awarding: DB trigger
- Deep-link URLs: React Router

---

## 13. Session Mount Paths

| Session | Workspace name | IndiYatra path |
|---------|----------------|----------------|
| 5 | zen-bold-fermat | /sessions/zen-bold-fermat/mnt/IndiYatra/ |
| 6 | dreamy-laughing-cerf | /sessions/dreamy-laughing-cerf/mnt/IndiYatra/ |
| 7 | busy-lucid-turing | /sessions/busy-lucid-turing/mnt/IndiYatra/ |
| 8 | elegant-upbeat-euler | /sessions/elegant-upbeat-euler/mnt/IndiYatra/ |
| 9 | bold-serene-pascal | /sessions/bold-serene-pascal/mnt/IndiYatra/ |
| 10 | clever-eager-archimedes | /sessions/clever-eager-archimedes/mnt/IndiYatra/ |
| 11-13 | upbeat-sleepy-franklin | /sessions/upbeat-sleepy-franklin/mnt/IndiYatra/ |
| 14 | fervent-youthful-shannon | /sessions/fervent-youthful-shannon/mnt/IndiYatra/ |
| 15 | upbeat-affectionate-cerf | /sessions/upbeat-affectionate-cerf/mnt/IndiYatra/ |
| 16 | affectionate-focused-hawking | /sessions/affectionate-focused-hawking/mnt/IndiYatra/ |
| 20 | epic-pensive-planck | /sessions/epic-pensive-planck/mnt/IndiYatra/ |
| 21 | wizardly-eager-feynman | /sessions/wizardly-eager-feynman/mnt/IndiYatra/ |
| 22 | busy-sharp-curie | /sessions/busy-sharp-curie/mnt/IndiYatra/ |
| 23 | sweet-hopeful-johnson | /sessions/sweet-hopeful-johnson/mnt/IndiYatra/ |
