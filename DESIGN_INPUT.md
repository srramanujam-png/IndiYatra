# IndiYatra — Design Input

**Date:** 19 July 2026 · **Author lens:** visual app designer, UX-first
**Scope:** full UI/UX review against the three product objectives, plus per-page design directives for Home, Courses/Course, For You, Discover, and Dashboard.
**Companions:** `UX_DESIGN_REVIEW.md` (summary + Yatra Map proposal) · `YatraMap_Forest_Mockup.html` (interactive map mockup) · builds on, and does not contradict, `FORYOU_TWO_VIEWS_PROPOSAL.md` and `ENGINEERING_IMPROVEMENT_MANUAL.md`.

**How to use this file:** each section ends in numbered **Design directives** — concrete, buildable instructions. When prompting your coding assistant, paste the relevant directive block, not the whole file.

---

## 1. Visual language audit (cross-page)

The design system (`DESIGN_SYSTEM.MD`) is real and mostly respected: Heritage Blue / Cultural Green / Saffron, Oswald headings, Nunito Sans body, Inter UI, 12px radii, 24px rhythm. That discipline is rare in vibe-coded apps and is worth protecting. Four cross-cutting drifts undermine it:

**1a. Off-system teal.** `TEAL = "#4AADA8"` is hardcoded in HomePage and AllCoursesPage for course-browsing chrome (card footers, section markers). It's a pleasant colour but it is an invention the design system explicitly forbids. Decide once: either *legalise* it (add `--color-browse: #4AADA8` to the system with a defined role: "course-browsing chrome only"), or replace with Cultural Green. Recommend legalising — the differentiation between "browsing" (teal) and "progress/success" (green) is actually useful.

**1b. Emoji as iconography.** Stat icons, forest tokens (🌿🌸🪷🌳🌲), placeholders (🪔), meta glyphs (📖 👥) are emoji. Emoji render differently on Android/Windows/iOS and clash with the Tabler icon set (`ti ti-*`) already used on Dashboard. Emoji are fine as *content* (inside a snippet), not as *UI*. Replace UI emoji with either Tabler icons or — for the five sacred plants — a small commissioned/generated flat SVG sprite set in brand colours. The plant sprites matter most: they are the brand's most ownable visual asset and currently look like a chat message.

**1c. Placeholder imagery is off-brand.** `picsum.photos/seed/...` seeded stock photos back the For You thumbs. Random photos of laptops and mountains-in-Norway next to a story about the Ganga breaks immersion badly. Replace with a generated set of ~12 branded pattern tiles (saffron/heritage/green duotone motifs — paisley, lotus, temple silhouette, peacock) picked by the same seed logic. Same stability, on-brand.

**1d. Density hacks signal list-first thinking.** The vertical bottom-to-top type label in For You's ItemRow and the per-word stat-label spans on Dashboard are clever CSS to squeeze text-dense rows. When a row needs a rotated label to fit, the row is carrying too much text and too little image. The fix is not better hacks — it's imagery-forward cards (Section 3).

**Design directives — visual language**
1. Add `--color-browse: #4AADA8` to `DESIGN_SYSTEM.MD` with usage rule, or purge teal. One decision, applied everywhere.
2. Create `src/assets/sprites/` with flat SVG sprites: tulsi, ashoka, lotus, peepal, banyan, dharma-star, diya. Use everywhere tokens appear (Dashboard, completion modal, future map).
3. Replace picsum with 12 branded duotone pattern tiles; keep the seeded-selection logic.
4. UI emoji → Tabler icons. Content emoji stay.

---

## 2. Objective A — make reading, liking, bookmarking, sharing fun

### What the code does today
SnippetPlayer: horizontal swipe + arrows + keyboard, mobile tap-to-reveal sheet, social strip (like/bookmark/share) per snippet, WhatsApp/Twitter/copy share popover with the snippet hook as lead text, comments sheet, language picker, completion modal (`🪙 +N Dharma Points` + badge rows). Likes/bookmarks persist and surface in LikesPage, BookmarksPage, and two For You rails. EntityPreview lets users bookmark courses/themes/lessons before opening them.

### Review
Functionally this objective is ~80% met — the loop exists end to end. Emotionally it is ~40% met. "Fun" lives in three moments this UI currently underplays:

