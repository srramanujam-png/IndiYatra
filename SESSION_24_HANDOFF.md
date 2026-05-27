# IndiYatra · Session 24 handoff

Visual sweep to brand-clean LLM-modern style, plus a handful of latent bugs
fixed along the way and a UUID-migration audit. Picks up from the
session-23 commit `d5db621` (`Sessions 22-23: nav overhaul, brand book
audit, mobile fixes, pre-launch prep`) — nothing was committed during
session 24; everything below is uncommitted on the working tree.

---

## 1. Design system locked in this session

Driven by the user's brief and the Brand Book Excerpt PDF (saffron 50% /
green 25% / heritage 15% ratio, Alumni Sans Bold for headlines, Source
Sans 3 Medium for body, Source Sans 3 Black for taglines).

Rules applied site-wide:

- **Background** `#FAFAF7` (bright off-white). The `PARCHMENT` constant in
  `src/lib/supabase.js` carries this value.
- **Text** `#0A0A0A` for headings, `#1F1F1F` for body. A single muted grey
  `#6B6B6B` for all meta text. No more `#1a1a2e`, `#111827`, `#374151`,
  `#9CA3AF`, `#6B7280`, `#888`, `#999` anywhere.
- **Surfaces** flat white cards with `1px solid rgba(0,0,0,0.07)` hairline
  borders. Zero decorative `box-shadow` — every shadow on `.page-section`,
  `.stat-card`, `.dash-section`, `.lesson-row`, course cards, admin stat
  cards, etc. was removed.
- **Radius** unified at `14px` (was a mix of 14 / 16 / 18). Pill controls
  remain at `999px`.
- **One accent per block.** Each block gets exactly one of `SAFFRON`,
  `HERITAGE`, or `GREEN` — applied as a 3px left rail, a 2px section-title
  underline, or a primary CTA, never two of them at once. Tinted
  backgrounds (`${SAFFRON}10`, `${HERITAGE}08`, etc.) were replaced with
  white + outlined chip.
- **Per-block accent assignment by role** (user-approved):
  - Saffron: primary CTAs, course discovery, the hero
  - Heritage blue: progress, navigation, dashboard stat values, "your
    saved stuff" (Likes, Bookmarks), all level chips
  - Cultural green: content hierarchy and the Share Your Yatra block
- **Level chips** in `LEVEL_LABELS` (`src/lib/supabase.js`) are normalised
  to heritage blue across all three levels. Was saffron / heritage / green.
- **Visibility badges** in `VISIBILITY_BADGE` are flattened to white-bg
  with coloured text only. Was three tinted backgrounds.
- **Typography**: Alumni Sans Bold and Source Sans 3 are already loaded
  via `globalStyles` in `src/styles/global.js`. Don't change this.
- **No emojis** in stat tiles, headers, or decoration. Tabler icons (`<i
  className="ti ti-..." />`) are the standard. The Tabler webfont is
  loaded globally so any `ti-*` class works.

The proposed direction was approved via a mockup widget before any code
changes; the user signed off on "vary accent by block role" and
"normalise level chips to heritage blue".

## 2. Files touched (18 total)

