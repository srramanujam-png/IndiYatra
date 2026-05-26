# IndiYatra — Session 23 Start Prompt

**Use this prompt to resume exactly where Session 22/23 left off.**

---

## What was completed this session

1. **Dashboard hero — Resume Yatra removed** from the hero block (button + all its CSS). `DashboardPage.jsx` updated.
2. **Scope selector — Option C ghost pill implemented** — replaced the corner badge (Option D, which caused layout issues) with a flowing ghost pill below the subtitle. Classes: `.dash-scope-wrap`, `.dash-scope-pill`. Dropdown right-aligned, opens downward.
3. **Full UI audit conducted** — a visual mockup was shown and approved by the user covering:
   - Global design system (Item 1)
   - Card design cleanup across all pages (Item 2)
   - Dashboard mobile fixes (Item 3)
4. **Handoff pending task P confirmed** — Visual polish (text colour + icon refresh) is included in the implementation backlog.

---

## Brand Book — Non-Negotiable Constraints

Read `Brand Book Excerpt.pdf` (uploaded in the previous session) or use these extracted values:

### Primary colours (these three only — no others for primary UI)
| Constant | Hex | Usage |
|----------|-----|-------|
| SAFFRON | `#FF8E00` | 50% — CTAs, highlights, feature areas, energy |
| GREEN | `#00924A` | 25% — progress, growth, living heritage |
| HERITAGE | `#00509E` | 15% — navigation, structure, long-form readability |

### Secondary colours (≤10% total across entire site, used sparingly)
| Name | Hex | When |
|------|-----|------|
| Mint Aqua | `#B5FFE1` | Subtle interactive elements, maps, directional cues |
| Sunlit Yellow | `#F8F991` | Soft background, dividers, key facts |
| Vermilion Rose | `#EB5160` | Emotional emphasis, storytelling moments only |

### Colours to REMOVE (not in brand book)
- `#D4A017` Gold — used in DiscoverPage and BookmarksPage → replace with `#FF8E00` Saffron
- `#7B2D8B` Purple — used in DiscoverPage (course type), BookmarksPage, LEVEL_LABELS (Level 5) → replace with `#00509E` Heritage Blue
- All parchment tones: `#EAD9BE`, `#E8D5B0`, `#E0D4BC`, `#f0e8d8`, `#fafaf8`, `#FFFDF5`, `#F7F3EC`, `#f5f0e8`, `#f5f4f1`, `#F6FBF8` → replace with neutral values (see below)

### Typography (already correct in code — do not change font families)
- Alumni Sans Bold → headlines only
- Source Sans 3 Medium (weight 500) → body copy
- Source Sans 3 Black (weight 900) → taglines only

---

## New Design System Values

### Background & surfaces
```
Page background:  #F8F8F6   (bright off-white, replaces PARCHMENT #FFFDF5)
Card background:  #FFFFFF   (pure white)
Card border:      1px solid rgba(0,0,0,0.08)   (replaces all #EAD9BE / #E8D5B0 borders)
Progress tracks:  rgba(0,0,0,0.06)             (replaces #f0e8d8)
Thumbnail bg:     #EBEBEA                       (replaces #f0e8d8)
Locked/disabled:  opacity: 0.4 only            (no off-brand #f5f4f1 bg)
Hover bg on rows: rgba(0,0,0,0.02)             (replaces #FFFDF5 hover)
Skeleton shimmer: #EBEBEA / #F5F5F4            (replaces warm parchment shimmer)
```

### Text colours (near-black for readability — Item P)
```
Headings:    #111827   (replaces #1a1a2e — slightly more neutral)
Body:        #374151   (replaces #444, #555, #666 — near-black, not grey)
Secondary:   #6B7280   (replaces #777, #888 — for supporting text)
Muted/meta:  #9CA3AF   (replaces #aaa, #bbb, #ccc — for timestamps, counts)
```

### Accent-per-section rule (Dashboard)
One brand colour per section block — used for the left title bar and data colour:
- Dashboard hero: no extra accent
- Learning Streak: `#FF8E00` Saffron
- Progress by Course/Theme: `#00924A` Green
- Recent Activity: `#00509E` Heritage Blue
- Your Forest: `#00924A` Green
- Earned Badges: `#FF8E00` Saffron
- Share Your Yatra: `#00509E` Heritage Blue

