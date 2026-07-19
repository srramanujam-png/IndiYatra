# supabase/archive

Completed one-time scripts (diagnostics, cleanups, backfills) moved here in the
roadmap 2.2 cleanup. They have already been run against the live DB and exist
only as history. The remaining scripts in `supabase/` are the de-facto schema
record — they stay until roadmap 2.10 takes the migration-zero snapshot
(`supabase db dump`), after which they too move here and all future changes go
through timestamped files in `supabase/migrations/`.
