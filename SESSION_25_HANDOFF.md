# IndiYatra · Session 25 handoff

Picks up from commit `78174aa` ("Pre-sidebar checkpoint"). Nothing was committed during this session — everything below is uncommitted on the working tree.

---

## 1. What was built

### CourseNavigatorPage (new file — 764 lines)
`src/pages/CourseNavigatorPage.jsx`

Replaces the old page-by-page Courses → Levels → Themes → Modules → Lessons chain with a single dedicated page that appears immediately when a course is clicked. A power user can jump to any lesson in 2 clicks instead of 5+.

Architecture:
- Single Supabase RPC call (`get_course_tree`) loads the full tree upfront
- `groupTree(rows)` groups flat RPC rows into `{ [level_id]: { themes: { [theme_id]: { modules: { [module_id]: { lessons: [] } } } } } }`
- Progress status computed from in-memory `completedLessons` / `lessonProgress` — zero extra queries
- **Desktop**: two-column layout — left panel is the Level → Theme → Module tree; right panel is context-sensitive (themes when level selected, modules when theme selected, lessons + CTA when module selected)
- **Mobile**: compressed drill-down (Google Maps / iOS Settings style) with breadcrumb pills at top. `mobileDepth` state: `'levels' | 'themes' | 'modules' | 'lessons'`
- `StatusDot` / `ModuleDot` sub-components for completion indicators
- Lesson click fires `onLessonSelect(lesson, mod, thm, levelId)` → App sets all state and navigates to player

### Supabase RPC (user must run/re-run)
```sql
CREATE OR REPLACE FUNCTION get_course_tree(p_course_id uuid)
RETURNS TABLE (
  level_id text, theme_id uuid, theme_title text, theme_sort int,
  module_id uuid, module_name text, module_sort int,
  lesson_id uuid, lesson_name text, lesson_sort int
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT m.level_id, t.theme_id, t.title, t.sort_order,
         m.module_id, m.module_name, m.sort_order,
         l.lesson_id, l.lesson_name, l.sort_order
  FROM modules m
  JOIN themes t ON t.theme_id = m.theme_id
  JOIN lessons l ON l.module_id = m.module_id
  WHERE m.course_id = p_course_id
  ORDER BY m.level_id, t.sort_order, m.sort_order, l.sort_order;
$$;
```
Note: does NOT return completion data — that comes from in-memory state, not the DB query.

---

## 2. App.jsx changes

### New state
- `playerReturnPage` (default `"lessons"`) — tracks where the back button in SnippetPlayer should return to
- `lastVisitedRouteRef = useRef(null)` — stays in sync with every lesson open; avoids stale `profile.last_visited_route` after login

### `saveLastVisited(routeObj)` helper
Updates both the ref and fires `updateLastVisited()` to the DB (fire-and-forget). Called on every lesson open. Payload now includes `lesson_id`, `course_id`, `theme_id` (previously missing).

### `handleResume()` rewrite
- Reads `lastVisitedRouteRef.current` first, falls back to `profile.last_visited_route`
- If `route.lesson_id` is present, fetches the lesson row and navigates **directly to SnippetPlayer** — user lands on the player at the last lesson, at whatever snippet position `lessonProgress` remembers
- Sets `playerReturnPage("navigator")` before navigating to player
- Fallback to lessons list if no `lesson_id`
- All fallback navigations go to `"navigator"` instead of legacy `"course"`

### Navigation wiring
- Course click: `setSelectedCourse(course); goForward("navigator")` (was `goForward("course")`)
- `onBackToCourse` in LessonsPage and ModulesPage: `goBack("navigator")` (was `goBack("course")`)
- `onBackToLessons` in SnippetPlayer: `goBack(playerReturnPage)` (was hardcoded `goBack("lessons")`)
- `playerReturnPage` set to `"navigator"` from Navigator, Bookmarks, and Likes flows; `"lessons"` from LessonsPage
- `"navigator"` case added to `renderPage()` switch

### Removed
- `import CourseSidebar` removed (sidebar approach abandoned in favour of navigator page)
- `sidebarOpen` state removed
- `onSidebarOpen` removed from commonProps

### Added to commonProps
- `lessonProgress` (needed by CourseNavigatorPage for in-progress indicators)

---

## 3. auth.js change
Added `getCourseTree(courseId)` at end of file:
```js
export async function getCourseTree(courseId) {
  return supabaseClient.rpc("get_course_tree", { p_course_id: courseId });
}
```

---

## 4. LessonsPage / ModulesPage
- `onBackToCourse` changed to `goBack("navigator")`
- `onSidebarOpen` prop and Navigate button removed (dead code from sidebar attempt)

---

## 5. Known issues / what to test

1. **Run the SQL** in Supabase (SQL Editor). The user ran an older version; the current version is above — run `CREATE OR REPLACE` to update it.
2. **Full navigator flow**: Click course → Navigator page loads → click Level → themes appear on right → click Theme → modules appear → click Module → lessons appear → click lesson → player opens. Back button should return to Navigator.
3. **Resume Yatra**: Play a snippet, return to home, click Resume → should jump directly to SnippetPlayer at the last lesson.
4. **Bookmarks/Likes flow**: Clicking a lesson bookmark or like should open player and back button should go to Bookmarks/Likes page (not lessons page).

---

## 6. What's open

- **Commit** the working tree. Validated by `@babel/parser` and production vite build (`npx vite build --outDir /tmp/iy-dist --emptyOutDir`).
- `CourseSidebar.jsx` still exists in `src/components/` but is not imported anywhere — can be deleted or left.
- The legacy `"course"` page case still exists in `renderPage()` as a fallback — harmless but could be removed eventually.
- AdminPage chunk size warning in the build is pre-existing and non-blocking.

---

## 7. Critical gotchas (carry forward from Session 24)

**Windows mount file truncation**: Edit tool truncates files near EOF with CRLF endings. Always use Python `str.replace` + `open(..., 'w', encoding='utf-8', newline='\n').write(src)` for non-trivial edits. Tail-check after every write.

**`@babel/preset-react` not installed**. Use:
```bash
node -e "require('@babel/parser').parse(require('fs').readFileSync('FILE','utf8'),{sourceType:'module',plugins:['jsx']}); console.log('OK')"
```

**Vite dev server can't run in sandbox** (EPERM on node_modules/.vite). Use:
```bash
npx vite build --outDir /tmp/iy-dist-N --emptyOutDir
```

**git index.lock**: If stuck, user deletes manually (`del C:\Users\srram\IndiYatra\.git\index.lock`) then commits.

---

## 8. Brand / design system (unchanged from Session 24)

```js
SAFFRON   = "#FF8E00"   // primary CTAs, hero
HERITAGE  = "#00509E"   // nav, progress, dashboard stat values
GREEN     = "#00924A"   // content hierarchy, share block
PARCHMENT = "#FAFAF7"   // background

text-heading = #0A0A0A
text-body    = #1F1F1F
text-meta    = #6B6B6B
border       = rgba(0,0,0,0.07)
radius       = 14px
shadow       = none
```

Headlines: Alumni Sans Bold. Body: Source Sans 3 Medium. Tagline: Source Sans 3 Black.
Icons: Tabler (`ti-*`), loaded globally.

---

## 9. Path mappings

- Windows (file tools): `C:\Users\srram\IndiYatra`
- Bash (shell): `/sessions/<id>/mnt/IndiYatra`
- Skills (read-only): `/sessions/<id>/mnt/.claude/skills/`
- Outputs: `/sessions/<id>/mnt/outputs/`