### Stat card accent colours (top bar + value colour)
- Dharma Points: `#FF8E00` Saffron
- Lessons Completed: `#00924A` Green
- Badges Earned: `#FF8E00` Saffron
- Snippets Viewed: `#00509E` Heritage Blue
- Snippets Liked: `#00509E` Heritage Blue

---

## Implementation Backlog (in order)

### Item 1 — Global design system
**Files:** `src/lib/supabase.js`, `src/styles/global.js`

Changes to `src/lib/supabase.js`:
- Remove `PARCHMENT` export (or change to `#F8F8F6` if any page imports it)
- Remove `#7B2D8B` from `LEVEL_LABELS` LEVEL_005 → replace with `#00509E`
- Remove `#7B2D8B` and `#E0C8F0` from `VISIBILITY_BADGE` if present

Changes to `src/styles/global.js`:
- `body { background: #F8F8F6; }` (was `${PARCHMENT}`)
- `.app-header { background: rgba(255,255,255,0.97); }` (was parchment rgba)
- `.page-section { border: 1px solid rgba(0,0,0,0.08); }` (was `#EAD9BE`)
- `.skel` shimmer colours → `#EBEBEA` / `#F5F5F4` (was warm parchment)
- `.settings-drawer-header` border → `rgba(0,0,0,0.07)` (was `#f0e8d8`)
- `.lang-option`, `.fs-option` borders → `rgba(0,0,0,0.10)` (was `#e8d5b0`)
- `.breadcrumb .sep` → `#D1D5DB` (was `#ccc`)

---

### Item 2 — Card design cleanup (all pages)

**Files:** All page files listed below. For each, find and replace the patterns:

#### Pattern replacements (apply globally across all files)
| Old value | New value | Where |
|-----------|-----------|-------|
| `border: 1px solid #EAD9BE` | `border: 1px solid rgba(0,0,0,0.08)` | All cards |
| `border: 1px solid #E8D5B0` | `border: 1px solid rgba(0,0,0,0.08)` | All rows |
| `border: 1.5px solid #EAD9BE` | `border: 1px solid rgba(0,0,0,0.08)` | Snippet cards |
| `border: 2px solid #e0d4bc` | `border: 2px solid rgba(0,0,0,0.08)` | Level tabs |
| `border: 1.5px solid #E0D4BC` | `border: 1.5px solid rgba(0,0,0,0.10)` | Pills/selects |
| `background: #f0e8d8` | `background: #EBEBEA` | Thumbs, tracks |
| `background: #f5f0e8` | `background: #EBEBEA` | Like card img bg |
| `background: #f5f4f1` | `opacity: 0.4` (on wrapper) | Locked states |
| `background: #F6FBF8` | `background: #F0FBF5` | Completed states (Green-tint) |
| `background: #F7F3EC` | `background: rgba(0,146,74,0.08)` | Stat pills (HomePage) |
| `border: 1px solid #E8D5B0` (stat pills) | `border: 1px solid rgba(0,146,74,0.18)` | Stat pills (HomePage) |
| `color: #888` (stat pills) | `color: #00924A` | Stat pills (HomePage) |
| `border-bottom: 1px solid #f0e8d8` | `border-bottom: 1px solid rgba(0,0,0,0.07)` | Section separators |
| `background: ${PARCHMENT}` | `background: transparent` | Hero sections |
| `#D4A017` / `GOLD` | `#FF8E00` (SAFFRON) | DiscoverPage, BookmarksPage |
| `#7B2D8B` / `PURPLE` | `#00509E` (HERITAGE) | DiscoverPage, BookmarksPage |
| `background: #FFFDF5` / hover | `background: rgba(0,0,0,0.02)` | Row hover states |

#### Per-file specific changes

**`src/pages/HomePage.jsx`**
- `.tagline-pill` — remove `linear-gradient`, use flat `background: rgba(255,142,0,0.10)`
- `.card-stat` pills — use Green tint bg/border/text (see pattern table above)
- `.courses-grid` — already `minmax(300px,1fr)`, keep

