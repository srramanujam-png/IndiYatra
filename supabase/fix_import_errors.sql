-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Fix import errors (run once in Supabase SQL Editor)
--
-- Fixes two bugs surfaced by the bulk-import feature:
--
--   1. asset_library INSERT blocked for all users
--      The auth.uid()-based policy was never applied to the live DB.
--      Replaced with is_admin() to be consistent with every other admin
--      write policy in this project.
--
--   2. snippet_translations.snippet_translation_id NOT NULL violation
--      The column exists in the live DB but has no DEFAULT, so every INSERT
--      that omits it fails.  Setting DEFAULT gen_random_uuid() makes it
--      behave like all other UUID primary keys in the schema.
--
-- Safe to re-run — all statements are idempotent.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Fix 1: asset_library INSERT policy ───────────────────────────────────────

-- Drop both the old auth-only policy (if it was ever applied) and any prior
-- admin policy so we always land in a clean state.
DROP POLICY IF EXISTS "asset_library_auth_insert"   ON asset_library;
DROP POLICY IF EXISTS "asset_library_admin_insert"  ON asset_library;

-- Only admins may insert new assets (consistent with every other write policy)
CREATE POLICY "asset_library_admin_insert" ON asset_library
  FOR INSERT WITH CHECK (is_admin());

-- Also add UPDATE + DELETE for completeness (idempotent drops first)
DROP POLICY IF EXISTS "asset_library_auth_update"   ON asset_library;
DROP POLICY IF EXISTS "asset_library_admin_update"  ON asset_library;
CREATE POLICY "asset_library_admin_update" ON asset_library
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "asset_library_admin_delete"  ON asset_library;
CREATE POLICY "asset_library_admin_delete" ON asset_library
  FOR DELETE USING (is_admin());


-- ── Fix 2: snippet_translations.snippet_translation_id default ───────────────

-- Give the column a default so INSERTs that omit it auto-generate a UUID.
-- If the column doesn't exist at all this will error; in that case the
-- import code fix below (which explicitly supplies the value) is sufficient
-- on its own.
ALTER TABLE snippet_translations
  ALTER COLUMN snippet_translation_id
  SET DEFAULT gen_random_uuid();