- **The moment of liking.** A like toggles a heart's fill. No burst, no count tick, no haptic-feel. Instagram's double-tap heart-burst is the single most copied interaction in software because it *rewards the finger*.
- **The moment of completing.** A static modal with a coin emoji. The app's whole metaphor is *growing things*, and the completion moment — the emotional peak of a session — shows currency, not growth. (Full treatment in `UX_DESIGN_REVIEW.md` §6: plant pop-in + mini-map.)
- **The moment of sharing.** Text-only share. For a school-age audience and their parents on WhatsApp, shares are images. A share should produce a card: snippet hook, branded pattern background, "I'm growing my forest on IndiYatra 🌿" and the app link.

Smaller friction: the social strip repeats per snippet but like-state is per snippet while bookmark semantics vary by level (snippet vs lesson) — users can't tell what they just saved; the completion modal's `showRewards` flag hides rewards in playlist mode, which is exactly when casual users are reading most.

**Design directives — Objective A**
1. Double-tap (mobile) / double-click anywhere on the story card = like, with a 350ms heart-burst at tap point (scale 0→1.4→1, fade). Strip heart animates in sync.
2. Completion modal v2: replace 🪙 with the dharma ✦ sprite and an animated tulsi sprout (400ms pop, slight overshoot); a one-line goal-gradient hint below ("2 more lessons → 🌸 Ashoka blooms"); keep badges as-is.
3. Share card: canvas-render a 1080×1350 image (hook + pattern tile + progress line + logo) and use the Web Share API with file support; fall back to current text links.
4. Award micro-dharma (+1✦, subtle toast) for first like / first bookmark / first share each day — makes the social actions part of the economy without being farmable.
5. In the save confirmation, name the thing saved: "Bookmarked *lesson*: The Churning of the Ocean" — resolves the snippet/lesson ambiguity.

---

## 3. Objective B — a Netflix/Instagram-style feed

### What the code does today
For You: a photo-tile rail with 8 fixed sections (Resume, Interest, Most Liked, Most Bookmarked, Surprise, Latest, My Likes, My Bookmarks), a content panel of ~56px text rows (thumb + title + breadcrumb sub), type filter dropdown, EntityPreview popup on row click, "Play all my likes" batch mode. GatewayPage offers a post-login hero + scrollable snippet preview + surprise. View-tracking (`useViewTracking`) feeds a real recommendations RPC — the *signal* side of an Instagram feed already exists.

