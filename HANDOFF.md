# IndiYatra — Session Handoff Document
**Last updated:** May 18, 2026 (Session 5 — fully complete)
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
| GOLD        | `#D4A017` | Badges (dashboard only)      |

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
├── App.jsx                  ~390 lines — router, page state, AuthContext.Provider, lessonProgress Map, handleSnippetAdvance
├── contexts/
│   └── AuthContext.jsx       5 lines   — AuthContext + useAuthContext() hook
├── lib/
│   ├── supabase.js           39 lines  — raw fetch helper (anon key only) + shared constants
│   └── auth.js               ~115 lines — Supabase SDK client + auth helpers + loadCompletions/saveCompletion/updateLastVisited/loadLessonProgress/upsertLessonProgress/deleteLessonProgress
├── styles/
│   └── global.js             — globalStyles string (shared CSS)
├── hooks/
│   ├── useSettings.js        — loadSettings / saveSettings
│   └── useAuth.js            — reactive auth hook (user, profile, authLoading, refreshProfile)
├── components/
│   ├── PageHeader.jsx        ~155 lines — auth-aware header
│   ├── SettingsDrawer.jsx    — language / font / theme settings panel
│   ├── AuthModal.jsx         — sign-in modal (Google + email + guest)
│   └── ProfileModal.jsx      — display name editor
└── pages/
    ├── HomePage.jsx          208 lines  — course cards grid
    ├── CoursePage.jsx        297 lines  — level tabs + theme list
    ├── ModulesPage.jsx       242 lines  — module list for a theme
    ├── LessonsPage.jsx       147 lines  — lesson list for a module
    ├── SnippetPlayer.jsx     ~955 lines — main content player (edit cautiously — see gotchas)
    └── DashboardPage.jsx     ~590 lines — learner dashboard (real data wired; inline dropdowns for language/font)
```

---

## 4. Navigation / Routing

App.jsx uses a `page` state string with `goForward()` / `goBack()` helpers (no React Router).

Page flow: `home → course → modules → lessons → player ↕ dashboard`

`commonProps` spread onto every page: `settings`, `onOpenSettings`, `onDashboard`

Header nav links (same on every page): Home · Discover · Dashboard

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

## 6. Pending Work

### Dashboard — immediate next items

**A. Dashboard quick-action pills — DONE (Session 4)**
- `🌐 English` pill → inline dropdown listing all languages from DB. Applies immediately, updates pill label, closes on pick. ✓
- `T Medium` pill → inline dropdown with Small / Medium / Large. Same behaviour. ✓
- `🔓 Unlock All` pill → **removed from UI and dropped from `profiles` table** (`ALTER TABLE profiles DROP COLUMN unlock_all`). To be revisited later as a separate feature.
- `languages` array and `onSaveSettings` prop now passed to DashboardPage from App.jsx.
- `applySettings()` helper in DashboardPage calls `onSaveSettings` directly — no SettingsDrawer involved.
- `languageName` now saved in settings object (via SettingsDrawer and `useSettings.js` default).

**B. Dashboard coming-soon blocks — PARTIALLY UNBLOCKED**
- **Course Progress by Theme** — now derivable from `lesson_completions` joined to `modules`/`themes`. No new tracking needed. Ready to build.
- **Languages Explored** — now derivable from `lesson_completions` joined through `lessons → modules → language_id`. Ready to build.
- **Earned Badges** — still needs item F (badge persistence) first.

**C. Activity table — missing columns — PARTIALLY BLOCKED**
The recent activity table currently shows only Lessons Completed and Dharma Earned.
- **Snippets Viewed** daily column: NOT possible — we deliberately chose not to track per-snippet timestamps. This column stays empty.
- **Badges Unlocked** column: blocked on item F.

**D. Share buttons**
WhatsApp, Twitter/X, Copy Link are all `disabled`. To activate:
- Copy Link: generate a URL like `indiyatra.in/profile/{userId}` and write to clipboard
- WhatsApp: `https://wa.me/?text=...` with encoded share text
- Twitter/X: `https://twitter.com/intent/tweet?text=...`
- Public profile page doesn't exist yet — create before enabling share

