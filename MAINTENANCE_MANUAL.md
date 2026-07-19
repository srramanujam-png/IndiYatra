# IndiYatra — Maintenance Engineer Manual

**Document version:** 1.0  
**Date:** July 8, 2026  
**Project path:** `C:\Users\srram\IndiYatra`  
**Prepared by:** Senior Software Documenter (read-only codebase review)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Content Hierarchy & Data Model](#4-content-hierarchy--data-model)
5. [Navigation & Routing](#5-navigation--routing)
6. [Authentication](#6-authentication)
7. [Core User Flows](#7-core-user-flows)
8. [Page Reference](#8-page-reference)
9. [Shared Components & Hooks](#9-shared-components--hooks)
10. [Gamification System](#10-gamification-system)
11. [Database & Migrations](#11-database--migrations)
12. [Styling & Design System](#12-styling--design-system)
13. [Admin & Editorial Operations](#13-admin--editorial-operations)
14. [Local Development Guide](#14-local-development-guide)
15. [Known Gotchas & Anti-Patterns](#15-known-gotchas--anti-patterns)
16. [File Map](#16-file-map)
17. [Appendix A: Navigation Flow Diagram](#appendix-a-navigation-flow-diagram)
18. [Appendix B: Pre-Touch Checklist](#appendix-b-pre-touch-checklist)
19. [Appendix C: Continuity Documentation](#appendix-c-continuity-documentation)

---

## 1. Executive Summary

### What is IndiYatra?

IndiYatra is a **multilingual heritage learning platform** aimed at children and learners exploring Indian history, culture, festivals, and traditions. Tagline: *"Heritage for Every Child."*

Learners consume **bite-sized snippets** (stories) organized in a structured hierarchy:

```
Course → Level → Theme → Module → Lesson → Snippet
```

The app adds gamification (Dharma points, forest tokens, badges), social features (likes, bookmarks, comments), quizzes, discovery via taxonomy tags, and personalized recommendations. Editorial staff use an internal workflow to draft, verify, and publish content.

### Architecture in One Paragraph

IndiYatra is a **single-page React 19 application** built with **Vite**, with **no custom backend server**. All persistence goes through **Supabase** (PostgreSQL + Auth + Storage + RPC functions). Navigation is **state-based** inside `App.jsx` (no React Router). Styling is **inline CSS strings** per page/component, plus shared globals. Business logic lives primarily in `src/lib/auth.js` (~2,200 lines) and orchestration in `App.jsx` (~1,256 lines).

---

## 2. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19.2, Vite 8 | ESM, HMR via `npm run dev` |
| Backend | Supabase | REST + JS SDK; no Node/Express API |
| Auth | Supabase Auth | Google OAuth, email/password, anonymous guest |
| Database | PostgreSQL (Supabase) | 60+ SQL migration files in `supabase/` |
| Storage | Supabase Storage | Snippet/module images via `asset_library` |
| Build | Vite | `npm run build` → static `dist/` |
| Lint | ESLint 10 | `npm run lint` |
| Excel import | `xlsx` | Admin bulk import only |

### Environment Variables

Copy `.env.example` → `.env`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Both are required at startup; `supabase.js` throws if missing.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                       │
├─────────────────────────────────────────────────────────────────┤
│  App.jsx          — page router, global state, orchestration     │
│  pages/*.jsx      — 18 page components (learner + admin/editor)  │
│  components/*.jsx — shared UI (header, modals, rails, skeletons) │
│  hooks/*.js       — useAuth, useCourseTree, useRecommendations   │
│  lib/auth.js      — Supabase SDK + all data-access functions     │
│  lib/supabase.js  — raw REST fetch + shared constants            │
│  lib/awards.js    — token/badge awarding on lesson complete      │
│  config/appStrings.js — all UI copy (single source of truth)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
   supabase() REST                   supabaseClient SDK
   (anon key, public reads)          (auth + RLS-protected writes)
          │                                 │
          └────────────────┬────────────────┘
                           ▼
              ┌────────────────────────┐
              │   Supabase Project     │
              │  PostgreSQL + Auth     │
              │  RPCs + RLS policies   │
              │  Storage buckets       │
              └────────────────────────┘
```

### Dual Supabase Access Pattern

1. **`supabase(table, query)`** in `lib/supabase.js` — lightweight `fetch()` to PostgREST with anon key. Used for public content reads (courses, snippets, themes).
2. **`supabaseClient`** in `lib/auth.js` — full `@supabase/supabase-js` client with session persistence (`storageKey: "indiyatra-auth"`). Used for auth, user-scoped writes, RPCs, and admin operations.

**Maintenance rule:** User-specific data (bookmarks, completions, likes) must go through `supabaseClient` so JWT + RLS apply. Community aggregates (top liked, top saved) use `SECURITY DEFINER` RPCs to bypass per-user RLS.

---

## 4. Content Hierarchy & Data Model

### Hierarchy

```
courses
  └── modules (level_id, theme_id, course_id, cover_image_url)
        └── lessons (module_id, cover_image_url, asset_id)
              └── lesson_snippet_mapping (order_index)
                    └── snippet_core (hook, explanation, asset_id, …)
                          └── snippet_translations (per language)
```

### Supporting Entities

| Entity | Purpose |
|--------|---------|
| `themes` | Thematic grouping within a level |
| `languages` | LANG_01, LANG_03 (English), etc. |
| `quiz_sets` | One quiz per lesson (typically) |
| `quiz_questions` | Links questions to quizzes |
| `questions` | Standalone or snippet-linked MCQs |
| `snippet_questions` | Links a question to a snippet |
| `content_taxonomy_mapping` | Tags snippets for Discover |
| `taxonomy_terms` | Tag vocabulary |
| `asset_library` | Image file paths |
| `profiles` | User display name, share messages, `last_visited_route` |
| `lesson_completions` | Completed lessons + points |
| `lesson_progress` | In-progress snippet index |
| `snippet_likes` | Per-snippet likes |
| `likes` | Generic likes (module/lesson/quiz/question) |
| `bookmarks` | Saved content (7 content types) |
| `user_tokens` | Forest gamification tokens |
| `user_badges` | Earned achievement badges |
| `content_drafts` | Editorial workflow tasks |
| `content_workflow_events` | Audit log for editorial actions |
| `user_roles_mapping` | Admin (ROLE_01), Creator (ROLE_07), editorial roles |

### Pairing Rules (Application-Enforced, Not DB Triggers)

| Content A | Pairs With | Notes |
|-----------|-----------|-------|
| Lesson | Quiz | Like/bookmark either → both flip |
| Question | Snippet | Only when `snippet_questions` row exists |
| Module | — | Never paired |

Implemented in `App.jsx` → `handleToggleBookmark` / `handleToggleLike` via `getPairedContent()`.

---

## 5. Navigation & Routing

**There is no React Router.** All navigation is a string `page` state in `App.jsx`:

```javascript
const [page, setPage] = useState("home");
function goForward(newPage, fn) { setNavDirection("forward"); … setPage(newPage); }
function goBack(newPage, fn)    { setNavDirection("back");    … setPage(newPage); }
```

### Page Registry

| `page` value | Component | Role |
|-------------|-----------|------|
| `home` | HomePage | Landing, course cards |
| `gateway` | GatewayPage | First-time visitor onboarding |
| `for-you` | ForYouPage | Personalized hub (8 sidebar tabs) |
| `navigator` | CourseNavigatorPage | Tree browser for one course |
| `all-courses` | AllCoursesPage | Full catalog drawer-style browser |
| `course` | CoursePage | Level tabs + themes (legacy path) |
| `modules` | ModulesPage | Module list for theme |
| `lessons` | LessonsPage | Lesson list for module |
| `player` | SnippetPlayer | Core learning experience |
| `quiz` | QuizPlayer | Quiz taking |
| `dashboard` | DashboardPage | Stats, forest, badges |
| `discover` | DiscoverPage | Taxonomy tag exploration |
| `likes` | LikesPage | User's liked snippets |
| `bookmarks` | BookmarksPage | User's saved items |
| `settings` | SettingsPage | Profile, language, font size |
| `admin` | AdminPage (lazy) | Admin console |
| `editor` | EditorPage (lazy) | Editorial workflow |

### Entry Flows

```
First visit (no user, no localStorage flag)
  → gateway

Returning user login (profile.last_visited_route set)
  → for-you (Resume tab)

Guest
  → local-only state; sign-in gate on likes/bookmarks

Course flow
  home → navigator → player
  OR all-courses → player
  OR for-you → player / all-courses
```

### Global State in App.jsx

Central state includes: `selectedCourse`, `selectedTheme`, `selectedModule`, `selectedLesson`, `completedLessons` (Set), `lessonProgress` (Map), `bookmarks` (Set), `likes` (Set), playlist state, quiz state, `forYouInitialSection`, `allCoursesSeed`, role flags (`isAdmin`, `isCreator`, `userEditorialRole`).

**`commonProps`** is spread to every page — the primary prop-drilling contract. Before adding a new global concern, check whether it belongs in `commonProps` or a dedicated hook.

---

## 6. Authentication

### Providers (Working)

- Google OAuth
- Email + password (sign in / sign up)
- Anonymous guest (`signInAnonymously`)

### Critical Auth Pattern

`useAuth.js` **must keep `onAuthStateChange` callback synchronous**. Supabase v2 holds a lock during the callback; awaiting inside it freezes the app (modal freeze bug, fixed in Session 2).

```javascript
// CORRECT — fire-and-forget profile load
onAuthStateChange((_event, session) => {
  if (_event === "TOKEN_REFRESHED") return; // skip spurious re-renders
  setUser(session?.user ?? null);
  if (session?.user) loadProfile(session.user.id); // async, not awaited
});
```

### Role Detection

| Role | Detection |
|------|-----------|
| Admin | RPC `is_admin()` → must check ROLE_01 only |
| Creator | `user_roles_mapping.role_id = 'ROLE_07'` |
| Editorial | RPC `get_editorial_role()` or fallback table join (supervisor > verifier > editor) |

Admin and Editor pages are **lazy-loaded** (`React.lazy`) to reduce initial bundle size.

### User-Scoped Settings

`useSettings.js` stores preferences in `localStorage` keyed by user ID when signed in, or a global key for guests. Language preference (`languageId`, default `LANG_03`) drives snippet/quiz translations.

---

## 7. Core User Flows

### 7.1 Snippet Learning (SnippetPlayer)

```
LessonsPage.onLessonClick
  → setSelectedLesson, fetch getQuizForLesson
  → saveLastVisited (JSON route to profiles)
  → goForward("player")

SnippetPlayer
  → loads snippets via lesson_snippet_mapping + snippet_translations
  → useViewTracking records snippet views
  → onSnippetAdvance → debounced upsertLessonProgress (400ms)
  → swipe/tap navigation between snippets
  → onComplete → handleLessonComplete (unless suppressLessonRewards)
```

**Reward suppression:** When opening a snippet from ForYouPage "Most Bookmarked" (community items), `suppressLessonRewards=true` prevents points/badges/tokens — browsing others' bookmarks shouldn't count as personal completion.

### 7.2 Lesson Completion Cascade

`handleLessonComplete` in `App.jsx`:

1. Adds lesson to `completedLessons` Set
2. Persists to `lesson_completions` via `saveCompletion`
3. Deletes `lesson_progress` row
4. Checks module → theme → level → course completion (async Supabase queries)
5. Builds `earnedBadges` array for UI modal
6. Calls `awardForLessonComplete()` for tokens + badge criteria

### 7.3 Resume Yatra

`profiles.last_visited_route` stores JSON:

```json
{
  "lesson_id": "…", "module_id": "…", "level_id": "…",
  "course_id": "…", "course_name": "…",
  "theme_id": "…", "theme_title": "…"
}
```

Updated on every lesson open. `handleResume()` and `useCourseTree` both parse this via `parseResumeRoute()`.

### 7.4 Playlists

Multiple entry points create snippet playlists:

| Source | `playlistSource` | Return Behavior |
|--------|-----------------|-----------------|
| LikesPage | `likes` | Back to likes or for-you |
| DiscoverPage | `discover` | Back to discover |
| GatewayPage | `gateway` | Back to home |
| Surprise Me | `surprise` | Back to home or for-you |

Playlist mode uses `playlistSnippetIds` + `playlistStartIndex` instead of lesson-bound snippet sequence.

### 7.5 Quiz Flow

```
getQuizForLesson(lessonId) → quiz_sets row
getQuizQuestions(quizId, languageId) → resolved questions
QuizPlayer → saveQuizAttempt on finish
```

Questions can be standalone or snippet-linked. Lesson completion modal can offer "Take Quiz" CTA when `lessonQuiz` is set.

---

## 8. Page Reference

### Learner Pages

| Page | File | ~Lines | Key Dependencies |
|------|------|--------|-----------------|
| HomePage | `pages/HomePage.jsx` | 234 | Course list from Supabase |
| GatewayPage | `pages/GatewayPage.jsx` | — | Featured snippets, entry choices |
| ForYouPage | `pages/ForYouPage.jsx` | 1,686 | 8-tab sidebar, `fetchContentThumbs`, `useRecommendations` |
| AllCoursesPage | `pages/AllCoursesPage.jsx` | — | `useCourseTree` hook |
| CourseNavigatorPage | `pages/CourseNavigatorPage.jsx` | — | Desktop tree + mobile breadcrumbs |
| SnippetPlayer | `pages/SnippetPlayer.jsx` | 1,710 | Comments, likes, share, inline admin edit |
| QuizPlayer | `pages/QuizPlayer.jsx` | — | Timers, scoring, review screen |
| DashboardPage | `pages/DashboardPage.jsx` | 1,174 | Forest tokens, badges, heatmap |
| DiscoverPage | `pages/DiscoverPage.jsx` | — | Taxonomy word cloud, filters |
| LikesPage | `pages/LikesPage.jsx` | 261 | Snippet playlist launch |
| BookmarksPage | `pages/BookmarksPage.jsx` | 331 | Deep-link via `handleBookmarkNavigate` |
| SettingsPage | `pages/SettingsPage.jsx` | 400 | Share message templates |

### Internal Pages

| Page | File | ~Lines | Access |
|------|------|--------|--------|
| AdminPage | `pages/AdminPage.jsx` | 2,219 | `isAdmin` (ROLE_01) |
| EditorPage | `pages/EditorPage.jsx` | 1,661 | `userEditorialRole` |

**AdminPage tabs:** Overview, Users, Tokens, Content (6 sub-tabs), Taxonomy, Badges, Featured, Order, Import.

**EditorPage roles:** Supervisor (assign, publish), Editor (draft), Verifier (review). Status machine: `unassigned → assigned → in_draft → submitted → approved → published`.

---

## 9. Shared Components & Hooks

### Components (`src/components/`)

| Component | Role |
|-----------|------|
| `PageHeader.jsx` | Top nav, auth chip, bottom mobile nav |
| `AppFooter.jsx` | Copyright footer (hidden on player/quiz/gateway) |
| `AuthModal.jsx` | Sign-in UI |
| `ProfileModal.jsx` | Display name editor |
| `RecommendationsRail.jsx` | Horizontal lesson carousel |
| `ModuleGauge.jsx` | Arc progress gauge for modules |
| `CourseSidebar.jsx` | Course navigation sidebar |
| `Skeletons.jsx` | Loading placeholders |
| `Icons.jsx` | SVG icon set |

### Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useAuth` | User, profile, authLoading, refreshProfile |
| `useSettings` | loadSettings / saveSettings (localStorage) |
| `useCourseTree` | Course tree loading, accordion state, resume/seed navigation |
| `useRecommendations` | RPC `get_recommendations` for ForYouPage |
| `useViewTracking` | Snippet view analytics |

### Lib Modules

| Module | Purpose |
|--------|---------|
| `lib/auth.js` | **Primary API surface** — 80+ exported functions |
| `lib/supabase.js` | REST helper, color constants, `fetchContentThumbs` |
| `lib/awards.js` | Token/badge awarding post-completion |
| `lib/courseTree.js` | Tree building, gauge math, resume parsing |
| `config/appStrings.js` | All UI strings, forest token definitions |
| `styles/global.js` | Shared CSS injected via `<style>` tags |

---

## 10. Gamification System

### Forest Tokens

| Token | Trigger | Icon |
|-------|---------|------|
| Tulsi | Lesson complete | 🌿 |
| Ashoka | Module complete | 🌸 |
| Lotus | Theme complete | 🪷 |
| Peepal | Level complete | 🌳 |
| Banyan | Course complete | 🌲 |
| Dharma | Points earned | ✦ |

Token types and triggers are **DB-driven** via `tokens.earn_trigger` column, with hardcoded fallback in `awards.js`. Admin manages catalogue via AdminPage → Tokens tab.

### Badges

25 badges seeded in `badges_schema.sql`; 3 active after `tokens_and_badges_refine.sql`. Client-side checks in `awardForLessonComplete`:

- **BADGE_P02** (Curiosity) — first module complete
- **BADGE_P05** (Endurance) — first course complete
- **BADGE_S02** (Persistence) — 7-day streak

Deduplication guard: checks existing tulsi token for lesson before awarding.

---

## 11. Database & Migrations

### Migration Workflow

SQL files live in `supabase/` (not auto-applied). Run manually in Supabase SQL Editor.

**Diagnostic:** Paste `supabase/check_migrations.sql` to verify which migrations have been applied.

### Key RPCs

| RPC | File | Purpose |
|-----|------|---------|
| `get_course_tree(course_id)` | `get_course_tree.sql` | Flattened hierarchy rows |
| `get_user_bookmarks()` | `bookmarks_schema.sql` | Rich bookmark list with breadcrumbs |
| `get_top_liked_items()` | `likes_and_pairing_schema.sql` | Community leaderboard |
| `get_recommendations(profile_id, limit)` | `migrations/20240002_…` | Tag-overlap recommendations |
| `is_admin()` | `admin_fix_is_admin.sql` | Admin gate |
| `publish_draft(draft_id)` | `editorial_publish.sql` | Writes draft to live tables |
| `get_paired_content(type, id)` | `likes_and_pairing_schema.sql` | Lesson↔Quiz, Question↔Snippet |

### Recent Schema Additions (Sessions 29–33)

- Generic `likes` table + extended bookmark types
- `modules.cover_image_url`, `lessons.cover_image_url`
- `created_at` on modules/lessons for "Latest" sorting
- Lesson/quiz/item leaderboard RPCs with `SECURITY DEFINER`

**Rule:** When adding community-wide aggregates, RPCs **must** use `SECURITY DEFINER` or RLS will return only the caller's own rows (root cause of empty "Most Liked" bug, fixed in Session 29).

---

## 12. Styling & Design System

### Brand Colors (Canonical — `lib/supabase.js`)

| Name | Hex | Usage |
|------|-----|-------|
| SAFFRON | `#FF8E00` | Primary CTAs, accent |
| HERITAGE | `#00509E` | Headings, links |
| GREEN | `#00924A` | Success, completion |
| PARCHMENT | `#FAFAF7` | Backgrounds |

`DESIGN_SYSTEM.MD` exists but **actual implementation diverges** — pages use inline styles referencing the constants above, with fonts Oswald/Nunito Sans/Inter (not always matching the design doc's Alumni Sans/Source Sans 3).

### CSS Pattern

Every page defines a `const styles = \`...\`` string and renders `<style>{globalStyles}{styles}</style>`. Page transitions use CSS classes `page-enter-forward`, `page-enter-back` defined in `App.jsx`.

### Responsive Breakpoints (Common)

- Mobile-first default
- `@media (min-width: 900px)` — SnippetPlayer two-column layout
- `@media (min-width: 1024px)` — ForYouPage/AllCoursesPage 2-column grids

**Gotcha:** Desktop `@media` overrides for `.fy-panel`/`.fy-item-list` must stay at the **end** of the styles string (CSS cascade order matters).

---

## 13. Admin & Editorial Operations

### AdminPage Capabilities

- User management and role assignment
- Token catalogue CRUD + manual token grants
- Content CRUD (Levels, Courses, Themes, Modules, Lessons, Snippets)
- Taxonomy term management + translations
- Badge management (toggle active, edit criteria)
- Featured snippets curation
- Drag-reorder (`adminSaveOrder`)
- Excel import: snippets (`adminImportSnippetsFull`), questions (`adminImportQuestions`)
- Dry-run validation before import (`adminDryRunImport`)

### EditorPage Workflow

```
Supervisor assigns draft → Editor works (in_draft)
  → Editor submits → Verifier reviews
    → approved → Supervisor publishes (publish_draft RPC)
    OR needs_revision → back to Editor
    OR rejected
```

Draft data stored as JSONB in `content_drafts.draft_data`. Events logged to `content_workflow_events`.

### Content Import

Bulk content creation uses Excel templates processed by `xlsx` in AdminPage. Gemini batch prompts exist in `gemini_batches/GEMINI_PROMPT.md` for AI-assisted content generation (external to the app).

---

## 14. Local Development Guide

### Setup

```powershell
cd C:\Users\srram\IndiYatra
copy .env.example .env
# Fill in Supabase URL and anon key
npm install
npm run dev
```

### Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

### Verification Tips

1. Use the IDE to verify file contents — bash reads of Windows-mounted files have been unreliable (stale/truncated).
2. Test auth flows: guest → sign-in → resume redirect → sign-out → state clear.
3. Test ForYouPage at mobile/tablet/desktop widths (sidebar photo tiles, vertical type labels).
4. Run `check_migrations.sql` against Supabase before debugging "empty data" issues.

---

## 15. Known Gotchas & Anti-Patterns

### Do NOT

1. **Use React Router** without a major refactor — all navigation assumes `page` state.
2. **Await inside `onAuthStateChange`** — causes auth lock/freeze.
3. **Use raw REST for user writes** — bypasses session JWT.
4. **Trust `HANDOFF.md`** — it is stale (~106KB, last updated July 6). Use **`SESSION_N_HANDOFF.md`** files instead (currently up to Session 33).
5. **Assume README.md is project docs** — it is still the default Vite template.

### Do

1. Read the latest `SESSION_33_HANDOFF.md` before any ForYouPage work.
2. Add UI strings to `config/appStrings.js`, not inline.
3. Use `getPairedContent()` when toggling likes/bookmarks on paired types.
4. Clear `allCoursesSeed` after a lesson is selected (prevents stale module snap-back).
5. Debounce high-frequency writes (snippet progress uses 400ms timer).
6. Lazy-load heavy admin/editor pages.

### Fragile Areas

| Area | Risk |
|------|------|
| `App.jsx` | 1,256 lines; any navigation bug affects entire app |
| `auth.js` | Monolithic; hard to test in isolation |
| ForYouPage | 1,686 lines; complex sidebar + 8 data sources |
| SnippetPlayer | Touch/swipe, comments, admin inline edit |
| RLS + RPC | Misconfigured policies cause silent empty results |
| Login redirect guard | `hasRedirectedOnLoginRef` + 3s debounce on profile clear |

---

## 16. File Map

```
IndiYatra/
├── src/
│   ├── App.jsx                 ← START HERE (router + orchestration)
│   ├── main.jsx                ← React entry
│   ├── index.css               ← Minimal global CSS
│   ├── contexts/AuthContext.jsx
│   ├── config/
│   │   ├── appStrings.js       ← All UI copy
│   │   └── assets.js
│   ├── lib/
│   │   ├── auth.js             ← All Supabase operations
│   │   ├── supabase.js         ← REST + constants
│   │   ├── awards.js           ← Gamification
│   │   └── courseTree.js       ← Tree helpers
│   ├── hooks/                  ← 5 custom hooks
│   ├── components/             ← 12 shared components
│   ├── pages/                  ← 18 page components
│   └── styles/global.js
├── supabase/                   ← 60+ SQL migration files
├── SESSION_33_HANDOFF.md       ← Latest session notes (canonical)
├── Page_and_Block_List.md      ← UI block inventory
├── DESIGN_SYSTEM.MD            ← Design spec (partially adopted)
├── tags_masterlist.md          ← Taxonomy reference
├── gemini_batches/             ← AI content generation prompts
├── *.html mockups              ← UI design explorations (not runtime)
├── package.json
├── vite.config.js
├── .env.example
└── MAINTENANCE_MANUAL.md       ← This document
```

---

## Appendix A: Navigation Flow Diagram

```
                    ┌─────────────┐
                    │ GatewayPage │ (first visit)
                    └──────┬──────┘
                           ▼
┌──────────┐    ┌──────────────────┐    ┌─────────────┐
│ HomePage │───▶│ CourseNavigator  │───▶│ LessonsPage │
└────┬─────┘    └────────┬─────────┘    └──────┬──────┘
     │                   │                       │
     │    ┌──────────────┴──────────┐            │
     ├───▶│      AllCoursesPage     │            │
     │    └──────────────┬──────────┘            │
     │                   │                       │
     │    ┌──────────────┴──────────┐            │
     ├───▶│       ForYouPage        │────────────┤
     │    └──────────────┬──────────┘            │
     │                   │                       ▼
     │    ┌──────────────┴──────────┐    ┌──────────────┐
     ├───▶│      DiscoverPage       │───▶│ SnippetPlayer│
     │    └─────────────────────────┘    └──────┬───────┘
     │                                           │
     │    ┌──────────┐  ┌───────────┐            ▼
     ├───▶│ LikesPage│  │Bookmarks  │    ┌──────────────┐
     │    └────┬─────┘  └───────────┘    │  QuizPlayer  │
     │         └──────────────────────────▶└──────────────┘
     │
     ├───▶ DashboardPage
     ├───▶ SettingsPage
     ├───▶ AdminPage (ROLE_01)
     └───▶ EditorPage (editorial role)
```

---

## Appendix B: Pre-Touch Checklist

Before modifying any code:

- [ ] Read the latest `SESSION_N_HANDOFF.md` (currently Session 33)
- [ ] Identify which `page` value and `commonProps` your change affects
- [ ] Check if Supabase RPC/table exists (`check_migrations.sql`)
- [ ] Confirm auth implications (guest vs signed-in vs anonymous)
- [ ] Check pairing rules if touching likes/bookmarks
- [ ] Verify RLS: user-scoped vs community aggregate
- [ ] Add strings to `appStrings.js`, not hardcoded
- [ ] Test mobile + desktop if touching ForYouPage, SnippetPlayer, or PageHeader
- [ ] Do not modify files outside scope of the task

---

## Appendix C: Continuity Documentation

| Document | Status | Use |
|----------|--------|-----|
| `SESSION_33_HANDOFF.md` | **Current** | ForYouPage photos, sidebar tiles, Latest merge |
| `SESSION_32_HANDOFF.md` | Recent | Module cover images, AllCourses drawer |
| `SESSION_29–31_HANDOFF.md` | Recent | Likes/bookmarks pairing, Discover |
| `HANDOFF.md` | **Stale** | Ignore — superseded by session files |
| `progress.md` | Historical | Early development log |
| `Page_and_Block_List.md` | Reference | UI inventory with checkboxes |
| `TASK_discover_page_fix.md` | Task-specific | Discover page fix notes |

---

*End of document. Generated from read-only codebase inspection of IndiYatra, July 2026.*
