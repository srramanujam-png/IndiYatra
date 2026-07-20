-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · PHASE 2 EVENTS TABLE  (Overhaul Roadmap item 2.6 / R3)
-- Date: 19 July 2026
--
-- HOW TO RUN: paste this ENTIRE file into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run (idempotent).
--
-- Self-hosted analytics (no third-party trackers — R1/compliance memo rule).
-- Events are pseudonymous: profile_id only, no names/emails, and readable by
-- admins only. Client writes come from src/lib/track.js (batched).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id   uuid NOT NULL,               -- auth.uid(); anonymous session ids included
  is_anonymous boolean NOT NULL DEFAULT false,
  event_type   text NOT NULL CHECK (event_type IN
                 ('view','like','unlike','bookmark','unbookmark','share',
                  'complete','quiz_start','quiz_complete','session_start')),
  content_type text CHECK (content_type IS NULL OR content_type IN
                 ('snippet','lesson','module','theme','course','quiz','question')),
  content_id   text CHECK (content_id IS NULL OR char_length(content_id) <= 100),
  route        text CHECK (route IS NULL OR char_length(route) <= 200),
  meta         jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_type_time_idx    ON events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS events_profile_time_idx ON events (profile_id, created_at DESC);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Any authenticated session (incl. anonymous) logs its OWN events only.
DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own" ON events
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Read: admins only (metrics review is an admin activity; users never see raw events).
DROP POLICY IF EXISTS "events_admin_select" ON events;
CREATE POLICY "events_admin_select" ON events
  FOR SELECT USING (is_admin());

-- No client UPDATE/DELETE policies: events are append-only from the app.

-- ── Retention (compliance memo action G) ─────────────────────────────────────
-- Run monthly (manually or via pg_cron once configured): purge anonymous-
-- session events older than 90 days.
--   DELETE FROM events WHERE is_anonymous AND created_at < now() - interval '90 days';

-- ── Baseline queries (R3 monthly review) ─────────────────────────────────────
-- Likes+bookmarks+shares per active user per day:
--   SELECT created_at::date d, count(*) FILTER (WHERE event_type IN ('like','bookmark','share'))::float
--          / GREATEST(count(DISTINCT profile_id),1) AS social_per_user
--   FROM events GROUP BY 1 ORDER BY 1 DESC LIMIT 30;
-- D1/D7 retention: cohort by first-seen date, check return on +1/+7:
--   WITH firsts AS (SELECT profile_id, min(created_at::date) d0 FROM events GROUP BY 1)
--   SELECT d0, count(*) cohort,
--     count(*) FILTER (WHERE EXISTS (SELECT 1 FROM events e WHERE e.profile_id=f.profile_id AND e.created_at::date = f.d0+1)) AS d1,
--     count(*) FILTER (WHERE EXISTS (SELECT 1 FROM events e WHERE e.profile_id=f.profile_id AND e.created_at::date = f.d0+7)) AS d7
--   FROM firsts f GROUP BY 1 ORDER BY 1 DESC LIMIT 30;
