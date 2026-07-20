-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · PHASE 1 COMMENT MODERATION  (Overhaul Roadmap item 1.5, part 2)
-- Date: 19 July 2026
--
-- HOW TO RUN: paste this ENTIRE file into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run (idempotent). Nothing here deletes data.
--
-- Covers the two remaining 1.5 pieces:
--   §1  blocked_words table + seed list (English + Hindi/Hinglish)
--   §2  contains_profanity() + trigger on snippet_comments (server-side filter)
--   §3  comment_reports table + RLS (user reporting → admin queue)
--
-- The client mirrors the wordlist in src/lib/profanity.js for a friendly
-- pre-submit message; THIS trigger is the actual enforcement.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════════════
-- §1  BLOCKED WORDS
-- match_mode 'word'  = whole-word match (\m…\M) — safe for short words
-- match_mode 'substr'= substring match — only for strings that can't appear
--                      inside innocent words
-- Note: 'bc' and 'mc' are deliberately ABSENT — "300 BC" is everywhere in a
-- history app. Their full forms are listed instead.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS blocked_words (
  word       text PRIMARY KEY,
  lang       text NOT NULL DEFAULT 'en',
  match_mode text NOT NULL DEFAULT 'word' CHECK (match_mode IN ('word','substr')),
  added_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blocked_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_words_admin_all" ON blocked_words;
CREATE POLICY "blocked_words_admin_all" ON blocked_words
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO blocked_words (word, lang, match_mode) VALUES
  -- English
  ('fuck','en','substr'), ('motherfucker','en','substr'),
  ('shit','en','word'), ('bullshit','en','word'),
  ('bitch','en','word'), ('bastard','en','word'),
  ('asshole','en','word'), ('arsehole','en','word'),
  ('dick','en','word'), ('dickhead','en','word'),
  ('cock','en','word'), ('pussy','en','word'), ('cunt','en','word'),
  ('slut','en','word'), ('whore','en','word'),
  ('faggot','en','word'), ('fag','en','word'),
  ('nigger','en','substr'), ('nigga','en','substr'),
  ('retard','en','word'), ('retarded','en','word'),
  ('wanker','en','word'),
  ('porn','en','word'), ('nude','en','word'), ('nudes','en','word'),
  ('sexy','en','word'),
  ('rape','en','word'), ('rapist','en','word'),
  ('kys','en','word'), ('kill yourself','en','substr'),
  -- Hindi / Hinglish (romanized)
  ('madarchod','hi','substr'), ('maderchod','hi','substr'),
  ('behenchod','hi','substr'), ('bhenchod','hi','substr'), ('behanchod','hi','substr'),
  ('bhosdike','hi','substr'), ('bhosdi','hi','substr'), ('bsdk','hi','word'),
  ('chutiya','hi','substr'), ('chutiye','hi','substr'), ('chutia','hi','substr'),
  ('gandu','hi','word'), ('gaandu','hi','word'),
  ('gand','hi','word'), ('gaand','hi','word'),
  ('lund','hi','word'), ('loda','hi','word'), ('lauda','hi','word'),
  ('lodu','hi','word'), ('lawda','hi','word'),
  ('chod','hi','word'), ('chodu','hi','word'), ('choda','hi','word'),
  ('randi','hi','word'), ('raand','hi','word'),
  ('harami','hi','word'), ('haramzada','hi','word'), ('haramzade','hi','word'),
  ('kamina','hi','word'), ('kamine','hi','word'),
  ('kutti','hi','word'),
  ('tatti','hi','word'),
  ('jhaant','hi','word'), ('jhant','hi','word'),
  ('bhadwa','hi','word'), ('bhadwe','hi','word'),
  ('hijra','hi','word'), ('chakka','hi','word'),
  ('madharchod','hi','substr'), ('bhosadike','hi','substr')
ON CONFLICT (word) DO NOTHING;


-- ═════════════════════════════════════════════════════════════════════════════
-- §2  PROFANITY CHECK FUNCTION + TRIGGER
-- Normalisation: lowercase → leet-speak map (0→o 1→i 3→e 4→a 5→s 7→t @→a $→s
-- !→i) → repeated-letter collapse ("fuuuuck" → "fuck").
-- SECURITY DEFINER so it can read blocked_words regardless of caller's RLS;
-- search_path pinned (A6 hygiene).
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION contains_profanity(p_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  norm text;
  collapsed text;
  r record;
BEGIN
  IF p_text IS NULL OR p_text = '' THEN RETURN false; END IF;

  norm := translate(lower(p_text), '013457@$!', 'oieastasi');
  -- "fuuuuck" → "fuck": collapse every repeated-letter run to one letter.
  -- Both variants are checked, so blocklist words with legit double letters
  -- (e.g. "tatti") still match via norm.
  collapsed := regexp_replace(norm, '(.)\1+', '\1', 'g');

  FOR r IN SELECT word, match_mode FROM blocked_words LOOP
    IF r.match_mode = 'substr' THEN
      IF position(r.word IN norm) > 0 OR position(r.word IN collapsed) > 0 THEN
        RETURN true;
      END IF;
    ELSE
      IF norm ~ ('\m' || r.word || '\M') OR collapsed ~ ('\m' || r.word || '\M') THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION snippet_comments_profanity_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF contains_profanity(NEW.body) THEN
    RAISE EXCEPTION 'COMMENT_BLOCKED: comment contains language that is not allowed'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_profanity ON snippet_comments;
CREATE TRIGGER trg_comments_profanity
  BEFORE INSERT OR UPDATE OF body ON snippet_comments
  FOR EACH ROW EXECUTE FUNCTION snippet_comments_profanity_guard();


-- ═════════════════════════════════════════════════════════════════════════════
-- §3  COMMENT REPORTS (admin delete-and-report queue)
-- Body/author are SNAPSHOTTED at report time so the report survives comment
-- deletion (comment_id goes NULL via ON DELETE SET NULL).
-- Any authenticated session may report (including anonymous — reporting is
-- safety-positive); one report per session per comment.
-- Only admins read/update the queue; reporters can read their own reports
-- (lets the UI show "already reported" across sessions).
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS comment_reports (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id         uuid REFERENCES snippet_comments(id) ON DELETE SET NULL,
  snippet_id         text,
  comment_body       text NOT NULL,
  comment_author     text,
  comment_author_id  uuid,
  reporter_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason             text CHECK (reason IS NULL OR char_length(reason) <= 300),
  status             text NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','resolved','dismissed')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  resolved_at        timestamptz,
  resolved_by        uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS comment_reports_one_per_reporter
  ON comment_reports (comment_id, reporter_id) WHERE comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS comment_reports_status_idx
  ON comment_reports (status, created_at DESC);

ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_reports_insert_own" ON comment_reports;
CREATE POLICY "comment_reports_insert_own" ON comment_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "comment_reports_select" ON comment_reports;
CREATE POLICY "comment_reports_select" ON comment_reports
  FOR SELECT USING (is_admin() OR auth.uid() = reporter_id);

DROP POLICY IF EXISTS "comment_reports_admin_update" ON comment_reports;
CREATE POLICY "comment_reports_admin_update" ON comment_reports
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "comment_reports_admin_delete" ON comment_reports;
CREATE POLICY "comment_reports_admin_delete" ON comment_reports
  FOR DELETE USING (is_admin());

-- ─── End of comment moderation ───────────────────────────────────────────────
