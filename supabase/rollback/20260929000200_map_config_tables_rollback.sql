-- ROLLBACK of 20260929000200_map_config_tables.sql (drops all map configuration; learner data is untouched)
DROP FUNCTION IF EXISTS public.get_map_config();
DROP TABLE IF EXISTS public.map_milestone_temples, public.map_milestone_features, public.map_plant_rules,
  public.map_milestones, public.map_temples, public.map_features, public.map_config_meta CASCADE;
DROP FUNCTION IF EXISTS public.fn_map_config_touch();