**E. Snippet-level tracking — DONE**
- Mid-lesson resume: `lesson_progress` table + `initialSnippetIndex` prop. User resumes exactly where they left off. ✓
- Snippets Viewed stat: live on dashboard — completed lesson snippet counts + in-progress position. ✓
- `lesson_progress` row deleted on lesson completion (no double-counting). ✓
- Per-snippet timestamp tracking deliberately NOT implemented (database size concern). Activity table daily snippets column remains empty.

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
- All 151 hardcoded `font-size: Xpx` values converted to `rem` (X/16 rem) across 7 files:
  `global.js`, `HomePage.jsx`, `CoursePage.jsx`, `ModulesPage.jsx`, `LessonsPage.jsx`, `DashboardPage.jsx`, `SnippetPlayer.jsx`
- JS in App.jsx sets `document.documentElement.style.fontSize` to `13px` / `16px` / `19px` based on `settings.fontSize`
- `document.body.dataset.fs` still set for backward compat but no CSS rules target it for font-size
- Font size change now cascades to every element on every page instantly

**Snippet resume + Snippets Viewed stat — DONE**
- `lesson_progress (profile_id, lesson_id, snippet_index, updated_at)` table created with RLS
- `lesson_completions.snippet_count smallint` column added; backfilled from `lesson_snippet_mapping`
- `auth.js`: added `loadLessonProgress`, `upsertLessonProgress`, `deleteLessonProgress`; updated `saveCompletion` signature
- `App.jsx`: `lessonProgress` Map loaded on login; `handleSnippetAdvance` debounces DB writes at 400ms; `handleLessonComplete` saves `snippet_count` and deletes progress row
- `SnippetPlayer.jsx`: `initialSnippetIndex` prop + reset effect on lesson change (also fixes pre-existing bug where Next Lesson kept stale position); `onSnippetAdvance` callback in goNext/goPrev
- `DashboardPage.jsx`: fetches `lesson_completions` + `lesson_progress` in parallel; Snippets Viewed stat is live

---

### Other pending items

**F. Badge persistence**
- Badge animations fire client-side in `handleLessonComplete` (App.jsx) but are never saved
- Need a `user_badges` table or a derived approach: recompute badges from completions at dashboard load
- Recommendation: derive badges from completion data rather than a separate table — simpler schema

**G. Likes feature — DONE**
- `bookmarks` table renamed to `snippet_likes`; `bookmarked_at` → `liked_at`; added `theme_id`, `module_id`, `lesson_id` context columns + UNIQUE constraint on `(profile_id, snippet_id)`
- `like_count integer DEFAULT 0` added to `snippet_core`; trigger `update_snippet_like_count()` (SECURITY DEFINER) maintains it via +1/-1
- `get_user_likes()` RPC (SECURITY DEFINER, uses `auth.uid()`) returns full metadata per liked snippet
- auth.js: `loadUserLikes`, `insertLike`, `deleteLike`
- SnippetPlayer: heart button active for signed-in users, optimistic UI, loads existing likes on mount; right-side Save/Saved button removed
- LikesPage: card grid with filters (course/theme/module — hidden when only 1 option), playlist navigation through liked snippets
- Playlist mode in SnippetPlayer: `playlistSnippetIds` prop bypasses lesson fetch; shows "♥ Likes Playlist" header; "End of Playlist" done screen; back returns to LikesPage
- Dashboard: "Snippets Liked" stat card wired to live count from `snippet_likes`
- "Likes" nav link added to all page headers

**G2. Bookmarks (lesson/module/theme level) — PENDING**
- Separate from likes — user saves a lesson/module/theme to revisit later
- Simple list of page IDs (`profile_id`, `content_type`, `content_id`, `saved_at`)
- No table exists yet — create when ready to build

