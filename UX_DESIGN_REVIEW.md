# IndiYatra — Visual Design & UX Review

**Date:** 19 July 2026 · **Reviewer lens:** visual app design / user experience
**Companion mockup:** `YatraMap_Forest_Mockup.html` (open in a browser; use the Simulate buttons)
**Code reviewed:** all of `src/pages`, `src/lib/awards.js`, `src/config/appStrings.js`, `DESIGN_SYSTEM.MD`, `FORYOU_TWO_VIEWS_PROPOSAL.md`, `ENGINEERING_IMPROVEMENT_MANUAL.md`

---

## 1. Overall verdict

The foundations are unusually strong for a vibe-coded app: a real design system (Heritage Blue / Cultural Green / Saffron, Oswald + Nunito Sans + Inter), a complete social loop in the SnippetPlayer, a Netflix-style eight-rail For You page, and — most importantly — a **token economy that is already correctly modelled** (`awards.js`: dharma points plus five plant tokens with a DB-driven trigger map). The architecture for gamification exists.

The gap is presentation. The gamification is *accounted for* but never *seen*: "Your Forest" is a grid of six number counters buried mid-Dashboard between an activity table and quiz stats. A forest that is a spreadsheet is not a forest. The app is named IndiYatra — a journey across India — yet nothing in the UI is spatial or geographic. That is the single biggest missed opportunity, and it is fixable without touching the data model (Section 6).

## 2. Objective A — make reading, liking, bookmarking, sharing fun

**What works.** The SnippetPlayer is the best screen in the app: swipe navigation, keyboard shortcuts, mobile tap-to-reveal sheet, a social strip with like/bookmark/share, a WhatsApp-first share popover, comments, and a completion modal showing points and badges. Bookmarking reaches down to courses, themes and lessons via EntityPreview. This objective is substantially met at a functional level.

**What to improve.**

1. **The reward moment is flat.** Completion shows a static `🪙 +40` modal. The coin icon contradicts the app's own metaphor — the currency is *dharma* (✦) and the reward is a *plant*. The moment a lesson completes should show a Tulsi sprouting (400ms scale-pop animation, exactly as in the mockup), not a coin. This one animation is the highest emotional-return-per-effort change available.
2. **Likes and bookmarks are scattered across four surfaces** — LikesPage, BookmarksPage, and the My Likes / My Bookmarks rails in For You. The Two-Views proposal already merges them into "My saved things" for the Relaxed view; do the same everywhere and retire the two standalone pages.
3. **Sharing is text-first.** The WhatsApp message is editable text. Kids and parents share images. Generate a share *card* (snippet title + illustration + "I earned 40 ✦ on IndiYatra") — and later, the Yatra Map itself becomes the shareable image (Section 6).

## 3. Objective B — a Netflix/Instagram-style feed

**What works.** ForYouPage's eight rails (Resume, Interest, Most Liked, Most Bookmarked, Surprise, Latest, My Likes, My Bookmarks) are the right taxonomy, and the photo-tile rail is distinctive. The `FORYOU_TWO_VIEWS_PROPOSAL.md` (Compact/Relaxed) is the correct next step — endorsed as-is, especially "Surprise me" dropping straight into a snippet with zero further clicks.

**What to improve.**

1. **Four competing front doors.** HomePage, GatewayPage, ForYouPage and DiscoverPage all answer "where do I start?". Netflix has one front door. Recommendation: For You *is* the logged-in home; HomePage remains the logged-out landing only; GatewayPage's "surprise" and snippet-preview ideas fold into For You's Relaxed view; Discover is repositioned purely as search/browse (it is a taxonomy tool — a tag cloud and filters — which is useful but is utility, not feed).
2. **Rows read as admin tables, not media.** The content panel's ItemRows are dense text lists. A feed sells with imagery: poster-style cards (2:3 or 16:9), title overlaid, one-line hook, progress bar along the bottom edge for in-progress items. The Two-Views Relaxed shelf already goes this way — carry the same card into Compact.
3. **No vertical "next story" gesture.** Instagram's core loop is *swipe up, get another*. The SnippetPlayer already supports horizontal swipe within a lesson; a "Play all my likes" batch exists. Add an infinite "story feed" mode (Surprise as an endless vertical feed) and objective B is fully met.

## 4. Objective C — gamification (tokens, badges → visible progress)

**What exists in code.** Dharma points per lesson; Tulsi/Ashoka/Lotus/Peepal/Banyan per lesson/module/theme/level/course (clean dedup guard, DB-driven trigger map — good); badges table, but only **three badges are actually wired** (`BADGE_P02` first module, `BADGE_P05` first course, `BADGE_S02` 7-day streak); rank tiers (Traveller…); leaderboard; activity heatmap.

**Design problems.**

1. **The forest is a wallet.** Six counters with emoji. No growth, no place, no picture that improves as you learn. The entire point of a forest metaphor is *visible accumulation*.
2. **Gamification is buried.** It lives below stats tables on the Dashboard — an analytics page. Progress-as-pride needs its own destination ("My Yatra"), one click from everywhere, and a *miniature* presence on every screen (a small map thumbnail / streak flame in the PageHeader).
3. **No signposting.** Nothing tells the user "2 lessons to your next Ashoka" or "one theme to unlock the Ganga". Goal-gradient is the strongest motivator cheap to build — see the "Next on your Yatra" hint in the mockup sidebar.
4. **Streaks are invisible** outside the Dashboard heatmap. The 7-day-streak badge exists in code but the streak itself is never shown day-to-day.