### Review
The information architecture is right (the 8 sections are exactly Netflix's row taxonomy) but the *presentation* is a file manager, not a feed. Specifically:

- **Rows, not posters.** Netflix sells with 2:3/16:9 artwork at ~300px; For You rows give imagery a 48px circle. The eye has nothing to want.
- **No billboard.** Every Netflix surface leads with one big thing. For You leads with a tab rail. The Resume item *is* the billboard — it should be rendered as one (full-width, cover image, progress bar, one button).
- **Choice before content.** The user must pick a rail before seeing any story. Instagram shows content instantly and lets taste emerge from scrolling. The Relaxed view in `FORYOU_TWO_VIEWS_PROPOSAL.md` fixes this for kids; the Compact view should still lead with content (pinned Resume strip — already proposed there; endorsed).
- **Four front doors** (Home, Gateway, For You, Discover) split the "start here" energy. Netflix has one shelf-wall. For You should *be* the logged-in home; Gateway's surprise/preview ideas fold into it; Home stays logged-out-only; Discover becomes Search.
- **The missing loop: vertical story feed.** The Surprise concept + snippet swipe already exist. Chain them: an endless swipe feed of snippets (swipe up = next story, double-tap = like, long-press = save) is objective B fully achieved with components you already have. This "Flow mode" is the Instagram half; the rails are the Netflix half. Both read from existing data.

**Design directives — Objective B**
1. Ship the Two-Views proposal as specced. Add to Compact: rows become **cards** — 16:9 thumb at 96×54 minimum, title, one-line sub, thin progress bar along the card's bottom edge for in-progress items.
2. Resume = billboard: full-width card at top of For You (cover image, dark scrim, "Continue: *lesson* — snippet 4/9", saffron Continue button). Never hidden behind a tab.
3. Build **Flow mode**: vertical full-screen snippet feed fed by the surprise/recommendation queue. Entry points: "Surprise me" tile, a ▶ FAB on For You, and post-completion "Keep reading". SnippetPlayer already has 90% of the needed UI.
4. Consolidate navigation: `For You` = logged-in home (first nav item), `Courses`, `My Yatra` (see Objective C), `Search` (was Discover). Dashboard moves under the avatar menu as "Stats". Five items → four, and every one is a noun the user wants.
5. Kill the breadcrumb ("Home › Dashboard") on feed-style pages — it's a document pattern; the app is an app.

---

## 4. Objective C — gamification mapped to a visual forest

### What the code does today
`awards.js` awards dharma points per lesson plus five plant tokens (tulsi/ashoka/lotus/peepal/banyan per lesson/module/theme/level/course) with a DB-driven trigger map and dedup guard — genuinely well modelled. Dashboard shows: "Your Forest" (a 6-cell counter grid), badge cards (3 badges actually wired of the catalogue), rank gauge (Traveller tiers), leaderboard, 60-day heatmap.

### Review
The economy exists; the *world* doesn't. Counters are a wallet, not a forest; the reward pipeline ends in numbers, not growth; nothing is spatial in an app named "IndiYatra". The full proposal — a stylised India map where every token is planted at a place, themes set sacred rivers flowing, levels crown mountains, courses light Char Dham temples, quiz badges light a 12-Jyotirlinga constellation — is specced with build phases in `UX_DESIGN_REVIEW.md` §6 and demonstrated in `YatraMap_Forest_Mockup.html`. Not repeated here.

Additional review points beyond the map itself:

- **Streaks are the retention engine and they're invisible.** The heatmap is retrospective analytics; a streak is a *live possession*. Surface a flame + count in the PageHeader, and make the 7-day badge's progress visible ("day 5 of 7").
- **Badges have no ceremony and no home.** They appear in a Dashboard grid and a completion-modal row. With only 3 wired, the badge wall reads as mostly-locked disappointment. Wire more, or show only the next 2–3 attainable ones ("closest badges") plus earned ones.
- **The rank tiers (Traveller → …) are a good ladder with no rungs shown.** Display current tier + progress-to-next in the map header, not buried in a gauge.
- **Leaderboard placement.** Competition motivates some kids and demoralises others; keep it opt-in/collapsed by default, never above personal progress.

**Design directives — Objective C**
1. Build `YatraMap.jsx` per the phased plan (static map → ceremony → My Yatra page). Data: existing `loadForestTokens()` / `loadEarnedBadges()`. Replace Dashboard's "Your Forest" + "Badges" sections with it.
2. PageHeader chip: 🔥 streak count + mini dharma balance, deep-linking to My Yatra. Visible on every learner page.
3. "Next on your Yatra" signpost component (one line, heritage-blue panel): used in completion modal, For You billboard, and My Yatra. Always names the *nearest* two goals.
4. Badge wall v2: earned badges + max 3 "closest" locked badges with progress bars; the rest behind "See all".
5. Leaderboard: collapsed accordion at the bottom of My Yatra, remembers open/closed per user.

---

## 5. Page-by-page design input

### 5.1 HomePage (logged-out landing)
**Role.** First impression + course grid. **What works.** Clean hero with benefits cards; course cards have image, learner counts, bookmark affordance; skeletons on load; the guest path is honest. **Issues.** The hero says "Welcome back / Continue your Yatra" *to logged-out users* — copy mismatch (it renders only for guests: `isGuest && <hero>`). Benefits are told, not shown — "watch your forest grow" over an emoji ✶. Course-card CTA "Explore →" sits in a teal footer band that reads as decoration, not a button.
**Directives.**
1. Guest hero copy: "Begin your Yatra" / returning-user detection via localStorage for "Continue".
2. Replace the benefits column with a *live miniature*: a 3-tree Yatra-map vignette that plants one tree on scroll — show the promise, don't list it.
3. One primary CTA per card. Make the whole card clickable (it is) and the footer band a real button visually (arrow nudges right on hover).

### 5.2 AllCoursesPage + CoursePage (the "course" structure)
**Role.** Structured browsing: course → level → theme → module → lesson. **What works.** This is the strongest structural UX in the app: level tabs with lock/complete states, per-theme progress bars, state-aware CTAs (Explore → / Resume → / Review ✓), module cards washed with their own cover photo, ModuleGauge rings, `resume-target` highlight with saffron ring. Keep all of it. **Issues.** The hierarchy is deep (5 levels) and each level is a separate page-load of rows — fatigue by the third click; no token preview (completing this theme earns 🪷 — never said); locked levels say "Complete previous level" but not *what remains*.
**Directives.**
1. Add earn-previews to CTAs: "Resume → · 3 lessons to 🪷" (sprite, not emoji). This is the single cheapest way to thread Objective C into the course structure.
2. Locked level tooltip: "Finish *Themes of Dharma* (2 lessons left) to unlock" — name the blocker.
3. Collapse Modules/Lessons pages into CoursePage as expandable theme sections (AllCoursesPage already does the module→lesson inline pattern well — reuse it) so course→reading is 2 clicks, not 4.

### 5.3 ForYouPage
Covered in Objective B. Summary verdict: right taxonomy, wrong rendering density; ship Two-Views, add billboard Resume, cards-not-rows, Flow mode. One addition: the duotone photo-tile rail is the page's most distinctive visual asset — keep it as the section switcher in Compact; don't flatten it into text tabs.

### 5.4 DiscoverPage
**Role.** Taxonomy exploration: category chips + tag cloud → typed results. **What works.** The full-width term cloud is a genuinely nice browsing gesture; type pills with counts; drawer/bottom-sheet responsive pattern; staggered card animation. **Issues.** Results are text-only cards (snippet hook in a box; icon+name+chevron rows) — the least visual page in the app despite being named "Discover"; the empty state before picking a term is the whole page; no search box despite the header search icon association.
**Directives.**
1. Reposition as **Search**: add a real search input at top (title/hook full-text via Supabase `ilike` to start), tag cloud below as "or explore by tag".
2. Result cards get the branded pattern-tile treatment (Section 1c) behind the hook text — same seed logic, instant visual lift.
3. Pre-selection state: don't show emptiness — show 3 trending tags pre-expanded ("Popular right now").

### 5.5 DashboardPage
**Role.** Currently: stats + streak + progress tables + activity + forest + quiz + badges + leaderboard + share — nine sections needing an in-page "Jump to" nav, which is the tell that it's overloaded. **What works.** The data plumbing is excellent (per-course scoping, ranks RPC, heatmap derivation); stat cards are clean; share-message editor is a thoughtful parent-facing touch. **Issues.** Two audiences are interleaved: *analytics* (tables, heatmaps, quiz ranks — parent/self-tracker mindset) and *rewards* (forest, badges — child/play mindset). Neither gets a good page.
**Directives.**
1. Split: **My Yatra** (map, tokens, badges, streak flame, next-goals, collapsed leaderboard) and **Stats** (tables, heatmap, quiz performance, share block) under the avatar menu.
2. Stat cards: make the four numbers *tappable into their sections* consistently (some already are) and cut the ghost-card hack by using `grid-auto-rows` balancing instead.
3. The WhatsApp share block moves to My Yatra once the map-image share exists (share progress, not settings).

### 5.6 SnippetPlayer + QuizPlayer (core surfaces, briefly)
Best screens in the app; directives already given in Objective A. QuizPlayer addition: the score screen is honest but cold — tie quiz passes to the Jyotirlinga constellation (one shrine lights per passed quiz) so quizzes join the same world instead of being a separate exam room.

---

## 6. Motion & feel (system-wide)

One motion vocabulary, used everywhere, cheap to implement in CSS:

- **pop** (rewards): scale 0→1.06→1, 400ms, `cubic-bezier(.2,1.6,.4,1)` — plants, badges, hearts.
- **flow** (unlocks): stroke-dashoffset animation — rivers, progress bars filling.
- **rise** (cards entering): translateY(8px)+fade, 300ms, stagger 40ms — already used on Discover/Home; standardise the values.
- **settle** (sheets/modals): translateY spring, already present in share popover — reuse for completion modal.
Respect `prefers-reduced-motion` for all four.

Sound: a single soft "sprout" chime on plant/badge (opt-out in settings) would do more for "fun" than any visual — consider once sprites land.

---

## 7. Priorities (merged, supersedes §7 of UX_DESIGN_REVIEW.md)

| # | Item | Objective | Effort | Impact |
|---|---|---|---|---|
| 1 | Completion modal v2 (sprout anim + ✦ + signpost) | A, C | S | ★★★★★ |
| 2 | Double-tap like + heart-burst | A | S | ★★★★ |
| 3 | Branded pattern tiles replace picsum; plant sprite set | A, B, C | S | ★★★★ |
| 4 | Yatra Map phase 1 on Dashboard | C | M | ★★★★★ |
| 5 | Two-Views For You + billboard Resume + card rows | B | M | ★★★★★ |
| 6 | Nav consolidation (For You = home; Discover → Search; Dashboard split) | B, C | M | ★★★★ |
| 7 | Earn-previews on Course CTAs; locked-level blockers named | C | S | ★★★ |
| 8 | Flow mode (vertical snippet feed) | B | M | ★★★★★ |
| 9 | Share-as-image card | A | M | ★★★ |
| 10 | Yatra Map phases 2–3; My Yatra page; streak chip | C | L | ★★★★ |

S = days · M = 1–2 weeks · L = multi-week. Do 1–3 first: they are small, they touch the emotional peaks, and everything later builds on the sprites.