**`src/pages/CoursePage.jsx`**
- `.level-tab` border → neutral; locked state: opacity only, no `#f5f4f1` bg
- `.level-tab.active .level-tab-count` bg stays as level colour (correct)
- `.theme-row-thumb` bg → `#EBEBEA`
- `.theme-row-progress` bg → `rgba(0,0,0,0.06)`
- `.theme-row-cta` — change `border-radius: 999px` → `border-radius: 8px` (modernise)

**`src/pages/ModulesPage.jsx`**
- `.theme-banner-inner` — remove gradient, use `background: rgba(0,80,158,0.05); border: 1px solid rgba(0,80,158,0.12)`
- `.module-row` border → neutral; `.module-row-thumb` bg → `#EBEBEA`
- `.module-row.complete` bg → `rgba(0,146,74,0.04)` (subtler green tint)
- `.lesson-divider` color `#e8d5b0` → `rgba(0,0,0,0.10)`

**`src/pages/LessonsPage.jsx`**
- `.module-banner-inner` — remove gradient, use `background: rgba(255,142,0,0.05); border: 1px solid rgba(255,142,0,0.15)`
- `.lesson-row` border → neutral
- `.lesson-row.completed` bg → `rgba(0,146,74,0.04)` border-left stays Green

**`src/pages/DiscoverPage.jsx`**
- `.discover-hero` — remove `background: ${PARCHMENT}`, make transparent
- `GOLD` constant `#D4A017` → delete, replace all uses with `SAFFRON`
- `PURPLE` constant `#7B2D8B` → delete, replace all uses with `HERITAGE`
- Update `TYPE_META` border colours to match new brand: snippet `#FF8E0033`, lesson `#00924A33`, module `#FF8E0033`, course `#00509E33`
- `.discover-snippet-card` — add `border-top: 3px solid #FF8E00` (accent), neutral side borders
- `.discover-row-card` border → neutral; hover bg → `rgba(0,0,0,0.02)`
- `.discover-pill` border → `rgba(0,0,0,0.10)`

**`src/pages/LikesPage.jsx`**
- `.likes-hero` border-bottom → `rgba(0,0,0,0.07)`
- `.like-card` border → neutral; `.like-card-img` bg → `#EBEBEA`

