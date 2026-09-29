-- ─────────────────────────────────────────────────────────────────────────────
-- Map release · 4 · atomic save of the milestone assignments (Admin > Map)
--
-- One call replaces titles + every river/range/temple assignment in a single transaction
-- (a plpgsql function body is atomic), so a failed save can never leave milestones half-empty.
-- SECURITY INVOKER: the caller's own RLS applies, i.e. only public.is_admin() can write.
-- Payload: [{"index":1,"title":"…","note":"…","featureIds":["river-01","mountain-02"],"templeIds":["temple-03"]}, … ×20]
-- Rollback: supabase/rollback/20260929000400_map_admin_rpc_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_save_map_milestones(p_milestones jsonb) RETURNS jsonb
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE
  m jsonb; v_idx int; v_dupe text; v_missing text;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(p_milestones) <> 'array' OR jsonb_array_length(p_milestones) <> 20 THEN
    RAISE EXCEPTION 'Exactly 20 milestones are required (got %)', COALESCE(jsonb_array_length(p_milestones), 0);
  END IF;

  -- a feature/temple can unlock at only one milestone
  SELECT x INTO v_dupe FROM (
    SELECT jsonb_array_elements_text(e->'featureIds') x FROM jsonb_array_elements(p_milestones) e
    UNION ALL SELECT jsonb_array_elements_text(e->'templeIds') FROM jsonb_array_elements(p_milestones) e) u
  GROUP BY x HAVING count(*) > 1 LIMIT 1;
  IF v_dupe IS NOT NULL THEN RAISE EXCEPTION '"%" is assigned to more than one milestone', v_dupe; END IF;

  -- every referenced id must exist
  SELECT x INTO v_missing FROM (SELECT jsonb_array_elements_text(e->'featureIds') x FROM jsonb_array_elements(p_milestones) e) u
   WHERE x NOT IN (SELECT feature_id FROM map_features) LIMIT 1;
  IF v_missing IS NOT NULL THEN RAISE EXCEPTION 'Unknown river/range "%"', v_missing; END IF;
  SELECT x INTO v_missing FROM (SELECT jsonb_array_elements_text(e->'templeIds') x FROM jsonb_array_elements(p_milestones) e) u
   WHERE x NOT IN (SELECT temple_id FROM map_temples) LIMIT 1;
  IF v_missing IS NOT NULL THEN RAISE EXCEPTION 'Unknown temple "%"', v_missing; END IF;

  -- every milestone must unlock something
  FOR m IN SELECT * FROM jsonb_array_elements(p_milestones) LOOP
    IF jsonb_array_length(m->'featureIds') + jsonb_array_length(m->'templeIds') = 0 THEN
      RAISE EXCEPTION 'Milestone % has nothing to unlock — add at least one river, range or temple', m->>'index';
    END IF;
  END LOOP;

  DELETE FROM map_milestone_features WHERE true;
  DELETE FROM map_milestone_temples  WHERE true;
  FOR m IN SELECT * FROM jsonb_array_elements(p_milestones) LOOP
    v_idx := (m->>'index')::int;
    UPDATE map_milestones SET title = COALESCE(NULLIF(trim(m->>'title'), ''), 'Milestone ' || v_idx), note = m->>'note' WHERE milestone_index = v_idx;
    INSERT INTO map_milestone_features (milestone_index, feature_id) SELECT v_idx, jsonb_array_elements_text(m->'featureIds');
    INSERT INTO map_milestone_temples  (milestone_index, temple_id)  SELECT v_idx, jsonb_array_elements_text(m->'templeIds');
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'revision', (SELECT revision FROM map_config_meta));
END $$;
REVOKE ALL ON FUNCTION public.admin_save_map_milestones(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_map_milestones(jsonb) TO authenticated;
