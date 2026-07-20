-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Asset Library — Table + RLS
-- Run in Supabase SQL Editor.  Idempotent — safe to re-run.
--
-- The asset_library table holds image metadata (URL, alt text, attribution)
-- for snippet images, course covers, theme thumbnails, and module covers.
-- Without a public SELECT policy the anon-key reads used by every content page
-- return empty and all images disappear.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Table ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_library (
  asset_id     TEXT        PRIMARY KEY,          -- e.g. ASSET_00001
  file_path    TEXT        NOT NULL,             -- public URL (Supabase Storage or external)
  asset_type   TEXT        NOT NULL DEFAULT 'IMAGE',
  alt_text     TEXT        NOT NULL DEFAULT '',
  attribution  TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE asset_library ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read — images are public content
DROP POLICY IF EXISTS "asset_library_public_read" ON asset_library;
CREATE POLICY "asset_library_public_read" ON asset_library
  FOR SELECT USING (true);

-- Authenticated users (admin / editorial) can insert new assets
DROP POLICY IF EXISTS "asset_library_auth_insert" ON asset_library;
CREATE POLICY "asset_library_auth_insert" ON asset_library
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update existing assets (e.g. re-upload image)
DROP POLICY IF EXISTS "asset_library_auth_update" ON asset_library;
CREATE POLICY "asset_library_auth_update" ON asset_library
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ── 3. Index ─────────────────────────────────────────────────────────────────
-- Fast lookups by file_path (used by the importer to avoid duplicate inserts)
CREATE INDEX IF NOT EXISTS idx_asset_library_file_path ON asset_library (file_path);
