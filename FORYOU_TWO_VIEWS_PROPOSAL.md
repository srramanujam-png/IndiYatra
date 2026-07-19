# For You — Two-View Redesign Proposal

**Date:** 18 July 2026 · **Companion mockup:** `ForYou_TwoViews_Mockup.html` (open in a browser; toggle between views, click through the Relaxed flow).
**Context:** builds on `ENGINEERING_IMPROVEMENT_MANUAL.md` Parts B (routing) and E (design tokens). Current implementation reference: `src/pages/ForYouPage.jsx` (photo-tile rail + panel).

---

## 1. Concept

Offer the same eight content sections (Resume, Based on Interest, Most Liked, Most Bookmarked, Surprise, Latest, My Likes, My Bookmarks) through two presentation modes the user can switch between at any time:

- **Compact view** — sidebar + main panel. Everything one click away, dense lists, built for older students and returning users who know what they want. This is an evolution of today's page, not a rewrite.
- **Relaxed view** — one decision per screen. Big friendly cards, sequential clicks: *choose a mood → browse a shelf → pick a lesson → land in the SnippetPlayer*. Built for younger students (Classes 3–5), first-time visitors, and touch devices.

Both views are skins over the same data and state — no duplicate fetching logic.

## 2. View switcher

- Segmented control in the page header, right-aligned: `▦ Compact | ▭ Relaxed`.
- Persist the choice per user: `localStorage["indiyatra_foryou_view"]` immediately, mirrored to `profiles` settings when signed in (same pattern as share-message settings).
- **Default:** Relaxed for signed-out/new users and Preparatory level (Classes 3–5); Compact once a user has completed ~10 lessons (they know the content by then). Never auto-switch after the user has chosen manually.
- With routing (manual Part B2): `/for-you?view=compact&tab=liked` and `/for-you/browse/liked` — the Relaxed steps become real history entries, so the browser Back button walks back up the drill-down. This is the main reason to land routing before or with this redesign.

## 3. Compact view (sidebar + main panel)

Keep the current rail-and-panel skeleton and tighten it:

**Sidebar (left, 232px desktop / 124px tablet):**
- Keep the duotone photo tiles — they're distinctive — but add a **count badge** per tab (e.g. "My Bookmarks · 12") and a thin saffron active-edge instead of the full inset ring.
- Group with two dividers: *For you* (Resume, Interest, Surprise) · *Popular* (Most Liked, Most Bookmarked, Latest) · *Mine* (My Likes, My Bookmarks) — matches how users think, not implementation order.
- Sticky within the viewport so the rail never scrolls away on long lists.

**Main panel:**
- Pinned **Resume strip** at the top regardless of active tab (one-line card: thumbnail, lesson name, "Continue → snippet 4 of 9") — resuming is the #1 action; it shouldn't require choosing the Resume tab first.
- Existing `ItemRow` list below, with the type filter (`Show: All / Lessons / Modules / Stories`) kept, plus a lightweight text filter for tabs that can grow long (My Likes/My Bookmarks).
- **Desktop ≥1024px: docked preview.** Clicking a row opens `EntityPreview` docked as a right-hand third column instead of a popup — sidebar → list → preview becomes a classic three-pane triage layout; Enter or "Start" launches the player. Below 1024px keep the popup.
- Keyboard: ↑/↓ move row focus, Enter opens preview, L/B toggle like/bookmark. Cheap to add, big power-user payoff.
- Density target: ~56px rows, 8–10 visible without scrolling.

## 4. Relaxed view (sequential clicks to a snippet)

A three-step guided flow. One question per screen, nothing else competing for attention. Every screen has a big Back control and a step trail.

**Step 1 — "What shall we explore today?"**
Six large tiles (2×3 grid, ~220px tall, duotone photos, same treatment as the rail): Continue where you left off · Picked for you · Most loved · Surprise me · What's new · My saved things. (My Likes + My Bookmarks merge into "My saved things" here — separate tabs are a Compact-view concern; a chip inside lets them flip between the two.)
- *Continue* skips everything and goes straight to the resume point in SnippetPlayer (0 further clicks).
- *Surprise me* animates briefly ("finding something wonderful…") and drops directly into a random snippet (0 further clicks). Fun beats efficiency here — this is the kids' favourite button.

