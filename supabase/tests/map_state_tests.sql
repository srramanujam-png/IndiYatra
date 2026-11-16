-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · MAP STATE TESTS (map release) — same convention as rls_policy_tests.sql
-- HOW TO RUN: paste the whole file into Supabase SQL Editor → Run. The report arrives as an
-- "ERROR" on purpose (it doubles as the rollback). Every line must start with PASS or SKIP.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  rep text := E'\n══ MAP STATE TEST REPORT (all changes rolled back) ══\n';
  n int; v_learner uuid; v_other uuid; st jsonb; j jsonb; t text;
BEGIN
  -- ═══ A · structure & grants ═══
  rep := rep || CASE WHEN has_function_privilege('anon', 'public.get_map_state(uuid)', 'EXECUTE')
    THEN E'FAIL A1: anon can execute get_map_state\n' ELSE E'PASS A1: get_map_state not executable by anon\n' END;
  rep := rep || CASE WHEN has_function_privilege('authenticated', 'public.get_map_state(uuid)', 'EXECUTE')
    THEN E'PASS A2: signed-in users can execute get_map_state\n' ELSE E'FAIL A2: authenticated cannot execute get_map_state\n' END;
  SELECT count(*) INTO n FROM pg_proc p WHERE p.proname = 'get_map_state' AND p.prosecdef;
  rep := rep || CASE WHEN n = 0 THEN E'PASS A3: get_map_state is SECURITY INVOKER (caller RLS applies)\n' ELSE E'FAIL A3: get_map_state is SECURITY DEFINER\n' END;
  SELECT count(*) INTO n FROM pg_proc p, unnest(p.proargnames) a WHERE p.proname = 'get_map_state' AND a ILIKE '%user%' OR (p.proname='get_map_state' AND a ILIKE '%profile%');
  rep := rep || CASE WHEN n = 0 THEN E'PASS A4: no user-id parameter — cannot ask for another learner\n' ELSE E'FAIL A4: get_map_state accepts a user/profile parameter\n' END;
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relname LIKE 'map\_%' ESCAPE '\' AND c.relkind = 'r' AND NOT c.relrowsecurity;
  rep := rep || CASE WHEN n = 0 THEN E'PASS A5: RLS enabled on every map_* table\n' ELSE 'FAIL A5: ' || n || E' map_* table(s) without RLS\n' END;
  SELECT count(*) INTO n FROM pg_policies WHERE tablename LIKE 'map\_%' ESCAPE '\' AND cmd IN ('INSERT','UPDATE','DELETE') AND policyname NOT LIKE '%admin%';
  rep := rep || CASE WHEN n = 0 THEN E'PASS A6: map_* writes are admin-only policies\n' ELSE 'FAIL A6: ' || n || E' non-admin write policy(ies) on map_*\n' END;
  SELECT count(*) INTO n FROM map_milestones;
  rep := rep || CASE WHEN n = 20 THEN E'PASS A7: exactly 20 milestones configured\n' ELSE 'FAIL A7: ' || n || E' milestones (need 20)\n' END;
  SELECT count(*) INTO n FROM map_milestones WHERE threshold_percent <> milestone_index * 5;
  rep := rep || CASE WHEN n = 0 THEN E'PASS A8: thresholds are exactly 5% steps\n' ELSE E'FAIL A8: threshold drift\n' END;
  SELECT count(*) INTO n FROM map_plant_rules WHERE token_type NOT IN (SELECT token_type FROM tokens);
  rep := rep || CASE WHEN n = 0 THEN E'PASS A9: every plant rule points at a real token type\n' ELSE 'FAIL A9: ' || n || E' plant rule(s) reference unknown token types\n' END;
  SELECT count(*) INTO n FROM tokens WHERE token_type = 'peepal';
  rep := rep || CASE WHEN n = 0 THEN E'PASS A10: peepal retired from the catalogue\n' ELSE E'FAIL A10: peepal still in catalogue\n' END;

  -- ═══ B · behaviour as a simulated learner ═══
  SELECT p.id INTO v_learner FROM profiles p
   WHERE NOT EXISTS (SELECT 1 FROM user_roles_mapping urm JOIN roles r ON r.role_id = urm.role_id
                     WHERE urm.profile_id = p.id AND LOWER(r.role_name) IN ('admin','editor','verifier','supervisor','creator'))
   ORDER BY p.created_at LIMIT 1;
  IF v_learner IS NULL THEN
    rep := rep || E'SKIP B*: no learner profile in DB\n';
  ELSE
    SELECT id INTO v_other FROM profiles WHERE id <> v_learner ORDER BY created_at LIMIT 1;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_learner, 'role', 'authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);

    st := public.get_map_state();
    rep := rep || CASE WHEN st ? 'milestoneIndex' AND st ? 'plantCounts' AND st ? 'badges'
      THEN E'PASS B1: learner gets a compact state document\n' ELSE E'FAIL B1: state document malformed\n' END;
    rep := rep || CASE WHEN st->>'status' = 'no_content' OR (st->>'milestoneIndex')::int = LEAST(20, floor((st->>'progressPercent')::numeric / 5)::int)
      THEN E'PASS B2: milestoneIndex == floor(progress/5) (capped at 20)\n' ELSE E'FAIL B2: milestoneIndex inconsistent with progress\n' END;
    rep := rep || CASE WHEN st->>'status' = 'no_content' OR (st->>'progressPercent')::numeric BETWEEN 0 AND 100
      THEN E'PASS B3: progress within [0,100] (or explicit no_content)\n' ELSE E'FAIL B3: progress out of range\n' END;
    SELECT count(*) INTO n FROM jsonb_array_elements(st->'crossedMilestones');
    rep := rep || CASE WHEN n = (st->>'milestoneIndex')::int THEN E'PASS B4: crossed thresholds == milestoneIndex (multi-threshold jumps reveal all)\n' ELSE E'FAIL B4: crossed list length mismatch\n' END;
    SELECT count(*) INTO n FROM jsonb_each(st->'plantCounts') e WHERE (e.value)::text::int > (SELECT count(*) FROM user_tokens ut WHERE ut.profile_id = v_learner AND ut.token_type = e.key);
    rep := rep || CASE WHEN n = 0 THEN E'PASS B5: plant counts never exceed the learner''s own token rows (no duplicates)\n' ELSE E'FAIL B5: plant counts exceed token rows\n' END;
    IF jsonb_array_length(st->'badges') > 12 THEN rep := rep || E'FAIL B6: more than 12 badges returned\n'; ELSE rep := rep || E'PASS B6: badge ring capped at 12\n'; END IF;

    -- B7: learner cannot alter map configuration
    BEGIN
      UPDATE map_features SET display_name = 'hacked' WHERE true; GET DIAGNOSTICS n = ROW_COUNT;
      rep := rep || CASE WHEN n = 0 THEN E'PASS B7: learner UPDATE of map_features affects 0 rows\n' ELSE 'FAIL B7: learner changed ' || n || E' map_features rows\n' END;
    EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS B7: map_features UPDATE blocked (' || SQLERRM || E')\n'; END;
    BEGIN
      INSERT INTO map_milestone_features (milestone_index, feature_id) VALUES (1, 'river-01');
      rep := rep || E'FAIL B8: learner inserted a milestone assignment\n';
    EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS B8: milestone INSERT blocked (' || SQLERRM || E')\n'; END;
    -- B9: config is publicly readable (it is public content)
    SELECT count(*) INTO n FROM map_features;
    rep := rep || CASE WHEN n > 0 THEN E'PASS B9: map configuration readable by learners\n' ELSE E'FAIL B9: map_features unreadable\n' END;

    -- B10: a second learner's data does not leak into the first learner's state
    IF v_other IS NOT NULL THEN
      SELECT count(*) INTO n FROM user_tokens WHERE profile_id = v_other;
      rep := rep || CASE WHEN n = 0 THEN E'PASS B10: other learner''s tokens invisible to this session\n' ELSE E'FAIL B10: other learner''s tokens visible\n' END;
    END IF;

    -- B11: anonymous (no uid) is rejected
    PERFORM set_config('request.jwt.claims', '{}', true);
    BEGIN
      j := public.get_map_state();
      rep := rep || E'FAIL B11: get_map_state answered without a signed-in user\n';
    EXCEPTION WHEN OTHERS THEN rep := rep || 'PASS B11: no uid → rejected (' || SQLERRM || E')\n'; END;
  END IF;

  RAISE EXCEPTION '%', rep || E'══ END OF REPORT — the ERROR wrapper is intentional (it rolls everything back) ══';
END $$;