**`src/pages/BookmarksPage.jsx`** (haven't read fully — check for Gold/Purple, parchment borders)
- Replace any `GOLD`/`PURPLE` colour references with `SAFFRON`/`HERITAGE`
- All `#EAD9BE` / `#E8D5B0` borders → neutral

---

### Item 3 — Dashboard mobile fixes
**File:** `src/pages/DashboardPage.jsx`

1. **Stat cards at ≤480px** — change `grid-template-columns: repeat(2, 1fr)` → `repeat(3, 1fr)`. Add a ghost 6th card: `<div class="stat-card stat-ghost" />` with `.stat-ghost { background: transparent; border: 1px dashed rgba(0,0,0,0.06); box-shadow: none; }` so the grid is visually balanced (2 rows of 3).

2. **Activity table → stacked rows** — at ≤600px, hide the entire `<table>` and show a new `.act-stack` div instead (toggle via CSS `display:none`/`display:block`). Each row becomes:
   ```
   [Day + Date]        [pill: N lessons] [pill: N pts]
   ```
   Pills: Green tint for lessons, Saffron tint for dharma. "No activity" days show a single grey pill.

3. **Progress table → stacked bars** — same approach at ≤600px. Replace table with `.prog-stack` rows: theme/course name + a full-width brand-coloured bar + pct text below it.

4. **Forest section** — at ≤600px, hide `.forest-token-sub` (the "per lesson" sub-labels). They're `0.5625rem` — illegible. Keep icon, count, and name.

5. **Badge cards** — `minmax(90px, 1fr)` → `minmax(100px, 1fr)` at ≤768px.

6. **Share preview text** — `.share-msg-text` at ≤600px: add `font-size: 0.8125rem` (13px) override.

---

### Item P — Visual polish (from HANDOFF.md pending task P)
**Files:** All pages + `src/styles/global.js`

1. **Text colour** — Apply near-black values from the table above. Specifically audit and replace:
   - `color: #666` → `#374151`
   - `color: #777` → `#374151`
   - `color: #888` → `#6B7280`
   - `color: #aaa` → `#9CA3AF`
   - `color: #bbb` → `#9CA3AF`
   - `color: #ccc` → `#D1D5DB`
   - `color: #555` → `#374151`
   - `color: #444` → `#374151`
   - Headings: `color: #1a1a2e` → keep (already near-black, acceptable)

2. **Emoji → SVG icons** — Replace in DashboardPage first (most icon-dense), then HomePage, then others. Use Tabler icons (`<i class="ti ti-NAME">`) or inline SVG. Target replacements:
   - `🔥` (streak) → `<i class="ti ti-flame">` in saffron
   - `🏆` (badges) → `<i class="ti ti-trophy">` in saffron
   - `📚` / `📖` (lessons, snippets) → `<i class="ti ti-book-2">` in heritage blue
   - `✦` (dharma, snippets) → `<i class="ti ti-diamond">` in saffron
   - `♥` (likes) → `<i class="ti ti-heart">` in heritage blue
   - `🌿🌸🪷🌳🌲` (forest tokens) → keep as emoji for now (decorative, culturally specific — no suitable flat SVG equivalent). Revisit if brand team provides custom icons.
   - `📤` (share) → `<i class="ti ti-share">` in heritage blue
   - `📊` (activity) → `<i class="ti ti-chart-bar">` in heritage blue
   - All emoji in section titles (`page-section-title`) → replace with Tabler icons

---

## Session Rules (from HANDOFF.md — always follow)
1. One thing at a time. Read the file before editing.
2. Propose and show a plan, wait for approval before writing code.
3. Use the bash heredoc + Python pattern for ALL file edits to avoid truncation bugs.
4. Validate JSX with Babel after every patch.
5. Visual changes only unless user explicitly asks for logic.

## Files NOT to touch
- `src/pages/SnippetPlayer.jsx` — locked, do not edit (one permitted exception was the `bottom: 58px` → `bottom: 0` fix in the ≤480px media query, Session 23. Re-locked after that change.)
- `src/pages/CoursePage.jsx` lines for SnippetPlayer-adjacent logic — locked
- `supabase/` SQL files — do not edit

## Suggested implementation order
1. `src/lib/supabase.js` — update constants (5 min)
2. `src/styles/global.js` — background + card border system (10 min)
3. `src/pages/DashboardPage.jsx` — Items 1+2+3+P all at once (largest file, most changes — 30 min)
4. `src/pages/HomePage.jsx` — Items 1+2+P (15 min)
5. `src/pages/CoursePage.jsx` — Items 1+2 (10 min)
6. `src/pages/ModulesPage.jsx` — Items 1+2 (10 min)
7. `src/pages/LessonsPage.jsx` — Items 1+2 (10 min)
8. `src/pages/DiscoverPage.jsx` — Items 1+2 (15 min — Gold/Purple removal needs care)
9. `src/pages/LikesPage.jsx` — Items 1+2 (10 min)
10. `src/pages/BookmarksPage.jsx` — Items 1+2 (10 min)
11. Update `progress.md` with Session 23 summary

## progress.md entry to add at start of next session
```
# IndiYatra — Session 23 Progress Summary

**Date:** [date]

## Completed this session
- Removed Resume Yatra button from Dashboard hero (DashboardPage.jsx)
- Implemented Option C ghost pill scope selector (dash-scope-wrap / dash-scope-pill)
- Conducted full UI/UX audit against brand book — mockup approved
- Wrote Session 23 implementation prompt (SESSION_23_PROMPT.md)

## Pending (to implement)
- Item 1: Global design system (background + card borders)
- Item 2: Card cleanup across all pages (parchment borders, Gold/Purple removal)
- Item 3: Dashboard mobile fixes (stat grid, activity/progress tables, forest labels)
- Item P: Near-black text + emoji → Tabler icon replacement
```
