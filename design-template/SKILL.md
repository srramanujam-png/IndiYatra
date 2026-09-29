---
name: indiyatra-design-system
description: Apply the IndiYatra design system (Heritage Blue / Cultural Green / Saffron, Oswald + Nunito Sans + Inter) to ANY website, landing page, web app, HTML artifact, dashboard, or UI component built for this user. Use whenever creating or restyling pages, sites, mockups, or components — this is the user's standard design template for all projects. Triggers on "build a site/page/app", "make it match my design", "use my template", "IndiYatra style".
---

# IndiYatra Design System

Every site, page, artifact or UI component built for this user follows this design system unless they explicitly ask for a different look. Use the tokens below verbatim — never invent new brand colours; approximate with the palette or ask.

## Setup

Load fonts and paste the token block into `:root`:

```css
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700&family=Nunito+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --color-primary: #00509E;    /* Heritage Blue — primary actions, links */
  --color-secondary: #00924A;  /* Cultural Green — success, progress, rewards ONLY */
  --color-accent: #FF8E00;     /* Saffron — CTAs, highlights, active/hover states */
  --color-browse: #4AADA8;     /* Teal — browsing chrome (card footer bands, section markers) ONLY */
  --color-bg-body: #FFFFFF;  --color-bg-alt: #B5D7D5;  --color-bg-panel: #F8F8F6;
  --color-text-main: #101828;  --color-text-body: #4A5565;  --color-text-muted: #6B6B6B; /* the ONE muted grey */
  --color-border: #E5E7EB;  --color-border-muted: #F3F4F6;  --color-danger: #c62828;
  --tint-saffron: #FFF8EE;  --tint-green: #F0FAF4;  --tint-blue: #EEF5FF;
  --tint-teal: #EAF6F5;  --tint-teal-border: #C2E4E2;
  --text-xs: .75rem; --text-sm: .875rem; --text-base: 1rem;
  --text-lg: 1.25rem; --text-xl: 2rem; --text-hero: 3.125rem;
  --radius: 12px; --radius-card: 14px; --radius-img: 10px; --radius-pill: 999px;
  --space-1: 8px; --space-2: 12px; --space-3: 16px; --space-4: 24px;
  --shadow-btn: 0 1px 0.5px 0.05px rgba(29,41,61,.02);
  --font-heading: 'Oswald','Arial Narrow',sans-serif;
  --font-body: 'Nunito Sans',system-ui,sans-serif;
  --font-ui: 'Inter',system-ui,sans-serif;
}
```

If the user's project contains `indiyatra.css` (full drop-in stylesheet) or `components.html` (component library), prefer linking/copying those over re-deriving styles.

## Typography roles (fixed)

- Headings (h1–h3): Oswald. Hero 50px/72px w700 (marketing heroes: `clamp(2rem,3.5vw,2.75rem)` line-height 1.1); section 32px w500 lh 125%; sub 20px w500.
- Body & card titles: Nunito Sans. Body 16px lh 1.5 in `--color-text-body`; card titles 0.9375–1.25rem w700 in `--color-text-main`; long-form prose 1.125rem lh 1.85 justified.
- UI (buttons, meta, badges, breadcrumbs): Inter w500–700 at 0.875rem or smaller.
- Below 1024px: root font-size 15px, h1 2.25rem, h2 1.5rem.

## Component recipes

**Buttons** — inline-flex centered, gap 8px, radius 12px, Inter 500 0.875rem, padding 12px 20px (min-height 44px; compact navbar: 10px 16px / 40px), box-shadow var(--shadow-btn), hover opacity .9. Fills: primary=Heritage Blue, strongest CTA=Saffron, finish/success=Green. Outline: transparent, 1px solid primary, primary text, hover bg rgba(0,80,158,.04). Compact CTA also lifts translateY(-1px) on hover.

**Pills/badges** — radius 999px, Inter 700 0.6875rem uppercase ls .04em, padding 3px 10px. Solid (saffron/heritage/green + white text) or soft (12% tint of the colour as bg, colour as text). Over card images: absolute bottom 10px left 10px above a scrim `linear-gradient(to bottom, transparent 45%, rgba(0,0,0,.30))`.

**Chips (filters/tabs)** — radius 999px, padding 5px 14px, Inter 500 0.875rem, 1.5px transparent border; active: saffron border + saffron text + rgba(255,142,0,.08) bg.

**Cards** — three unified skins, no drop shadows:
- Grid card: white, 1px rgba(0,0,0,.08) border, radius 14px; hover → saffron border + translateY(-2px); image (16:9, radius via overflow) scales 1.05.
- Row card: same skin, flex row, icon tile left (40px, radius 10px, 12% tint bg), title/sub middle, chevron right, padding 12px 16px.
- Module block: bg #EAF6F5, border #C2E4E2, radius 16px, padding 16px — groups row cards.
- Media card footer: Browse-Teal band, white Inter 600 0.8125rem "CTA →", darkens to #3d9994 on card hover.

**Sections** — white, 1px border, radius 12px, padding 24px, 20px stack gap. Title: Oswald 500 1.25rem with 2px saffron underline (padding-bottom 4px). Optional 3px left rail (saffron/heritage/green; radius becomes 0 12px 12px 0) with matching underline. Feature bands use --color-bg-alt.

**Callouts** — tint bg + 4px left rail + radius 0 12px 12px 0, padding 14px 18px. Saffron=key terms, green=real-life, blue=facts. Label: Inter 600 0.6875rem uppercase ls .09em in rail colour.

**Header** — sticky 64px (56px mobile), rgba(255,255,255,.97) + backdrop-blur(12px), 1px bottom border; logo left, Inter nav links (hover/active → Heritage Blue), compact saffron CTA right.

**Hero (marketing)** — 2-col grid (stack <900px): saffron uppercase eyebrow with 24×2px dash, Oswald headline, Nunito subline (max-width 440px), CTA row (saffron primary + heritage secondary); right column = benefit cards (#FAFAFA, 1px #EBEBEB, icon tile 40px saffron-tinted; hover: saffron border + soft saffron glow).

**Feedback** — toast: fixed bottom-center dark pill rgba(20,20,20,.92), white Inter 0.875rem, radius 999px. Skeleton: shimmer gradient over --color-border-muted, radius 6px, 1.5s. Dots: 18px, border-grey; active=saffron scale(1.35); done=green. Breadcrumb: Inter 0.8125rem, hover saffron, current=primary 600.

## Layout & motion

Content max-width 1100px centered (`padding: 0 1.25rem`), 24px internal rhythm, flex/grid with gap only. Motion vocabulary: pop (rewards: scale 0→1.06→1, 400ms, cubic-bezier(.2,1.6,.4,1)), rise (entering cards: fade + translateY, 300ms, 40ms stagger), flow (progress fills), settle (modals/sheets). Transitions 0.15–0.2s. Always include a `prefers-reduced-motion` guard.

## Hard rules

1. Tokens only — no raw hex in page code.
2. Green means progress/success/rewards; teal means browsing chrome; never swap them.
3. Exactly one muted grey (#6B6B6B).
4. Cards get borders, not shadows; the only shadow is --shadow-btn.
5. No emoji as UI chrome (icons are SVG); emoji allowed inside content.
6. One primary CTA per card/section.
7. When unsure, copy an existing recipe here rather than inventing a new pattern.
