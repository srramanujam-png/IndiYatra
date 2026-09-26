# IndiYatra Design System — Style Guide

The standard design template for all projects, extracted from the IndiYatra platform (source of truth: `src/index.css`, `src/styles/global.js`, `DESIGN_SYSTEM.MD`). Every new site or page should follow this guide. The companion files are `indiyatra.css` (drop-in stylesheet with all tokens and components) and `components.html` (live component library).

## 1. Design philosophy

Clarity, readability, and a professional aesthetic. Consistent spacing, hierarchy, and colour usage across all modules. Use design tokens exclusively — never raw hex values in project code. Do not invent new brand colours; approximate with the existing palette or ask.

## 2. Colour palette

The brand is three colours with strictly assigned roles, supported by a disciplined neutral set.

Heritage Blue `#00509E` (`--color-primary`) is for primary actions, links and emphasis. Cultural Green `#00924A` (`--color-secondary`) is reserved for success, progress and rewards. Saffron Orange `#FF8E00` (`--color-accent`) carries highlights, calls-to-action and active states. Browse Teal `#4AADA8` (`--color-browse`) is legal only for course-browsing chrome — card footer bands and section markers — never for progress, success or rewards.

Backgrounds: main body is white `#FFFFFF`; feature sections use `#B5D7D5` (`--color-bg-alt`); soft panel bands behind card grids use `#F8F8F6`; surface tint is `#FEF7FF`. Text: headlines `#101828`, body `#4A5565`, and exactly one muted grey `#6B6B6B` for meta text. Borders are `#E5E7EB` with `#F3F4F6` for sub-dividers. Danger is `#c62828`. Callout tints: saffron `#FFF8EE`, green `#F0FAF4`, blue `#EEF5FF`, teal `#EAF6F5` (border `#C2E4E2`).

## 3. Typography

Three families, each with a fixed role, loaded from Google Fonts (Oswald 400/500/700; Nunito Sans 400/600/700 + italic; Inter 400/500).

Oswald (fallback 'Arial Narrow') is the heading face: hero headings at 50px/72px weight 700 (fluid `clamp(2rem, 3.5vw, 2.75rem)` on marketing heroes), section headings at 32px weight 500 with 125% line height. Nunito Sans is the reading face: card titles at 20px weight 700, body at 16px with 150% line height. Inter is the UI face: buttons, meta, breadcrumbs and badges at 14px (or smaller) weight 500–700.

The five-role type scale: `--text-xs` 0.75rem (meta, badges), `--text-sm` 0.875rem (UI, buttons), `--text-base` 1rem (body), `--text-lg` 1.25rem (card titles), `--text-xl` 2rem (section headings), `--text-hero` 3.125rem. Base font size drops to 15px below 1024px viewports.

## 4. Shape, spacing and elevation

Border radius is 12px (`--radius`) for buttons, sections and benefit cards; 14px for unified content cards; 10px for images; 999px for pills and chips; 16px for module blocks. Spacing rhythm is 8 / 12 / 16 / 24px, with 24px as the standard internal padding and card gap. Elevation is nearly flat: the only shadow is the button shadow `0 1px 0.5px 0.05px rgba(29,41,61,0.02)` — cards rely on 1px borders, not shadows. Page containers max out at 1100px content width (1440px app shell), centred with `margin: 0 auto`. Use flex/grid with `gap` for all alignment.

## 5. Components

**Buttons.** All buttons: inline-flex centred, radius 12px, Inter 500 at 0.875rem, padding 12×20 (min-height 44px) or compact 10×16 (min-height 40px), the standard button shadow, hover opacity 0.9. Variants: `.btn-primary` (Heritage Blue fill), `.btn-saffron` (accent fill — the strongest CTA), `.btn-green` (finish/success), `.btn-outline` (transparent with 1px Heritage border; hover washes `rgba(0,80,158,0.04)`), `.btn-compact` (navbar; hover also lifts −1px).