**H. HomePage live stats — DONE**
- `snippet_count` and `language_count` columns added to `courses` table
- Maintained by Postgres triggers on `lesson_snippet_mapping` (INSERT/DELETE) and `snippet_translations` (INSERT/DELETE) — both with full recount queries
- `learner_count`: RPC function `get_course_learner_counts()` with `SECURITY DEFINER`, index on `lesson_completions(course_id, profile_id)`
- `courses?select=*` already returns the new columns — no extra fetches in HomePage
- Learner count uses `.toLocaleString()` for formatting

**I. Social features**
- Likes → `snippet_likes` table (does NOT exist yet — create first)
- Comments → `snippet_comments` table (does NOT exist yet — create first)
- All buttons are disabled stubs in SnippetPlayer

**L. Lesson completion modal off-screen — DONE**
- Root cause: `.snip-card` had `will-change: transform` (creates CSS stacking context) + slide animation `fill-mode: both` kept `transform: translateX(0)` applied after animation ends (also creates stacking context). Both broke `position: fixed` on the `.completion-overlay` child.
- Fix: removed `will-change: transform` from `.snip-card`; switched animation to pure fade (no transform); made inline drag transform conditional on `dragOffset !== 0`; added `window.scrollTo(0,0)` before `setDone(true)` as safety net.

**M. Snippet transition jerk — DONE**
- Replaced `slideInFromRight`/`slideInFromLeft` keyframes (which used `translateX` and created stacking contexts) with `snippetFadeIn` — pure `opacity: 0 → 1` over 0.2s.
- Scroll to top was already wired in `goNext`; also added before `setDone(true)`.
- This fix also resolved L (both shared the same CSS stacking context root cause).

**J. Skeleton loaders**
- Currently shows plain "Loading…" text on all pages
- Replace with shimmer skeleton components

**K. Search / Discover page**
- "Discover" nav link is currently a no-op
- Full-text search across snippets, lessons, themes

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
['src/App.jsx','src/pages/DashboardPage.jsx'].forEach(f => {
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

### Dev server
```bash
cd /sessions/SESSIONNAME/mnt/IndiYatra && npm run dev
# Opens on http://localhost:5173
```

---

## 7b. Phase II — Future Development Considerations

These are not pending tasks. They are architectural decisions to revisit when the platform scales.

**Content reuse across courses**
Currently lessons are locked to one module, modules to one theme, and themes to one course (direct foreign keys). Only snippets are reusable across lessons via `lesson_snippet_mapping`. For Phase II: examine how to selectively duplicate or share lessons, modules, and themes across courses, given that each is strictly mapped to one level higher in the current schema. Options include junction tables (`module_lesson_mapping`, `theme_module_mapping`) or a copy-on-create pattern where content is duplicated with a new ID and a `source_id` reference back to the original.

---

## 8. Database Schema Summary

Content hierarchy: `levels → modules → lessons → lesson_snippet_mapping → snippet_core / snippet_translations`

`courses` table: includes `sequential_unlock boolean NOT NULL DEFAULT false` (instructor-controlled sequential lock)

User state: `profiles`, `bookmarks`, `lesson_completions` (+ `snippet_count` column), `lesson_progress`, `snippet_views`, `quiz_attempts`

`lesson_progress`: one row per in-progress lesson per user — deleted on lesson completion. RLS: `auth.uid() = profile_id`.

Quiz: `quiz_sets` (linked to lessons/modules), `quiz_attempts`

Auth: `roles`, `user_roles_mapping`

Assets/media: `asset_library`, `icons`

i18n: `languages`, `language_id` columns on most content tables, `snippet_translations` for per-language content

Auth trigger: `handle_new_user` — inserts into `profiles` and assigns role `ROLE_04`. Fires for all users including anonymous.

RLS: All content tables publicly readable (anon key). User-owned tables gated on `auth.uid() = profile_id`.

Full schema is in the three CSV files attached to the IndiYatra Claude project.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