## 5. Page-by-page summary

| Page | Role today | Verdict | Top fix |
|---|---|---|---|
| HomePage | Logged-out landing + course grid | Solid | Keep as logged-out only |
| GatewayPage | Post-login entry | Redundant | Fold into For You (Relaxed) |
| ForYouPage | 8-rail feed | Strong, dense | Ship Two-Views; imagery-forward cards |
| DiscoverPage | Tag cloud + filters | Utility, not delight | Reposition as Search/Browse |
| CoursePage | Levels + themes | Clear; good lock/progress states | Add per-theme token preview ("completes 🪷") |
| CourseNavigatorPage | Tree nav | Fine | — |
| DashboardPage | Stats + forest + badges + share | Overloaded | Split: analytics stays; gamification moves to **My Yatra** |
| SnippetPlayer | Core reader | Best screen | Animated plant reward; map thumbnail in completion modal |
| QuizPlayer | Quizzes | Solid | Tie quiz wins to Jyotirlinga milestones |
| Likes/BookmarksPage | Saved items | Duplicative | Merge into "My saved things" |

## 6. Proposal — the Yatra Map ("Forest of Bharat")

**Concept.** A stylised map of India that fills with forest as the user learns. Every token the app *already awards* becomes something planted at a place; every tier completed unlocks a geographic milestone. The map is the user's progress, portrait-of-a-journey style. Open `YatraMap_Forest_Mockup.html` and press the Simulate buttons to feel it.

**Token → map mapping** (no data-model changes needed — this is a pure view over `user_tokens` / `user_badges`):

| Earned | Token | On the map |
|---|---|---|
| Lesson | 🌿 Tulsi | A tulsi sprouts (pop-in animation) in the current region |
| Module | 🌸 Ashoka | An ashoka blooms |
| Theme | 🪷 Lotus | A lotus floats — and a **sacred river starts flowing** (Ganga → Yamuna → Narmada → Godavari → Kaveri → Brahmaputra), animated water |
| Level | 🌳 Peepal | A peepal rises — and a **sacred mountain is crowned** (Kailash, Vindhya, Aravalli, Nilgiri) |
| Course | 🌲 Banyan | A banyan grove — a **Char Dham temple lights up** (Badrinath, Dwarka, Puri, Rameswaram) and the region gains a green forest tint |
| Dharma points | ✦ | Seed balance in the header; spendable later (cosmetic tree varieties, festival decorations) |
| Quiz badges | 🔱 | **Jyotirlinga network** — 12 shrine dots that light up, forming a pilgrim constellation |

**Why this works.** It converts counters into a *place* (endowed progress: the map is never empty after lesson one), gives every tier a distinct, culturally resonant ceremony (river flows, lamps lit), creates natural long-term goals (Char Dham 3/4 is impossible to abandon), and produces a genuinely shareable artifact — "look at my forest" beats "I have 47 tokens".

**Placement.**

1. **My Yatra page** (new, replaces Dashboard's Forest + Badges sections): full map, milestone checklist, next-goal hint, leaderboard.
2. **Completion modal:** a 160px mini-map showing *this* plant popping in — the reward lands geographically at the moment of dopamine.
3. **PageHeader:** tiny map/streak chip → deep-links to My Yatra.
4. **Share:** render the map to PNG (SVG → canvas) as the WhatsApp share image.

**Build phases** (React: a `YatraMap.jsx` component fed by the existing `loadForestTokens()` / `loadEarnedBadges()`):

- **Phase 1 — static map.** SVG India + tree sprites positioned deterministically from token counts (the mockup's seeded-slot approach; same tokens always render the same forest). Rivers/mountains/temples in locked (grey) or unlocked state. Ship on Dashboard first.
- **Phase 2 — ceremony.** Pop-in planting animation on award, river-flow animation, unlock toasts, mini-map in the completion modal, "Next on your Yatra" hints.
- **Phase 3 — depth.** My Yatra page, share-as-image, Jyotirlinga quiz constellation, dharma-point spending (cosmetics), seasonal events (Diwali diyas on the map).

**Craft notes.** The mockup uses emoji sprites as placeholders — for production, commission or generate a small set of flat SVG tree/temple sprites in the brand palette (emoji rendering varies by platform and will look off-brand on Android). Keep geography *stylised* and label it so; a school audience will forgive a friendly map, not a wrong-looking "accurate" one. The external-boundary depiction of an India map is politically sensitive — a soft, obviously illustrative silhouette avoids the issue better than a precise one.

## 7. Priority order

1. Reward animation in SnippetPlayer completion modal (plant pop + ✦ instead of 🪙) — days, not weeks.
2. Phase 1 Yatra Map on Dashboard, replacing the token counter grid.
3. Next-goal signposting (completion modal + For You resume strip).
4. Ship the Two-Views For You redesign (already specced).
5. Consolidate front doors (For You = home) and merge Likes/Bookmarks.
6. Phase 2/3 map ceremony, My Yatra page, share-as-image.
7. Wire more badges — only 3 of the catalogue currently award.
