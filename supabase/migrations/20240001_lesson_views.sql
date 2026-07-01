-- ── lesson_views ──────────────────────────────────────────────────────────────
-- Tracks every time a user opens a lesson, and how long they actively read it.
-- "Active" = tab visible + not idle. Written by useViewTracking hook in SnippetPlayer.
--
-- One row per (profile_id, lesson_id). Subsequent opens upsert via onConflict.

create table if not exists public.lesson_views (
  id              bigserial primary key,
  profile_id      uuid        not null references auth.users(id) on delete cascade,
  lesson_id       uuid        not null,               -- matches lesson_progress.lesson_id
  viewed_at       timestamptz not null default now(), -- first open
  last_seen_at    timestamptz not null default now(), -- most recent open
  active_seconds  integer     not null default 0,     -- cumulative active reading time
  view_count      integer     not null default 1,     -- how many times opened

  constraint lesson_views_profile_lesson_unique unique (profile_id, lesson_id)
);

-- Index for the recommendation RPC (queries by profile_id)
create index if not exists lesson_views_profile_idx on public.lesson_views (profile_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.lesson_views enable row level security;

-- Users can only read/write their own rows
create policy "lesson_views: own rows only"
  on public.lesson_views
  for all
  using  (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
