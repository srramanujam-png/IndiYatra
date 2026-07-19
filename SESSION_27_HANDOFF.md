# IndiYatra · Session 27 Handoff

Picks up from Session 26.

---

## 1. Taxonomy terms seed — refreshed

### Files
- `supabase/taxonomy_seed_consolidated.sql` — runs both seeds in one shot:
  - **79 tags** (TERM_001 Aesthetics → TERM_079 Yoga)
  - **13 categories** (CAT_001 God & Theology → CAT_013 Society & Culture)
  - Uses `ON CONFLICT DO UPDATE` — safe to re-run

### Status
⚠️ **Pending Supabase run** — Supabase session expired during session. File is ready; run it once signed in.

---

## 2. Snippet taxonomy mapping — generated

### What was done
- Classified all **778 snippets** from `snippets_for_gemini.csv` against the 79-tag masterlist
- Keyword/phrase scoring classifier (strong signals = 2 pts, weak = 1 pt, per-term min thresholds)
- Manual patches for 19 snippets with empty explanations (Mahabharata characters, geography, Ahilyabai/Holkar, etc.)

### Output
- `supabase/snippet_taxonomy_mapping.sql` — ready to run in Supabase SQL Editor
  - **2,384 rows** into `content_taxonomy_mapping` (`entity_type = 'snippet'`)
  - **Avg 3.1 tags per snippet**
  - **0 unclassified snippets** (all 778 covered)

### Tag distribution (top 10)
| Term | Tag | Snippets |
|------|-----|----------|
| TERM_027 | Gods and Goddesses | 467 |
| TERM_071 | Temples and Caves | 188 |
| TERM_051 | Mythological Characters | 176 |
| TERM_034 | Itihasa/Purana | 160 |
| TERM_009 | Battles/Weaponry | 126 |
| TERM_037 | Kings | 111 |
| TERM_020 | Festivals | 101 |
| TERM_062 | Rituals | 74 |
| TERM_056 | Places | 65 |
| TERM_002 | Animals | 56 |

### Status
⚠️ **Pending Supabase run** — run in this order:
1. `taxonomy_seed_consolidated.sql` (refresh tags + categories)
2. `snippet_taxonomy_mapping.sql` (insert 2,384 mapping rows)

---

## 3. Run order for Supabase SQL Editor

```sql
-- Step 1: paste taxonomy_seed_consolidated.sql → Run
-- Step 2: paste snippet_taxonomy_mapping.sql → Run
```

Both are idempotent (`ON CONFLICT DO NOTHING` / `DO UPDATE`).

---

## 4. Next steps

- **Wire taxonomy to frontend**: query `content_taxonomy_mapping` to show tags on SnippetPlayer and filter snippets by tag on DiscoverPage
- **Review 32 single-tag snippets**: mostly very short hooks with minimal content — may want manual review
- **Category → tag mapping**: the `taxonomy_categories_seed.sql` comment block has the full CAT → TERM mapping for UI grouping

---

## 5. Critical gotchas (carry forward)

**Windows mount file truncation**: Use Python `str.replace` + `open(..., 'w', encoding='utf-8', newline='\n').write(src)` for non-trivial edits.

**`@babel/parser` syntax check**:
```bash
node -e "require('@babel/parser').parse(require('fs').readFileSync('FILE','utf8'),{sourceType:'module',plugins:['jsx']}); console.log('OK')"
```

**Vite dev server can't run in sandbox** (EPERM on node_modules/.vite). Use:
```bash
npx vite build --outDir /tmp/iy-dist-N --emptyOutDir
```

**pip installs**: Always use `--break-system-packages` flag.

---

## 6. Brand / design system (unchanged)

```
SAFFRON   = "#FF8E00"
HERITAGE  = "#00509E"
GREEN     = "#00924A"
PARCHMENT = "#FAFAF7"
```
Headlines: Alumni Sans Bold. Body: Source Sans 3 Medium. Icons: Tabler (`ti-*`).

---

## 7. Path mappings

- Windows (file tools): `C:\Users\srram\IndiYatra`
- Bash (shell): `/sessions/<id>/mnt/IndiYatra`
- Skills (read-only): `/sessions/<id>/mnt/.claude/skills/`
- Outputs: `/sessions/<id>/mnt/outputs/`
