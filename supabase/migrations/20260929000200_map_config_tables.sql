-- ─────────────────────────────────────────────────────────────────────────────
-- Map release · 2/3 · versioned map configuration (admin-editable, publicly readable)
--
-- Content only — NO learner data lives here. Everything is world-readable (it is what the
-- public dashboard map displays) and writable only by public.is_admin().
-- Learner progress stays in user_tokens / user_badges (no second ledger).
--
-- config_revision (map_config_meta) is bumped by a trigger on every write. The pre-rendered
-- plates record the revision they were built from; Admin > Map compares the two and shows a
-- "regenerate plates" reminder when they differ.
-- Rollback: supabase/rollback/20260929000200_map_config_tables_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.map_features (
  feature_id      text PRIMARY KEY,
  feature_type    text NOT NULL CHECK (feature_type IN ('river','mountain')),
  display_name    text NOT NULL,
  hover_label     text,
  tap_text        text,
  style_key       text NOT NULL DEFAULT 'river' CHECK (style_key IN ('river','snow','grassy','dry','mixed')),
  sort_order      int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.map_temples (
  temple_id       text PRIMARY KEY,
  site_name       text,
  latitude        numeric(9,6),
  longitude       numeric(9,6),
  hover_label     text,
  tap_text        text,
  enabled         boolean NOT NULL DEFAULT false,
  -- both coordinates or neither; a placed temple needs a name and in-range coordinates
  CONSTRAINT temple_coords_pair  CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CONSTRAINT temple_coords_range CHECK (latitude IS NULL OR (latitude BETWEEN 5 AND 38 AND longitude BETWEEN 60 AND 100)),
  CONSTRAINT temple_enabled_ready CHECK (NOT enabled OR (site_name IS NOT NULL AND latitude IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.map_milestones (
  milestone_index   smallint PRIMARY KEY CHECK (milestone_index BETWEEN 1 AND 20),
  threshold_percent smallint NOT NULL UNIQUE,
  title             text NOT NULL,
  note              text,
  CONSTRAINT milestone_threshold_fixed CHECK (threshold_percent = milestone_index * 5)
);

-- A river/range/temple unlocks at exactly one milestone (UNIQUE), a milestone may unlock several.
CREATE TABLE IF NOT EXISTS public.map_milestone_features (
  milestone_index smallint NOT NULL REFERENCES public.map_milestones(milestone_index) ON DELETE CASCADE,
  feature_id      text     NOT NULL UNIQUE REFERENCES public.map_features(feature_id) ON DELETE CASCADE,
  PRIMARY KEY (milestone_index, feature_id)
);
CREATE TABLE IF NOT EXISTS public.map_milestone_temples (
  milestone_index smallint NOT NULL REFERENCES public.map_milestones(milestone_index) ON DELETE CASCADE,
  temple_id       text     NOT NULL UNIQUE REFERENCES public.map_temples(temple_id) ON DELETE CASCADE,
  PRIMARY KEY (milestone_index, temple_id)
);

CREATE TABLE IF NOT EXISTS public.map_plant_rules (
  event_type      text PRIMARY KEY CHECK (event_type IN ('lesson','module','theme','level','course')),
  token_type      text NOT NULL,             -- matches user_tokens.token_type
  species         text NOT NULL,
  asset_key       text NOT NULL,
  display_order   smallint NOT NULL,
  scale           numeric(4,2) NOT NULL CHECK (scale > 0),
  placement_zone  text
);

CREATE TABLE IF NOT EXISTS public.map_config_meta (
  id          boolean PRIMARY KEY DEFAULT true CHECK (id),
  revision    int  NOT NULL DEFAULT 1,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid
);
INSERT INTO public.map_config_meta (id) VALUES (true) ON CONFLICT DO NOTHING;

-- bump the revision on ANY config change (statement-level: one bump per statement)
CREATE OR REPLACE FUNCTION public.fn_map_config_touch() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE map_config_meta SET revision = revision + 1, updated_at = now(), updated_by = auth.uid() WHERE id;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.fn_map_config_touch() FROM PUBLIC, anon, authenticated;

DO $t$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['map_features','map_temples','map_milestones','map_milestone_features','map_milestone_temples','map_plant_rules'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_touch ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_touch AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.fn_map_config_touch()', t, t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || '_public_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_write', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t || '_admin_write', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);   -- RLS (is_admin) gates these
  END LOOP;
END $t$;

ALTER TABLE public.map_config_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS map_config_meta_public_read ON public.map_config_meta;
CREATE POLICY map_config_meta_public_read ON public.map_config_meta FOR SELECT USING (true);
REVOKE ALL ON public.map_config_meta FROM anon, authenticated;
GRANT SELECT ON public.map_config_meta TO anon, authenticated;     -- writes only via the SECURITY DEFINER trigger

-- Published configuration as one JSON document (used by the plate script and Admin > Map).
CREATE OR REPLACE FUNCTION public.get_map_config() RETURNS jsonb
  LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'version', 'rev-' || (SELECT revision FROM map_config_meta),
    'revision', (SELECT revision FROM map_config_meta),
    'features', COALESCE((SELECT jsonb_object_agg(feature_id, jsonb_build_object(
        'type', feature_type, 'name', display_name, 'hover', hover_label, 'tap', tap_text, 'style', style_key))
        FROM map_features), '{}'::jsonb),
    'temples', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', temple_id, 'name', site_name,
        'lat', latitude, 'lon', longitude, 'hover', hover_label, 'tap', tap_text, 'enabled', enabled) ORDER BY temple_id)
        FROM map_temples), '[]'::jsonb),
    'milestones', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'index', m.milestone_index, 'threshold', m.threshold_percent, 'title', m.title, 'note', m.note,
        'riverIds',    COALESCE((SELECT jsonb_agg(f.feature_id ORDER BY f.feature_id) FROM map_milestone_features mf JOIN map_features f USING (feature_id) WHERE mf.milestone_index = m.milestone_index AND f.feature_type = 'river'), '[]'::jsonb),
        'mountainIds', COALESCE((SELECT jsonb_agg(f.feature_id ORDER BY f.feature_id) FROM map_milestone_features mf JOIN map_features f USING (feature_id) WHERE mf.milestone_index = m.milestone_index AND f.feature_type = 'mountain'), '[]'::jsonb),
        'templeIds',   COALESCE((SELECT jsonb_agg(t.temple_id ORDER BY t.temple_id) FROM map_milestone_temples mt JOIN map_temples t USING (temple_id) WHERE mt.milestone_index = m.milestone_index), '[]'::jsonb)
      ) ORDER BY m.milestone_index) FROM map_milestones m), '[]'::jsonb),
    'plantRules', COALESCE((SELECT jsonb_agg(jsonb_build_object('event', event_type, 'tokenType', token_type, 'species', species,
        'assetKey', asset_key, 'order', display_order, 'scale', scale, 'zone', placement_zone) ORDER BY display_order)
        FROM map_plant_rules), '[]'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_map_config() TO anon, authenticated;
