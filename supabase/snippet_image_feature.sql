-- ============================================================
-- snippet_image_feature.sql
--
-- 1. Creates Supabase Storage bucket "snippet-images" (public read).
-- 2. Adds storage RLS policies (public read, editorial upload).
-- 3. Updates publish_draft() to handle image data in draft_data:
--    - If draft_data has image_file_path and draft is LANG_01,
--      upserts into asset_library and sets snippet_core.asset_id.
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- ============================================================


-- ── 1. Storage bucket ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'snippet-images',
  'snippet-images',
  true,
  5242880,   -- 5 MB max per file
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];


-- ── 2. Storage policies ──────────────────────────────────────────────────────

-- Public: anyone can view images
DROP POLICY IF EXISTS "snippet_images_public_read" ON storage.objects;
CREATE POLICY "snippet_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'snippet-images');

-- Editorial staff can upload
DROP POLICY IF EXISTS "snippet_images_editorial_insert" ON storage.objects;
CREATE POLICY "snippet_images_editorial_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'snippet-images'
    AND is_editorial_staff()
  );

-- Editorial staff can replace (upsert uses UPDATE)
DROP POLICY IF EXISTS "snippet_images_editorial_update" ON storage.objects;
CREATE POLICY "snippet_images_editorial_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'snippet-images'
    AND is_editorial_staff()
  );


-- ── 3. Update publish_draft() to handle image ────────────────────────────────
CREATE OR REPLACE FUNCTION publish_draft(p_draft_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft       content_drafts%ROWTYPE;
  v_data        jsonb;
  v_term        text;
  v_etype       text;
  v_asset_id    text;
  v_new_asset_id text;
  v_max_num     int;
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

  -- ── Apply content changes ───────────────────────────────────

  IF v_draft.content_type = 'snippet_translation' THEN
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

    v_etype := 'snippet';

    -- ── Image: English-only ─────────────────────────────────
    -- Only process image when language is LANG_01 and draft_data has an image URL
    IF v_draft.language_id = 'LANG_01'
       AND (v_data->>'image_file_path') IS NOT NULL
       AND (v_data->>'image_file_path') <> ''
    THEN
      -- Check if this snippet already has an asset_id
      SELECT asset_id INTO v_asset_id
      FROM snippet_core WHERE snippet_id = v_draft.content_id;

      IF v_asset_id IS NOT NULL THEN
        -- Update existing asset row in place
        UPDATE asset_library SET
          file_path   = v_data->>'image_file_path',
          alt_text    = COALESCE(NULLIF(v_data->>'image_alt_text', ''), alt_text),
          attribution = COALESCE(NULLIF(v_data->>'image_attribution', ''), attribution)
        WHERE asset_id = v_asset_id;
      ELSE
        -- Generate next ASSET_XXXXX id
        SELECT COALESCE(MAX(CAST(SUBSTRING(asset_id FROM 7) AS int)), 0)
        INTO v_max_num
        FROM asset_library
        WHERE asset_id ~ '^ASSET_[0-9]+$';

        v_new_asset_id := 'ASSET_' || LPAD(CAST(v_max_num + 1 AS text), 5, '0');

        INSERT INTO asset_library (asset_id, file_path, asset_type, alt_text, attribution)
        VALUES (
          v_new_asset_id,
          v_data->>'image_file_path',
          'IMAGE',
          COALESCE(v_data->>'image_alt_text', ''),
          COALESCE(v_data->>'image_attribution', '')
        );

        UPDATE snippet_core SET asset_id = v_new_asset_id
        WHERE snippet_id = v_draft.content_id;
      END IF;
    END IF;

  ELSIF v_draft.content_type = 'lesson' THEN
    UPDATE lessons SET
      lesson_name        = COALESCE(NULLIF(v_data->>'lesson_name', ''),        lesson_name),
      lesson_description = COALESCE(NULLIF(v_data->>'lesson_description', ''), lesson_description)
    WHERE lesson_id = v_draft.content_id;

    v_etype := 'lesson';

  ELSE
    RAISE EXCEPTION 'Unknown content_type: %', v_draft.content_type;
  END IF;

  -- ── Apply taxonomy additions ────────────────────────────────
  IF jsonb_typeof(v_data->'taxonomy_additions') = 'array' THEN
    FOR v_term IN
      SELECT jsonb_array_elements_text(v_data->'taxonomy_additions')
    LOOP
      IF EXISTS (SELECT 1 FROM taxonomy_terms WHERE term_id = v_term) THEN
        INSERT INTO content_taxonomy_mapping (term_id, entity_id, entity_type)
        VALUES (v_term, v_draft.content_id, v_etype)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- ── Mark published ──────────────────────────────────────────
  UPDATE content_drafts
  SET status = 'published', updated_at = now()
  WHERE id = p_draft_id;

  INSERT INTO content_workflow_events (draft_id, action, actor_id, comment)
  VALUES (p_draft_id, 'published', auth.uid(), 'Published to live content');

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION publish_draft(uuid) TO authenticated;
