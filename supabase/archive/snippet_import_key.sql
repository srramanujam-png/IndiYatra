-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · snippet_core.import_key
--
-- Adds a stable, human-readable integer key to every snippet created via
-- the bulk importer.  The key is set by the content team in their Excel
-- sheet (column: snippet_key) and persists in the DB so future import
-- batches can match and update existing snippets reliably without relying
-- on english_hook text matching.
--
-- Key rules:
--   • Integer, assigned by the content team (1, 2, 3 …)
--   • Globally unique across all snippets (enforced by partial unique index)
--   • Nullable — snippets created manually through the editor have no key
--   • Monotonically increasing — each new batch starts from max(import_key)+1
--
-- Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add column ─────────────────────────────────────────────────────────────
ALTER TABLE snippet_core
  ADD COLUMN IF NOT EXISTS import_key INTEGER;

-- ── 2. Unique partial index (NULLs excluded so manual snippets don't clash) ───
CREATE UNIQUE INDEX IF NOT EXISTS idx_snippet_core_import_key
  ON snippet_core (import_key)
  WHERE import_key IS NOT NULL;

-- ── 3. Regular index for fast max() lookup (next-key counter in the UI) ───────
CREATE INDEX IF NOT EXISTS idx_snippet_core_import_key_btree
  ON snippet_core (import_key);

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT
  COUNT(*)                              AS total_snippets,
  COUNT(import_key)                     AS snippets_with_key,
  COALESCE(MAX(import_key), 0) + 1      AS next_available_key
FROM snippet_core;
