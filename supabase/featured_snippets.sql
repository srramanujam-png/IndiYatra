-- featured_snippets
-- Slots 1–10 for the Gateway page.
-- display_order = 1 → hero card shown on the gateway page.
-- display_order = 2–10 → swipe pool launched by "Swipe through more snippets".
-- Run this once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS featured_snippets (
  display_order  integer  PRIMARY KEY CHECK (display_order BETWEEN 1 AND 10),
  snippet_id     uuid     NOT NULL REFERENCES snippet_core(snippet_id) ON DELETE CASCADE,
  set_by         uuid     REFERENCES auth.users(id),
  set_at         timestamptz DEFAULT now()
);

-- Public read (gateway page loads without auth)
ALTER TABLE featured_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "featured_public_read"
  ON featured_snippets FOR SELECT
  USING (true);

CREATE POLICY "featured_admin_all"
  ON featured_snippets FOR ALL
  USING (is_admin());
