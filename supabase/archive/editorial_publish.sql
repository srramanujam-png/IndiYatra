-- ============================================================
-- editorial_publish.sql
-- publish_draft(p_draft_id) — called by supervisor to write
-- an approved draft to the live content tables.
--
-- Run AFTER editorial_workflow.sql.
-- Safe to re-run (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION publish_draft(p_draft_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft  content_drafts%ROWTYPE;
  v_data   jsonb;
  v_term   text;
  v_etype  text;
BEGIN
  -- ── Auth guard ─────────────────────────────────────────────
  IF NOT is_supervisor_or_admin() THEN
    RAISE EXCEPTION 'Access denied: supervisor or admin role required';
  END IF;

  -- ── Load draft ─────────────────────────────────────────────
  SELECT * INTO v_draft FROM content_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft % not found', p_draft_id;
  END IF;

  v_data := v_draft.draft_data;

  -- ── Apply content changes ──────────────────────────────────

  IF v_draft.content_type = 'snippet_translation' THEN
    -- Upsert the translation row (creates a new language row if one
    -- doesn't exist yet, or updates the existing one)
    INSERT INTO snippet_translations (
      snippet_id, language,
      hook, explanation,
      key_term, key_term_meaning,
      life_connection, quiz_recap,
      source_citation
    )
    VALUES (
      v_draft.content_id,
      v_draft.language_id,
      v_data->>'hook',
      v_data->>'explanation',
      v_data->>'key_term',
      v_data->>'key_term_meaning',
      v_data->>'life_connection',
      v_data->>'quiz_recap',
      v_data->>'source_citation'
    )
    ON CONFLICT (snippet_id, language) DO UPDATE SET
      hook              = EXCLUDED.hook,
      explanation       = EXCLUDED.explanation,
      key_term          = EXCLUDED.key_term,
      key_term_meaning  = EXCLUDED.key_term_meaning,
      life_connection   = EXCLUDED.life_connection,
      quiz_recap        = EXCLUDED.quiz_recap,
      source_citation   = EXCLUDED.source_citation;

    -- ── Publish quiz question if all five fields are present ───
    -- question, correct_option, and three wrong options must all be
    -- non-empty strings; if any are missing the block is skipped.
    IF (v_data->>'question')       IS NOT NULL AND (v_data->>'question')       <> '' AND
       (v_data->>'correct_option') IS NOT NULL AND (v_data->>'correct_option') <> '' AND
       (v_data->>'wrong_option_1') IS NOT NULL AND (v_data->>'wrong_option_1') <> '' AND
       (v_data->>'wrong_option_2') IS NOT NULL AND (v_data->>'wrong_option_2') <> '' AND
       (v_data->>'wrong_option_3') IS NOT NULL AND (v_data->>'wrong_option_3') <> ''
    THEN
      INSERT INTO snippet_questions (
        snippet_id, language,
        question,
        correct_option,
        wrong_option_1, wrong_option_2, wrong_option_3
      )
      VALUES (
        v_draft.content_id,
        v_draft.language_id,
        v_data->>'question',
        v_data->>'correct_option',
        v_data->>'wrong_option_1',
        v_data->>'wrong_option_2',
        v_data->>'wrong_option_3'
      )
      ON CONFLICT (snippet_id, language) DO UPDATE SET
        question       = EXCLUDED.question,
        correct_option = EXCLUDED.correct_option,
        wrong_option_1 = EXCLUDED.wrong_option_1,
        wrong_option_2 = EXCLUDED.wrong_option_2,
        wrong_option_3 = EXCLUDED.wrong_option_3;
    END IF;

    v_etype := 'snippet';

  ELSIF v_draft.content_type = 'lesson' THEN
    UPDATE lessons SET
      lesson_name        = COALESCE(NULLIF(v_data->>'lesson_name', ''),       lesson_name),
      lesson_description = COALESCE(NULLIF(v_data->>'lesson_description', ''), lesson_description)
    WHERE lesson_id = v_draft.content_id;

    v_etype := 'lesson';

  ELSE
    RAISE EXCEPTION 'Unknown content_type: %', v_draft.content_type;
  END IF;

  -- ── Apply taxonomy additions ───────────────────────────────
  -- draft_data.taxonomy_additions is an array of term_id strings
  -- e.g. ["TERM_001", "TERM_004"]
  IF jsonb_typeof(v_data->'taxonomy_additions') = 'array' THEN
    FOR v_term IN
      SELECT jsonb_array_elements_text(v_data->'taxonomy_additions')
    LOOP
      -- Only insert if the term exists; skip silently if already tagged
      IF EXISTS (SELECT 1 FROM taxonomy_terms WHERE term_id = v_term) THEN
        INSERT INTO content_taxonomy_mapping (term_id, entity_id, entity_type)
        VALUES (v_term, v_draft.content_id, v_etype)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- ── Mark draft published + log event ──────────────────────
  UPDATE content_drafts
  SET status = 'published', updated_at = now()
  WHERE id = p_draft_id;

  INSERT INTO content_workflow_events (draft_id, action, actor_id, comment)
  VALUES (p_draft_id, 'published', auth.uid(), 'Published to live content');

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION publish_draft(uuid) TO authenticated;


-- ============================================================
-- Add read policies so editors can load content for pre-filling
-- their edit forms (SELECT only — no writes).
-- ============================================================

-- Editors / verifiers / supervisors can read snippet_translations
-- (they already can via the anon key in practice, but this makes
--  it explicit for the supabaseClient authenticated path)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'snippet_translations'
      AND policyname = 'editorial_read_snippet_translations'
  ) THEN
    CREATE POLICY "editorial_read_snippet_translations"
    ON snippet_translations FOR SELECT
    USING (is_editorial_staff());
  END IF;
END $$;

-- Same for lessons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lessons'
      AND policyname = 'editorial_read_lessons'
  ) THEN
    CREATE POLICY "editorial_read_lessons"
    ON lessons FOR SELECT
    USING (is_editorial_staff());
  END IF;
END $$;
