-- snippet_comments table
-- Run this once in Supabase SQL Editor.
-- Allows per-snippet threaded comments from any authenticated user (including anonymous/guest).

CREATE TABLE IF NOT EXISTS snippet_comments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snippet_id  text NOT NULL,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name   text,                          -- display name at time of posting
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snippet_comments_snippet_idx
  ON snippet_comments (snippet_id, created_at DESC);

ALTER TABLE snippet_comments ENABLE ROW LEVEL SECURITY;

-- Anyone (anon key or authenticated) can read comments
CREATE POLICY "comments_public_read"
  ON snippet_comments FOR SELECT
  USING (true);

-- Any authenticated session (signed-in or anonymous guest) can post
CREATE POLICY "comments_insert_auth"
  ON snippet_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = profile_id);

-- Users can delete their own comments only
CREATE POLICY "comments_delete_own"
  ON snippet_comments FOR DELETE
  USING (auth.uid() = profile_id);

-- Admins (ROLE_01) can delete any comment for moderation
CREATE POLICY "comments_delete_admin"
  ON snippet_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles_mapping
      WHERE profile_id = auth.uid() AND role_id = 'ROLE_01'
    )
  );

-- Users can update (edit) their own comments only
CREATE POLICY "comments_update_own"
  ON snippet_comments FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);
