# Migrations — and the migration-zero snapshot (Roadmap 2.10 / C4)

## Where things stand

Until now, schema changes lived as ~60 one-off scripts in `supabase/` (plus
`supabase/archive/` for historical one-offs). That ends with **migration zero**:
a single dump of the reconciled live schema, after which every schema change is
a new numbered file in THIS folder, and the top-level scripts become historical
records only.

## The one-time procedure (do these in order, ~20 minutes)

1. **Run the outstanding scripts** (Supabase SQL Editor, in this order — all
   idempotent):
   1. `phase1_comment_moderation.sql` (if not yet run)
   2. `phase2_events.sql` (if not yet run)
   3. `phase2_server_awarding.sql`  ← **deploy together with the 2.4 app build**
   4. `phase2_editorial_roles.sql`
   5. *Only if* the checker in step 2 flags a ✗: run the file it names.
      The likely candidates are the historical "possibly never run" stragglers
      (cover images, taxonomy seeds, sub_role RPCs, and one inline ALTER:
      `ALTER TABLE user_tokens DROP CONSTRAINT user_tokens_token_type_check;`).
      If every row is ✓, they were already applied — skip this and move on.
2. **Run `supabase/phase2_reconciliation_check.sql`** (read-only) → fix any ✗ →
   re-run until every row is ✓.
3. **Run `supabase/tests/rls_policy_tests.sql`** (rolls back everything it
   touches) → the report arrives as an **ERROR message — that's intentional**
   (the dashboard editor doesn't show NOTICEs, and the exception doubles as
   the rollback). Read the error text: every line must say PASS or SKIP.
4. **Take the snapshot.** With the Supabase CLI (recommended):
   ```
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db dump --schema public -f supabase/migrations/00000000000000_migration_zero.sql
   ```
   (No CLI? Dashboard → Database → Backups gives a full dump; save the schema
   portion under the same filename.)
5. **Commit** the snapshot file, then move the now-historical schema scripts
   from `supabase/*.sql` into `supabase/archive/` in the same commit
   (keep `phase2_reconciliation_check.sql` and `tests/` at top level).

## The rule from then on

- Every schema change = one new file here: `YYYYMMDDhhmm_short_name.sql`,
  idempotent where possible, applied via SQL Editor (or `supabase db push`),
  committed in the same PR as the app code that needs it.
- Never edit migration zero or an already-applied migration.
- After applying any migration, re-run `supabase/tests/rls_policy_tests.sql`.

## Existing numbered migrations

`20240001_lesson_views.sql` and `20240002_get_recommendations_rpc.sql` predate
this convention; verify they're applied (the reconciliation checker's events/
recommendations rows cover them indirectly) and leave them in place.