| File | What changed |
|---|---|
| `src/lib/supabase.js` | `PARCHMENT` → `#FAFAF7`; `LEVEL_LABELS` colours normalised to heritage; `VISIBILITY_BADGE` backgrounds flattened to white. **Schema-relevant constants stayed as text PKs**: `LEVEL_001/002/003`, `LANG_01/02/03`, `DEFAULT_LANG_ID = "LANG_03"`. |
| `src/styles/global.js` | Header underline 2.5px saffron → 1px hairline; body text `#1F1F1F`; section-title decoration switched from 4×20 saffron block (`::before`) to 2px coloured underline; `.page-section` lost its shadow; added `.rail-saffron`, `.rail-heritage`, `.rail-green` modifiers; added `.btn-green`; button hover shadows removed. |
| `src/pages/DashboardPage.jsx` | Base sweep + stat-card top accent strip hidden (`display:none`); all stat values now heritage blue (was per-stat colours); 👋 emoji removed from welcome heading; Share Your Yatra block restyled to cultural green; WA / X / Copy-link pills replaced with round 44px Tabler icon buttons (`ti-brand-whatsapp`, `ti-brand-x`, `ti-link` → `ti-check` on copy). |
| `src/pages/HomePage.jsx` | Base sweep + tagline pill outline-only on white; dark gradient overlay on course-card images softened; section heading switched to 2px saffron underline. |
| `src/pages/CoursePage.jsx`, `ModulesPage.jsx`, `LessonsPage.jsx`, `DiscoverPage.jsx`, `LikesPage.jsx`, `BookmarksPage.jsx` | Base sweep. |
| `src/pages/AdminPage.jsx` | Base sweep + **prop fix**: added `onSaveSettings` and `languages = []` to the destructure (was throwing `ReferenceError: onSaveSettings is not defined` at render → white page). |
| `src/pages/EditorPage.jsx` | Base sweep + heritage gradient header band (`linear-gradient(135deg, #00509E 0%, #1a3a6e 100%)`) flattened to solid `#00509E` + **prop fix**: added `onSaveSettings` to the destructure (same bug as AdminPage). |
| `src/pages/SnippetPlayer.jsx` | Base sweep + two warm cream gradients flattened to white/off-white + translucent saffron border (`${SAFFRON}33`) made solid. The functional mask-image gradients on the scrollable strip were preserved. |
| `src/pages/GatewayPage.jsx`, `SettingsPage.jsx` | Base sweep. The saffron-to-blue diagonal gradient on GatewayPage was flattened to white. |
| `src/components/PageHeader.jsx`, `AuthModal.jsx`, `ProfileModal.jsx` | Base sweep only. |
| `src/components/Icons.jsx`, `SettingsDrawer.jsx`, `Skeletons.jsx` | Checked and left untouched. Icons.jsx is pure SVG paths; SettingsDrawer inherits from `global.js`; Skeletons only has shimmer-animation backgrounds. |
| `src/App.jsx` | **Logic fix in `handleResume`**: added `!Array.isArray(mods)` guard and a `clearStaleRoute()` helper that nulls `profiles.last_visited_route` whenever the resume path falls through, so the same 400 doesn't keep firing. |
| `supabase/cleanup_stale_references.sql` | **New file.** Re-runnable cleanup that removes orphaned rows in `bookmarks`, `snippet_likes`, `lesson_progress`, `lesson_completions` and clears stale `profiles.last_visited_route` after the UUID migration. User has already run + committed this. |

The base sweep was applied via a single Python script of regex
replacements; the per-page specials and JSX-level changes were applied
file-by-file. Numbers: ~245 base-sweep replacements, ~19 targeted
refinements, 3 prop-destructure fixes, 2 JSX restructures (Share Your
Yatra block + stat-card colour normalisation).

## 3. Logic bugs fixed alongside the visual work

The user explicitly authorised "step out of UI/UX-only mode" partway
through the session to debug regressions that pre-dated the sweep.

1. **AdminPage white screen.** `AdminPage.jsx:877` references
   `onSaveSettings` and `languages` but the function destructure at line
   130 didn't unpack them. App.jsx had added these to `commonProps`
   during session 23 but never updated AdminPage's signature. Fixed.
2. **EditorPage same bug.** `EditorPage.jsx:1555` references
   `onSaveSettings` not destructured. Fixed.
3. **LessonsPage `onHome` false positive.** The grep flagged it but the
   reference is the JSX attribute name on `<PageHeader onHome={onBack}>`
   — not a free variable. No fix needed.
4. **Resume Yatra crash.** `handleResume` in App.jsx was fetching
   `?module_id=eq.${stale_text_id}` after the UUID migration. PostgREST
   returns a 400 with an error-object body, which is not an array, so the
   `mods.length === 0` check passed (undefined === 0 is false) and the
   code did `setSelectedModule(mods[0])` (undefined) then navigated to
   LessonsPage, which choked on `module.module_id` in the effect deps.
   Fixed with `Array.isArray` guard + self-healing clear of
   `profiles.last_visited_route`.
5. **Stale-reference 400 noise.** Self-healing clear above plus the SQL
   cleanup script collectively eliminate the repeating 400s from
   bookmarks / likes / progress pointing at deleted content.

The earlier reported Google OAuth 400 was unrelated to any of the above
— it resolved on its own once the user reloaded the dev server. Likely a
stale Supabase auth state cookie or a transient redirect-URI hiccup.

## 4. UUID migration audit (re-run if more migrations land)

The user's earlier-this-session migration converted text PKs to UUIDs on
content tables but kept `profiles` (and at the user's confirmation,
`levels` and `languages`) on text PKs.

- **No hardcoded text PKs** for content tables (`MOD_xxx`, `LES_xxx`,
  `SNIP_xxx`, `COURSE_xxx`, `THEME_xxx`, `ASSET_xxx`) exist anywhere in
  `src/`. Every query builds filters from runtime values. Safe.
- **Levels and languages stay text-keyed** by design. `LEVEL_LABELS` keys
  `LEVEL_001/002/003`, `DEFAULT_LANG_ID = "LANG_03"`, and the five
  `LANG_01`/`LANG_03` literal comparisons in `auth.js` lines 501/840/963,
  `DiscoverPage.jsx:183`, `EditorPage.jsx:348` are correct.
