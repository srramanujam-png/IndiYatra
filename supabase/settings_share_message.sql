-- ============================================================
-- settings_share_message.sql
-- Add share_message column to profiles table.
-- Stores the user's custom share message, persisted across devices.
-- Run in the Supabase SQL Editor.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS share_message text;

-- Verify:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'share_message';
