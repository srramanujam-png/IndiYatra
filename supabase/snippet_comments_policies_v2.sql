-- Addendum to snippet_comments.sql
-- Run this if you already ran snippet_comments.sql and hit a duplicate-policy error.
-- Adds: admin moderation delete + user edit (update) policies.

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