**Step 2 — the shelf.** Large horizontal cards (image left, title, one-line description, chip: "9 snippets · ~6 min"), maximum 5–6 per shelf with "Show more". No filters, no metadata tables — one scroll, one choice.

**Step 3 — lesson landing.** One hero card for the chosen lesson: cover image, description, snippet count, and a single dominant **"Start reading →"** button (launches SnippetPlayer at snippet 1, or "Continue from snippet N" if partially read). Optionally a small snippet strip (numbered dots with titles on hover) for direct jumps — but the big button is the path.

**Transitions:** slide-left on descend, slide-right on Back (250ms) — motion tells the child where they are in the journey. Step trail at top: `Explore → Most loved → The Mauryas` (each crumb clickable).

**Why not more steps?** Course → Theme → Module → Lesson → Snippet is the *taxonomy*, but Relaxed view should not make children walk the tree — the shelves are already curated flat lists (recommendations, top-liked lessons). Three clicks maximum from landing to reading; the taxonomy browse stays on All Courses / Course Navigator.

## 5. Shared architecture (implementation notes)

- **One state machine, two skins.** Extract data fetching from `ForYouPage.jsx` into hooks: `useForYouSections()` returns `{resume, interest, liked, bookmarked, surprise, latest, myLikes, myBookmarks}` each as `{items, loading, error}`. `ForYouCompact.jsx` and `ForYouRelaxed.jsx` are pure presentation; `ForYouPage.jsx` becomes a thin shell holding the view toggle. This also shrinks the current 1,704-line file.
- Reuse: `ItemRow`, `EntityPreview`, `Skeletons`, `fetchContentThumbs` (Step-1 tiles and shelf cards need the same thumbnail batching the rail already does).
- Style exclusively with Part E tokens — this page and the new homepage are the two reference implementations of the design system.
- Analytics: log `view_mode` with every For You interaction for a month, then re-examine the defaults in §2 with data.
- Effort estimate: hook extraction 1 day · Compact refinements 1–2 days · Relaxed view 2–3 days · toggle + persistence ½ day.

## 6. Mobile behaviour (<768px)

**Companion mockup:** `ForYou_TwoViews_Mobile_Mockup.html` — two interactive 390px phone frames side by side.

**Compact on mobile — the sidebar becomes a chip strip.** A left rail doesn't fit a phone, so the eight tabs become a horizontally swipeable strip of photo chips (92×64px, same duotone treatment) pinned under the app bar — the pattern children already know from YouTube/Instagram stories rows. Everything else compresses rather than changes: the resume strip, type filter, and dense rows go full-width; the desktop docked preview pane becomes a **bottom sheet** (tap a row → sheet slides up with cover, description, meta, and a full-width "Start lesson" button; drag down or tap the scrim to dismiss). Keyboard shortcuts drop out; row height stays ~58px, which comfortably clears the 44px touch-target minimum with the like/bookmark icons spaced 10px apart.

**Relaxed on mobile — it barely changes, which is the point.** The flow was designed phone-first: each step is a full screen. Specifics: Step 1's grid becomes 2-across with "Continue" and "My saved things" as full-width tiles (first and last, largest touch targets for the two most personal actions); the breadcrumb collapses into a slim sticky bar — circular ← button, truncating trail (`Most loved › Ashoka…`), and three step-progress dots; Step 3's "Start/Continue reading" button becomes a **sticky CTA floating in the bottom thumb zone** over a white fade, so the primary action is always one thumb-tap away regardless of scroll position. Slide transitions are kept (and map naturally to swipe-back gestures once real routing exists).

**Recommendation:** on phones, default to Relaxed for everyone and demote Compact to an explicit opt-in via the ▦/▭ toggle (kept in the app bar). The chip-strip Compact works, but Relaxed is simply the better phone experience — big targets, no horizontal scanning, one decision at a time. Tablet (768–1024px) uses desktop layouts with the narrower rail.

## 7. Open questions for you (product decisions)

1. Should the Relaxed view fully replace the current page on mobile (<768px), where the sidebar is cramped anyway? (Recommendation: yes.)
2. "Surprise me" — random across all public snippets, or weighted toward the user's interest tags? (Recommendation: weighted, fall back to random for guests.)
3. Does "My saved things" merging Likes+Bookmarks match how students actually use the two? If they're semantically different (❤ = enjoyed, 🔖 = study later), keep them separate in Step 1 too.
