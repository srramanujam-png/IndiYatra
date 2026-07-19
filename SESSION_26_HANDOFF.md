# IndiYatra · Session 26 Handoff

Picks up from Session 25. Two separate workstreams completed this session.

---

## 1. Bug fix — Idle browser refresh behaviour

### Problem
When the browser tab was left idle, Supabase's `autoRefreshToken` fires a `TOKEN_REFRESHED` event (also triggered by the browser's `visibilitychange` when the user returns to the tab). The `onAuthStateChange` handler was processing this event identically to a real sign-in: calling `setUser(u)` with a new session object (different reference → app-wide re-render) and re-fetching the profile unnecessarily. This caused the app to feel like it "refreshed" on idle return.

### Fix — `src/hooks/useAuth.js`
Added an early return for `TOKEN_REFRESHED` events:
```js
if (_event === "TOKEN_REFRESHED") return;
```
The Supabase client already holds the new token after this event — React state doesn't need to change at all.

### Fix — `src/App.jsx`
- Added `const redirectResetTimer = useRef(null)` ref
- Debounced the `hasRedirectedOnLoginRef` guard reset by 3 seconds. Previously, a transient `SIGNED_OUT` + `SIGNED_IN` sequence (e.g. network blip) would reset the guard and potentially redirect the user back to the dashboard mid-session. With the debounce, if the profile comes back within 3 s the guard stays set and no unwanted redirect fires.

### Build status
✓ Build passes — verified with `npx vite build --outDir /tmp/iy-idle-fix --emptyOutDir`

---

## 2. Taxonomy tags masterlist

### What was done
- Extracted the Theme Index from all 11 volumes of the *Encyclopaedia of Hinduism* (scanned PDF, 385 pages) using OCR (pytesseract + pdf2image) on the specific page ranges below
- Merged with the user's curated tag list
- Produced a 79-tag masterlist

### Theme Index page ranges (for reference)
| Volume | Pages |
|--------|-------|
| Vol 1  | 11–15 |
| Vol 2  | 38–41 |
| Vol 3  | 71–75 |
| Vol 4  | 103–107 |
| Vol 5  | 150–154 |
| Vol 6  | 185–189 |
| Vol 7  | 219–225 |
| Vol 8  | 259–264 |
| Vol 9  | 288–292 |
| Vol 10 | 326–331 |
| Vol 11 | 370–374 |

Source PDF: `E:\IndiYatra\Olympiad Curriculum\Encyclopaedia\Index Merged.pdf`

### Output files
- `C:\Users\srram\IndiYatra\tags_masterlist.md` — 79-tag masterlist with merge notes
- `C:\Users\srram\IndiYatra\supabase\taxonomy_terms_seed.sql` — SQL to populate `taxonomy_terms`

### taxonomy_terms table structure
```
term_id  TEXT  (TERM_001 … TERM_079)
name     TEXT
type     TEXT  ('tag' for all 79)
slug     TEXT  (kebab-case, e.g. 'temples-and-caves')
```

### Supabase status
SQL was run in the Supabase SQL Editor. All 79 tags are now in `taxonomy_terms` (TERM_001 = Aesthetics … TERM_079 = Yoga).

---

## 3. Next session — Map snippets to tags

### Goal
Assign 2–5 tags from the 79-tag masterlist to each of the 931 snippets.

### What to prepare / bring
- The Excel file used to originally populate the 931 snippets (user has it)
- Confirm which column(s) contain the snippet content/title/description that will be used for classification

### Approach (to implement next session)
1. Read the snippet Excel file
2. For each snippet, send title + body to Claude for classification against the 79-tag list
3. Output a mapping table: `snippet_id → [TERM_XXX, TERM_YYY, ...]`
4. Insert into `content_taxonomy_mapping (term_id, entity_id, entity_type)` with `entity_type = 'snippet'`

### Key table: `content_taxonomy_mapping`
```sql
-- entity_type CHECK: ('snippet', 'lesson', 'module', 'theme', 'course')
INSERT INTO content_taxonomy_mapping (term_id, entity_id, entity_type)
VALUES ('TERM_027', 'SNIP_00042', 'snippet')
ON CONFLICT DO NOTHING;
```

---

## 4. Critical gotchas (carry forward)

**Windows mount file truncation**: Edit tool truncates files near EOF with CRLF endings and multi-byte Unicode characters. Always use Python `str.replace` + `open(..., 'w', encoding='utf-8', newline='\n').write(src)` for non-trivial edits. Tail-check after every write.

**`@babel/parser` syntax check**:
```bash
node -e "require('@babel/parser').parse(require('fs').readFileSync('FILE','utf8'),{sourceType:'module',plugins:['jsx']}); console.log('OK')"
```

**Vite dev server can't run in sandbox** (EPERM on node_modules/.vite). Use:
```bash
npx vite build --outDir /tmp/iy-dist-N --emptyOutDir
```

**pip installs**: Always use `--break-system-packages` flag.

**OCR of scanned PDF**: Use `pdf2image` + `pytesseract` at `dpi=150`. Process max 4–5 pages per bash call to stay within the 45 s timeout.

---

## 5. Brand / design system (unchanged)

```
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

## 6. Path mappings

- Windows (file tools): `C:\Users\srram\IndiYatra`
- Bash (shell): `/sessions/<id>/mnt/IndiYatra`
- Encyclopaedia: `E:\IndiYatra\Olympiad Curriculum\Encyclopaedia` → `/sessions/<id>/mnt/Encyclopaedia`
- Skills (read-only): `/sessions/<id>/mnt/.claude/skills/`
- Outputs: `/sessions/<id>/mnt/outputs/`