**Pills and badges.** Radius 999px, Inter 700 at 0.6875rem, uppercase with 0.04em letter-spacing, padding 3×10. Solid variants in saffron / heritage / green on white text; soft variants use a 12% tint of the colour; outline variant for neutral meta tags. Image-corner pills sit 10px from the bottom-left over a bottom scrim gradient.

**Chips (filters/tabs).** Radius 999px, Inter 500 at 0.875rem, padding 5×14, transparent with a 1.5px transparent border; active state paints border and text saffron over an 8% saffron wash.

**Cards.** Three unified treatments shared everywhere: the grid card (white, 1px `rgba(0,0,0,0.08)` border, radius 14px, no shadow; hover paints the border saffron and lifts −2px), the row card (same skin, horizontal: icon left, title/subtitle middle, chevron right, padding 12×16), and the module block (teal tint `#EAF6F5`, border `#C2E4E2`, radius 16px, groups row cards). Media-card anatomy: 16:9 image with a bottom scrim overlay and a category pill, body with Nunito 700 title and Inter meta row, and a Browse-Teal footer CTA band (white text, darkens to `#3d9994` on hover; image scales 1.05 on card hover).

**Sections.** White cards with 1px border, radius 12px, 24px padding, 20px stacked gap. Section titles are Oswald 500 at 1.25rem with a 2px accent underline. Sections may carry a 3px coloured left rail (saffron/heritage/green — radius flattens to `0 12px 12px 0`), with the title underline matching the rail colour. Feature sections use `alt-bg`. Panel headings on browsing surfaces use a 4×22px teal marker bar.

**Callouts.** Tinted blocks with a 4px coloured left rail and radius `0 12px 12px 0`, padding 14×18: saffron for key terms, green for real-life notes, blue for facts/quiz context. Labels are Inter 600 at 0.6875rem, uppercase, 0.09em tracking, in the rail colour; body text is Nunito at 1.125rem/1.7.

**Header.** Sticky, 64px (56px mobile), `rgba(255,255,255,0.97)` with 12px backdrop blur, 1px bottom border. Logo left (max 36px tall), Inter nav links centre (active/hover in Heritage Blue), compact saffron CTA right.

**Breadcrumb.** Inter at 0.8125rem; links in body colour hover to saffron; separators in border colour; current page Heritage Blue 600. (Skip breadcrumbs on feed-style pages.)

**Hero (marketing).** Two-column grid (1fr/1fr, 56px gap; stacks under 900px): left has a saffron uppercase eyebrow with a 24×2px dash, Oswald 700 fluid headline, Nunito subline max-width 440px, then a CTA row (saffron primary + secondary); right holds benefit cards — `#FAFAFA` tiles with a 40px saffron-tinted icon tile, hovering to a saffron border and soft glow.

**Feedback.** Toast: fixed bottom-centre dark pill `rgba(20,20,20,0.92)`, white Inter text, radius 999px. Skeletons: shimmer gradient across `--color-border-muted`, radius 6px, 1.5s ease-in-out loop. Progress dots: 18px circles in border grey; hover previews saffron; active is saffron scaled 1.35; done is green.

**Prose.** Long-form explanation text at 1.125rem/1.85 justified; citations italic at 0.75rem above a top border. Footer: centred, 0.8125rem, top border.

## 6. Motion

One vocabulary, four moves, all CSS-cheap: **pop** (rewards — scale 0→1.06→1, 400ms, `cubic-bezier(.2,1.6,.4,1)`), **flow** (progress filling — stroke-dashoffset), **rise** (cards entering — translateY(8–20px)+fade, 300ms, 40ms stagger), **settle** (sheets/modals — translateY spring). Standard transitions run 0.15–0.2s. Always respect `prefers-reduced-motion`.

## 7. Rules of engagement

Reference tokens (`var(--color-…)`, `var(--text-…)`, `var(--radius)`, `var(--space-…)`) — raw hex in source is a lint error. Every card shares the unified border/radius/hover treatment. Icons come from one icon set (SVG/Tabler-style), never emoji as UI chrome. One primary CTA per card. Fixed widths must centre and collapse responsively. When in doubt, copy an existing pattern from `components.html` rather than inventing a new one.
