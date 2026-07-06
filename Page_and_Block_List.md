# IndiYatra — Page & Block List

Design reference: every page and its inner UI blocks.
Stack: React 19 + Vite, plain CSS with CSS variables (see DESIGN_SYSTEM.MD).

---

## Learner-Facing Pages

### 1. HomePage (landing, logged-out entry)
- [ ] Hero — headline, subline, CTA row, guest note, welcome label
- [ ] Course cards grid — image, overlay, number, title, meta, footer, CTA
- [ ] Benefits section — icon + title + description cards
- [ ] Panel block — header, heading, sub, inner content

### 2. GatewayPage (post-login entry)
- [ ] Welcome pill, headline, subtitle
- [ ] Right column — scrollable snippet preview
- [ ] Swipe link
- [ ] Loading skeleton

### 3. DashboardPage
- [ ] Stats cards — Snippets Viewed, Snippets Liked, Lessons Completed, Badges Earned
- [ ] Gauge chart — user rank (Traveller / Dharma tiers)
- [ ] Activity heatmap — no / light / moderate / heavy activity
- [ ] Progress by Course chart
- [ ] Course Progress by Theme chart
- [ ] Scope pill filter — This Course / Courses
- [ ] WhatsApp share block — edit / copy message

### 4. ForYouPage
- [ ] Section headers + lesson-card carousels:
  - [ ] Most liked by others
  - [ ] Most saved by others
  - [ ] My likes
  - [ ] My bookmarks
- [ ] Continue-learning card (most recent in-progress lesson)
- [ ] "Play all my likes" action
- [ ] Carousel skeletons

### 5. DiscoverPage
- [ ] Categories block
- [ ] Type filter
- [ ] Tags word cloud (full-width term cloud)
- [ ] Snippet cards
- [ ] Row cards
- [ ] Filter panel — header + body; drawer on desktop, bottom sheet on mobile

### 6. CourseNavigatorPage
- [ ] Desktop tree column
- [ ] Mobile breadcrumb pills + detail view
- [ ] Status dots (progress indicators)

### 7. CoursePage
- [ ] Thumbnail + info header
- [ ] Level tabs
- [ ] Theme section labels
- [ ] Theme list

### 8. ModulesPage
- [ ] Module list rows — thumbnail + info

### 9. LessonsPage
- [ ] Lesson list rows

### 10. SnippetPlayer (core learning UI)
- [ ] Top bar
- [ ] Card — image / no-image header band, body
- [ ] Social strip — like / bookmark / share
- [ ] Share popover
- [ ] Comments sheet + comment input footer
- [ ] Quiz question section
- [ ] Completion modal
- [ ] Language picker modal
- [ ] Bottom nav
- [ ] Inline snippet edit panel (admin only)

### 11. QuizPlayer
- [ ] Top bar
- [ ] Segmented progress bar
- [ ] Quiz-level timer bar + per-question timer
- [ ] Two-column layout — question + image
- [ ] Options block
- [ ] Bottom nav pills
- [ ] Finish confirmation overlay
- [ ] Score screen + answer review
- [ ] Social strip

### 12. LikesPage
- [ ] Item cards — colour bar, type icon, body
- [ ] Filters
- [ ] Empty state ("Your likes live here")
- [ ] Sign-in prompt

### 13. BookmarksPage
- [ ] Item cards — colour bar, type icon, body
- [ ] Empty state

### 14. SettingsPage
- [ ] Breadcrumb
- [ ] Hero
- [ ] Settings sections

---

## Internal Pages

### 15. AdminPage
- [ ] Tabbed console
- [ ] Sheet preview
- [ ] Validation results panel
- [ ] Summary row
- [ ] Grant New Token panel
- [ ] Add row / existing rows
- [ ] Results block

### 16. EditorPage
- [ ] Role views — Supervisor / Editor / Verifier
- [ ] Tab bar
- [ ] Stats bar
- [ ] Filter bar + secondary filters
- [ ] Content browser tables
- [ ] Selection action bar
- [ ] Taxonomy picker
- [ ] Draft edit form
- [ ] Assignment form
- [ ] Event log panel
- [ ] Status pills / badges (StatusBadge, ContentTypeTag, CsTag, SubRoleBadge)
- [ ] Toast
- [ ] Empty state

---

## Shared Blocks (used across pages)

- [ ] PageHeader — nav, search, user menu
- [ ] AppFooter
- [ ] CourseSidebar
- [ ] AuthModal — login / signup
- [ ] ProfileModal
- [ ] SettingsDrawer
- [ ] RecommendationsRail — horizontal carousel
- [ ] Skeletons — loading placeholders
- [ ] Icons — icon set
