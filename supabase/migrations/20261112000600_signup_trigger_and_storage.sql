-- ─────────────────────────────────────────────────────────────────────────────
-- IndiYatra · Audit fix M7 (12 Nov 2026): things the database needs that were not in migrations/
--
-- Migration zero is a dump of the "public" schema only. Two pieces that live in other
-- schemas were therefore missing, so a database rebuilt from this folder would not work:
--   1. the trigger on auth.users that creates a profile (and learner role) at sign-up
--   2. the two public image buckets and their storage policies
--
-- ON YOUR LIVE PROJECT THIS FILE SHOULD CHANGE NOTHING: every step first checks whether
-- the object already exists. It is here so the repo describes the whole database.
-- Sources: handle_new_user() in migration zero; supabase/archive/snippet_image_feature.sql
-- and supabase/archive/module_cover_image.sql. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Sign-up trigger (created only if NO trigger on auth.users already calls handle_new_user) ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'auth.users'::regclass
      AND NOT t.tgisinternal
      AND t.tgfoid = 'public.handle_new_user()'::regprocedure
  ) THEN
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    RAISE NOTICE 'created trigger on_auth_user_created on auth.users';
  ELSE
    RAISE NOTICE 'sign-up trigger already present - nothing to do';
  END IF;
END $$;

-- ── 2. Image buckets (created only if missing; existing settings are left alone) ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('snippet-images', 'snippet-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
       ('content-images', 'content-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ── 3. Storage policies (each created only if a policy of that name is missing) ──
DO $$
DECLARE
  b text;
  pfx text;
BEGIN
  FOREACH b IN ARRAY ARRAY['snippet-images', 'content-images'] LOOP
    pfx := replace(b, '-', '_');
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = pfx || '_public_read') THEN
      EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT USING (bucket_id = %L)', pfx || '_public_read', b);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = pfx || '_editorial_insert') THEN
      EXECUTE format('CREATE POLICY %I ON storage.objects FOR INSERT WITH CHECK (bucket_id = %L AND public.is_editorial_staff())', pfx || '_editorial_insert', b);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = pfx || '_editorial_update') THEN
      EXECUTE format('CREATE POLICY %I ON storage.objects FOR UPDATE USING (bucket_id = %L AND public.is_editorial_staff())', pfx || '_editorial_update', b);
    END IF;
  END LOOP;
END $$;