- **The SQL cleanup script was run and committed.** Stale rows in
  bookmarks / snippet_likes / lesson_progress / lesson_completions and
  stale `last_visited_route` values are gone.

If future migrations touch more tables, re-run the audit:

```bash
grep -rnE '"(MOD|LES|SNIP|COURSE|THEME|ASSET)_[0-9]+"' src/
grep -rn 'LEVEL_001\|LEVEL_002\|LEVEL_003\|LANG_0' src/
```

Both should stay empty (apart from the deliberate level/language
constants in `supabase.js` and a handful of `"LANG_01"` English-fallback
comparisons).

## 5. Critical gotchas for the next agent

**The Windows mount mangles file writes.** This was real. Two
independent failure modes hit during the session:

1. **The `Edit` tool truncated files by ~3 bytes** when editing near the
   end of a file with CRLF endings. Specifically `src/lib/supabase.js`
   lost its closing `];\n` after the last `Edit` call and had to be
   rewritten. Workaround: prefer `Read` followed by Python-driven
   `str.replace` and `open(..., 'w', encoding='utf-8', newline='\n')`
   for any non-trivial edit. Always tail-check the file via
   `tail -c 30 file | xxd` after editing.
2. **The `Write` tool padded files with trailing NUL bytes** on some
   writes. After every `Write`, run:
   ```python
   data = open(path,'rb').read(); stripped = data.rstrip(b'\x00')
   if len(stripped) != len(data): open(path,'wb').write(stripped)
   ```

**`@babel/preset-react` is not in `node_modules`.** The brief's
recommended validator `node -e "require('@babel/core').transformSync(...,
{presets:['@babel/preset-react']})"` will fail with `Cannot find module
'@babel/preset-react'`. Use the underlying parser instead, which IS
installed:

```bash
node -e "require('@babel/parser').parse(require('fs').readFileSync('FILE','utf8'),{sourceType:'module',plugins:['jsx']}); console.log('OK')"
```

Same syntax validation, no semantic difference.

**The vite dev server cannot run inside the sandbox** — it fails on
`EPERM: operation not permitted` when trying to unlink files under
`node_modules/.vite/deps`. Use `npx vite build --outDir /tmp/iy-dist-N
--emptyOutDir` to confirm production-build syntax. Runtime errors must
be debugged from the user's local dev server via their browser console.

**`git checkout HEAD -- file` may fail with a stuck `.git/index.lock`.**
Lock file can't be removed (EPERM on the mount). Workaround: use
`git show HEAD:path > path` via Python or bash to write the HEAD blob
directly to the working tree.

## 6. Path mappings

The user's IndiYatra root is at `C:\Users\srram\IndiYatra` (host) which
appears at `/sessions/<id>/mnt/IndiYatra` inside the shell sandbox.
File tools (`Read`, `Write`, `Edit`, `Grep`, `Glob`) use the Windows
path; shell commands use the `/sessions/.../mnt/IndiYatra` path. Don't
mix them.

## 7. What's open

Nothing blocking. Plausible next-session items:

- Commit the working tree. Everything has been validated by
  `@babel/parser` and the production vite build. A single squash commit
  is fine.
- Decide whether the `dist/` permission issue on Windows is worth fixing
  (it blocks `npx vite build` without `--outDir` override).
- If the migration eventually moves on to `levels` and `languages`,
  reverse the text-PK references in `supabase.js`, `auth.js`,
  `DiscoverPage.jsx`, `EditorPage.jsx` per the audit notes.
- The `Sources:` citation list at the end of agent messages was used per
  the citation rule in the system prompt; if you want different
  attribution conventions, override accordingly.

## 8. Quick reference: brand values

```js
SAFFRON   = "#FF8E00"   // primary, 50% — CTAs, hero
HERITAGE  = "#00509E"   // structural, 15% — nav, progress, "yours"
GREEN     = "#00924A"   // supporting, 25% — content hierarchy, share
PARCHMENT = "#FAFAF7"   // off-white bg
                          // (deliberately omitted: Mint Aqua #B5FFE1,
                          //  Sunlit Yellow #F8F991, Vermilion Rose
                          //  #EB5160 — the brand book's secondaries.
                          //  User locked the palette to 3 primaries.)

text-heading  = #0A0A0A
text-body     = #1F1F1F
text-meta     = #6B6B6B
border        = rgba(0,0,0,0.07)
radius        = 14px
shadow        = none
```

Headlines: Alumni Sans Bold. Body: Source Sans 3 Medium. Tagline:
Source Sans 3 Black.

Hand it over and good luck.
