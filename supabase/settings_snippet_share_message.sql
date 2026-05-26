-- Migration: add snippet_share_message to profiles
-- Run this once in the Supabase SQL editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS snippet_share_message text;
